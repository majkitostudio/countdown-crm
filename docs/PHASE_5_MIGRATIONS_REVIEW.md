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
| 5.3 | Čistý běh celého řetězce na čisté DB | ✅ 130 migrací + seed projde bez chyby |
| 5.4 | Výkon dotazů z Fáze 3 na objemu dat | ✅ oba dotazy do ~90 ms na 200–300 tis. řádcích |
| 5.5 | „Migration parity“ (disk vs. databáze) | ✅ lokálně 130 = 130; skript `verify:parity` |
| — | Databázové pgTAP testy | ⚠️ **selhávají** (nezávisle na této práci) — viz „Nález“ |
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

**Ověřeno:** `npx supabase db reset` na lokálním Docker Supabase projde celý řetězec **od nuly**: aplikuje **130 migrací** a poté spustí seed. Exit 0. Zahrnuty jsou i obě migrace z Fáze 3, které se dřív neověřovaly:

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

**Ověřeno lokálně:** 130 souborů na disku = 130 aplikovaných verzí, `MIGRATION PARITY OK`. Při nasimulovaném driftu (dočasný soubor navíc) skript správně hlásí `MISSING IN DATABASE` a končí s exit 1.

**Vzdálená parita je zatím nedostupná** a zůstává jako ruční runbook: Management API se nedokáže přihlásit do databáze projektu (chyba na straně platformy, ne tokenu), takže `--linked` se teď nedá spolehlivě použít. Postup pro ověření vzdáleného projektu je v `docs/P0_3_REMOTE_DB_RUNNER.md`.

---

## Nález mimo původní rozsah: databázové pgTAP testy selhávají

Při čistém běhu se ukázalo, že **`npx supabase test db` neprojde** — 4 ze 11 testovacích souborů hlásí chyby. Není to důsledek této práce: stejné chyby se objeví i na databázi bez seedu.

**Proč to nikdo nezachytil:** CI (`.github/workflows/ci.yml`) spouští jen lint, typecheck, vitest a build. Databázové pgTAP testy v něm nejsou, takže tiše „hnily“.

**Příčina:** testy pocházejí z doby před týmovým modelem (migrace ze série `20260914*`). Dnes RLS pustí vedoucího týmu k hovoru jen přes **týmové přiřazení** (`can_manage_team_resource`), ale testy zakládají jen členství ve workspace a hovor bez týmu. Produkční logika tím pádem může být v pořádku — rozbité jsou testovací fixtures.

**Doporučení:** opravit fixtures a **přidat databázový job do CI**, aby testy nemohly znovu tiše ztichnout. Je to samostatný kus práce (4 soubory + CI), proto ho navrhuji jako **Fázi 5.1** nebo samostatnou fázi, ne jako součást už uzavřených kroků.

---

## Odloženo: departments vs. týmy

Model oddělení P1–P4 je dnes realizovaný přes entity `teams` (oddělení se odvozuje z týmu). Diskuze, jestli má být oddělení samostatná entita, patří do samostatné fáze. V této fázi se **žádná migrace schématu kvůli oddělením nedělala** — jen se zaznamenává rozhodnutí.

---

## Co zůstává otevřené

1. **Databázové pgTAP testy** — opravit fixtures a zařadit `supabase test db` do CI (viz nález výše).
2. **Vzdálená migration parity** — blokováno na straně Supabase platformy; zůstává ruční runbook.
3. **Index pro Exception Queue** — až pokud by fronta výrazně narostla (dnes není potřeba).
