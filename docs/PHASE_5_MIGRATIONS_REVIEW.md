# Fáze 5 — Data model a migrace (revize bezpečných základů)

**Datum:** 15. 10. 2026
**Cíl fáze:** odstranit technické riziko skryté za tím, že „všechno funguje“.
**Způsob ověření:** lokální Docker databáze (`supabase start` → `supabase db reset`), pgTAP testy, `EXPLAIN ANALYZE` na syntetickém objemu dat a porovnání migrací na disku s databází.

Tento dokument je záznam o tom, co se ověřilo, co se naměřilo a co zůstává otevřené. Slouží jako podklad pro rozhodnutí PM, ne jako návod k obsluze.

---

## Shrnutí

| Krok | Co se ověřovalo | Výsledek |
| --- | --- | --- |
| 5.2 | Duplicitní verze migrací | ✅ hotovo — kontrola je součástí `verify:migrations` |
| 5.3 | Čistý běh celého řetězce na čisté DB | ✅ 131 migrací + seed projde bez chyby |
| 5.4 | Výkon dotazů z Fáze 3 na objemu dat | ✅ oba dotazy do ~90 ms na 200–300 tis. řádcích |
| 5.5 | „Migration parity“ (disk vs. databáze) | ✅ lokálně 131 = 131; skript `verify:parity` |
| 5.1 | Databázové pgTAP testy a CI gate | ✅ opraveno — `Files=12, Tests=216, PASS` + nový CI job |
| 5.1b | Vlastnictví záznamů (riziko z 5.1) | ✅ vyřešeno — kaskáda + viditelné počítadlo |
| — | Departments vs. týmy | ⏸️ odloženo do samostatné fáze |

---

## 1. Kontrola duplicitních verzí (5.2)

**Proč:** Supabase si u aplikované migrace pamatuje jen její **verzi** (prefix názvu souboru před prvním podtržítkem). Když mají dva soubory stejnou verzi, druhá migrace se tiše neaplikuje — schéma v repozitáři a v databázi se rozejdou a nikdo si toho nevšimne. Přesně taková kolize v projektu už jednou vznikla.

**Jak je to udělané:**

- `scripts/migrations-lib.mjs` má funkce `migrationVersionOf` a `findDuplicateVersions`.
- `scripts/verify-all-migrations.mjs` duplicity načte a hlásí jako chybu (exit 1).
- Test `tests/migrations-duplicate-versions.test.ts` hlídá, že se kontrola nerozbije.

**Ověřeno:** `npm run verify:migrations` hlásí `Duplicate migration versions: 0`. Při nasimulované duplicitě skončí s exit 1 a jasnou hláškou.

---

## 2. Čistý běh migračního řetězce (5.3)

**Proč:** Některé migrace se ve vývojovém prostředí nikdy nespouštěly. „Soubor existuje“ ještě neznamená „migrace projde na prázdné databázi“.

**Ověřeno:** `npx supabase db reset` na lokálním Docker Supabase projde celý řetězec **od nuly**: aplikuje **131 migrací** a poté spustí seed. Exit 0. Zahrnuty jsou i obě migrace z Fáze 3, které se dřív neověřovaly:

- `20261014120000_team_leader_exception_pickup_risk.sql`
- `20261014130000_orders_pickup_risk_index.sql`

### Co čistý běh odhalil (chyby seedu)

Seed se na čisté databázi nikdy nespustil, takže obsahoval tři chyby. Všechny jsou opravené v generátoru `scripts/seed-catalog.mjs` (ne v migracích — migrace se needitují, Supabase u nich eviduje jen verzi, ne obsah):

1. **Kolize workspaces.** První migrace zakládají „hlavní“ workspace s vygenerovaným id. Seed si nárokuje vlastní workspace se stejným slugem `main`, což narazilo na unikátní klíč (organizace, slug). Mazat se nedá — děti workspace mají audit triggery, které zapisují s už smazaným `workspace_id`. Řešení: seed placeholderu **uvolní slug** (`legacy-main`) a kanonický `main` si vezme on.
2. **Chybějící uživatel.** Profil má cizí klíč na `auth.users`, a skript metadat (`updated_by`, `created_by`) na profil. Na čisté databázi žádný uživatel není. Řešení: seed zakládá i **demo admina** v `auth.users` (jen na lokální databázi).
3. **Neexistující datový typ.** Seed přetypovával kategorii produktu na `public.product_category`, což je enum, který v žádné migraci nikdy nebyl. Sloupec je dnes prostý text. Řešení: přetypování zrušeno.

Regresní test `tests/catalog-seed-template.test.ts` teď hlídá všechny tři věci.

**Výsledek seedu na čisté DB:** 3 katalogové produkty (+ 3 starší demo), 3 skripty se 3 verzemi, 7 námitek, 1 workspace `main` s administrátorem.

---

## 3. Výkon dotazů z Fáze 3 na objemu dat (5.4)

**Proč:** Indexy z Fáze 3 existují, ale nikdy se neměřily na reálném objemu. Na malé tabulce je každý dotaz rychlý, i když je špatně.

**Jak měřit:** `scripts/measure-exception-queue-performance.sql` je opakovatelná sonda. Vytvoří izolovaný workspace s **200 000 leady**, **300 000 objednávkami** a **200 000 položkami fronty**, respektuje všechny check constraints a spustí `EXPLAIN ANALYZE`. Nemíchá se s demo seedem a dá se pustit znovu.

```
docker cp scripts/measure-exception-queue-performance.sql supabase_db_countdown-crm:/tmp/perf.sql
docker exec supabase_db_countdown-crm psql -U postgres -d postgres -f /tmp/perf.sql
```

### Naměřeno

| Dotaz | Plán | Výsledek | Čas |
| --- | --- | --- | --- |
| Rizikové zásilky na výdejně (pickup risk) | Index scan `orders_workspace_status_package_arrived_idx` | 207 řádků, bez dořazování | **38,7 ms** |
| Rizikové zásilky (index vypnutý, srovnání) | Paralelní sekvenční scan + hash join | 207 řádků | 34,2 ms |
| Exception Queue (fronta) | Paralelní sekvenční scan + třídění na disk (3,4 MB) | 100 250 řádků | **88,7 ms** |

### Závěr

- **Riziko výkonu nehrozí.** Oba dotazy se vejdou hluboko pod 100 ms i při objemu, který provoz call centra nedosáhne.
- **Pickup risk používá svůj index** a díky tomu výsledek nevytřiďuje zvlášť. Že je „vypnutá“ varianta v hrubém čase o pár milisekund rychlejší, není chyba: sekvenční scan běží paralelně a celá tabulka je v cache. Rozhodující je, že plánovač index volí a cena plánu je řádově nižší.
- **Fronta (Exception Queue) index nemá a nepotřebuje** — dotaz vrací zhruba polovinu položek, u takového podílu je sekvenční scan správná volba. Třídění se při velkém objemu opírá o disk; pokud by se fronta v budoucnu zvětšila, je místo pro index `(workspace_id, state, updated_at)`.

---

## 4. Migration parity (5.5)

**Proč:** Než se pustí další větší rozvoj schématu, musí být jasné, že soubory v repozitáři a databáze se nerozešly. Drift v obou směrech znehodnotí každé další měření.

**Jak funguje:** `npm run verify:parity` porovná verze migrací na disku s verzemi, které databáze eviduje jako aplikované. Rozdíl v obou směrech = exit 1.

- `node scripts/verify-migration-parity.mjs` — lokální Docker databáze.
- `node scripts/verify-migration-parity.mjs --linked` — připojený (vzdálený) projekt.

**Ověřeno lokálně:** 131 souborů na disku = 131 aplikovaných verzí, `MIGRATION PARITY OK`. Při nasimulovaném driftu (dočasný soubor navíc) skript správně hlásí `MISSING IN DATABASE` a končí s exit 1.

**Vzdálená parita je zatím nedostupná** a zůstává jako ruční runbook: Management API se nedokáže přihlásit do databáze projektu (chyba na straně platformy, ne tokenu), takže `--linked` se teď nedá spolehlivě použít. Postup pro ověření vzdáleného projektu je v `docs/P0_3_REMOTE_DB_RUNNER.md`.

---

## Nález z Fáze 5 a jeho oprava (Fáze 5.1): databázové pgTAP testy

Při čistém běhu se ukázalo, že **`npx supabase test db` neprojde** — 4 z 11 testovacích souborů hlásí chyby. Nebyl to důsledek ověřování migrací: stejné chyby se objevily i na databázi bez seedu.

**Proč to nikdo nezachytil:** CI (`.github/workflows/ci.yml`) spouštěl jen lint, typecheck, vitest a build. Databázové pgTAP testy v něm nebyly, takže tiše „hnily“.

**Příčina:** testy pocházely z doby před týmovým modelem (migrace ze série `20260914*`). RLS dnes pustí vedoucího týmu k hovoru nebo k frontě jen přes **týmové přiřazení**, ale fixtures zakládaly jen členství ve workspace a data bez týmu. Produkční logika byla v pořádku — rozbité byly testovací fixtures.

**Oprava (Fáze 5.1):**

- Fixtures ve čtyřech souborech teď zakládají **aktivní tým** a členství (vedoucí = `leader`, operátor = `member`) a přiřazují `team_id` hovorům, položkám fronty i objednávkám.
- Jeden zastaralý strukturální test se ptal na politiku podle jména `is_workspace_manager_or_admin`; politika je dnes postavená na `can_access_call_review` (týmový scope), takže test kontroluje ji a identitu aktéra.
- Do CI přibyl job **`database-tests`**, který zvedne lokální Supabase, spustí `supabase db reset` (čistý běh) a `supabase test db`. Databázové testy se tak už nemohou tiše rozejít.

**Výsledek:** `Files=12, Tests=216, Result: PASS` — zelené i na čistě resetované databázi.

**Zbytkové riziko (dříve):** `lead_queue_items.team_id` i `calls.team_id` mohou být `NULL` — a je to **záměrný stav** „vlastnictví ještě není potvrzené“ při administrátorském importu. Záměr dokládá i komentář u sloupce (`NULL` znamená, že odpovědnost ještě nikdo nepotvrdil). Vada nebyla v tom, že `NULL` existuje — to je nutné, jinak by administrátorský import neměl co zakládat. Vada byla v tom, co se s `NULL` dělo:

1. `assign_team_ownership` měnil vždy **jen jeden záznam**. Po potvrzení týmu u leadu zůstala jeho položka fronty bez týmu — a protože operátor vidí jen frontu s přiřazeným týmem, práce tiše čekala na administrátora.
2. Nikde nebylo vidět, **kolik** záznamů na potvrzení čeká — panel byl schovaný ve správě uživatelů.

---

## Dořešení rizika z Fáze 5.1: vlastnictví záznamů (Fáze 5.1b)

**Rozhodnutí PM:** riziko se neřeší zpřísněním schématu (`NOT NULL` by rozbilo administrátorský import, protože právě import vytváří data bez potvrzeného týmu), ale chováním aplikace.

**Oprava:**

1. **Kaskáda vlastnictví** (migrace `20261015090000_team_ownership_queue_cascade.sql`). Potvrzení týmu u jednoho záznamu doplní i jeho protějšek, ale **nikdy nepřepíše** už potvrzený tým:
   - u leadu se doplní jeho položky fronty (jen ty bez týmu),
   - u položky fronty se doplní její lead (jen pokud tým nemá).
   Zůstává zachovaný původní slib: **stav fronty ani přiřazeného operátora to nemění**.
   - Pokud položka fronty patří operátorovi z **jiného** týmu, kaskáda ji přeskočí (jinak by ji validační trigger odmítl) a administrátorovi to řekne — výsledek RPC nese `leads_updated`, `queue_items_updated` a `queue_items_remaining`.
   - `NULL` není vada, ale ani definitivní stav: dokud vlastnictví nikdo nepotvrdí, záznam zůstává jen administrátorovi.
2. **Viditelné počítadlo a vlastní obrazovka.** Panel „Přiřazení záznamů k týmům“ se přesunul ze `/admin/users` na vlastní stránku **`/admin/ownership`** a karta **Team Ownership** v Management hubu nese počítadlo „N bez přiřazení“. Administrátor tak vidí čekající práci bez hledání v cizí obrazovce.
3. **Testy.** Nový pgTAP soubor `supabase/tests/database/team_ownership_assignment_test.sql` hlídá 23 situací (kaskáda oběma směry, ne-přepis už potvrzeného týmu, přeskočení operátora z jiného týmu, viditelnost pro vedoucího a operátora, zákaz zápisu pro vedoucího, archivovaný tým z jiného workspace, historický snapshot hovoru). Přibyl i test `tests/team-ownership-cascade.test.ts` a test hranice route `/admin/ownership`.

**Ověření:** `supabase db reset` (131 migrací + seed) → `npx supabase test db` = **`Files=12, Tests=216, Result: PASS`**; `npm test` = 872 testů v 180 souborech; `npm run verify:parity` = 131 = 131; `lint` a `typecheck` bez chyby.

**Proč ne `NOT NULL`:** sloupce `leads.team_id`, `lead_queue_items.team_id` a `calls.team_id` vyjadřují i stav „import přišel, administrátor ještě nerozhodl“. Přísnost by import zablokovala. Přínos má nástroj a viditelnost, ne constraint.

---

## Odloženo: departments vs. týmy

Model oddělení P1–P4 je dnes realizovaný přes entity `teams` (oddělení se odvozuje z týmu). Diskuze, jestli má být oddělení samostatná entita, patří do samostatné fáze. V této fázi se **žádná migrace schématu kvůli oddělením nedělala** — jen se zaznamenává rozhodnutí.

---

## Co zůstává otevřené

1. **Vzdálená migration parity** — blokováno na straně Supabase platformy; zůstává ruční runbook.
2. **Index pro Exception Queue** — až pokud by fronta výrazně narostla (dnes není potřeba).
