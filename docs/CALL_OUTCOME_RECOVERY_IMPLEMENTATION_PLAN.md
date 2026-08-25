# Call outcome a recovery workflow: implementační plán

Stav k 25. 8. 2026. Tento dokument je runbook pro bezpečné ověření a případné sandboxové nasazení. Není to povolení k live SQL zápisu a neřeší migration drift změnou historie.

## 1. Aktuální stav

Kódová část je připravená v commitu `f89fa29` na branchi `fix/persist-call-outcome-recovery`. Branch je publikovaná a změna je v draft PR #9.

Implementace obsahuje persistentní `awaiting_outcome`, bezpečný `end_lead_call`, interrupted/recovery cestu přes lease, explicitní callback čas, serverové completion guardy, idempotentní chování na úrovni stavu assignmentu a autorizovaný Team Leader/Administrator release.

To ale znamená pouze „kód existuje“. Live workflow zatím není ověřený. Live sandbox podle read-only reconu novou migraci neobsahuje, takže současný běh aplikace nemá potvrzené nové sloupce, RPC ani RLS chování.

## 2. Potvrzené důkazy

- Správný target aplikace je sandbox `lpvypihpxhyjljikfzqo` na hostu `lpvypihpxhyjljikfzqo.supabase.co`.
- `qlzrsookyobtvyekhrqi` je starší projekt a není target tohoto workflow.
- Supabase CLI `2.115.0` je dostupné přes `npx` a autentizace funguje.
- `migration list` potvrdil remote-only drift: live historie obsahuje verze, které tento checkout lokálně nemá.
- `db push --dry-run --project-ref lpvypihpxhyjljikfzqo` skončil chybou `LegacyDbPushMissingLocalError`.
- Read-only query proti targetu potvrdil:

  | Kontrola | Výsledek |
  | --- | --- |
  | `new_migration_applied` | `0` |
  | `recovery_column_present` | `false` |
  | `end_call_rpc_present` | `false` |
  | `completion_rpc_present` | `true` |

Z toho plyne, že live DB je stále na starším queue modelu. Nebyla provedena žádná live změna.

## 3. Co se v této přípravě nesmí stát

V této fázi se nesmí:

- použít `migration repair` nebo jiný zásah do migration history;
- spustit `db pull` do produktového checkoutu;
- aplikovat novou migraci naslepo;
- provést přímý live SQL nebo migration zápis;
- obcházet drift přes `--include-all`, force flag, ruční zápis do migration tabulek nebo podobný workaround;
- měnit PR #6, #7 nebo #8;
- označit feature jako live ověřenou pouze podle buildu, statických testů nebo existence RPC v commitu.

## 4. Jediná rozhodovací brána před aplikací

Před jakýmkoli sandboxovým aplikačním krokem se musí v izolovaném scratch prostoru vysvětlit a zreconciliovat provenance migration history.

Scratch prostor musí oddělit:

- přesný seznam remote migration verzí a názvů;
- přesný seznam lokálních migration souborů a jejich hashů;
- zdroj každé remote-only verze: jiný checkout, archivovaný branch, release artefakt, nebo jiný schválený zdroj;
- rozdíl mezi historickou strukturou live DB a novou migrací `20260824210525_persist_call_outcome_recovery.sql`;
- důkaz, že žádná historická verze nebude přepsána, přeskočena nebo vydávána za novou.

Dokud tato provenance není vysvětlená, normální `db push` nelze bezpečně použít. Teprve po schválení výsledku scratch reconciliation se smí zvolit konkrétní aplikační strategie do sandboxu. Tato strategie musí být auditovatelná, jednorázová a nesmí opravovat historii skrytým způsobem.

## 5. Fázovaný runbook

### Fáze 1 — Read-only provenance

**Cíl:** Získat autoritativní mapu live/local migration historie bez jakéhokoli zápisu.

**Důkaz:** Export nebo uložený read-only výstup obsahuje target project ref, remote/local seznam, remote-only položky, lokální novou migraci a potvrzení `new_migration_applied=0`.

**Stop podmínka:** Target není jednoznačně `lpvypihpxhyjljikfzqo`, seznamy nejdou získat konzistentně, nebo není možné přiřadit provenance remote-only verzím.

### Fáze 2 — Bezpečná volba migration strategie

**Cíl:** Na základě provenance určit schválený způsob, jak dostat novou migraci do sandboxu bez změny historie naslepo.

**Důkaz:** Krátké rozhodnutí s uvedením vstupů, rizik, přesného targetu, očekávaného výsledku a rollback/stop postupu. Normální `db push` je do té doby označený jako blokovaný.

**Stop podmínka:** Návrh vyžaduje migration repair, `db pull` do produktového checkoutu, přímý zápis do migration tabulek, nebo nelze určit, co se má aplikovat.

### Fáze 3 — Controlled sandbox application

**Cíl:** Aplikovat pouze schválenou novou migraci do `lpvypihpxhyjljikfzqo`, s explicitním logem příkazu, targetu a výsledku.

**Důkaz:** Aplikační log, nová migration history položka podle schváleného postupu a read-only potvrzení, že změna proběhla právě v target sandboxu.

**Stop podmínka:** Jakýkoli nečekaný SQL error, nesoulad targetu, změna jiné migrace, nebo výsledek mimo očekávaný schema diff. Při stopu se nic neopravuje ad hoc.

### Fáze 4 — Read-only schema, RLS a advisors

**Cíl:** Ověřit, že schema odpovídá migraci a že nový RPC/RLS model není pouze přítomný, ale správně chráněný.

**Důkaz:** Read-only query potvrdí `recovery_required`, `call_started_at`, `call_ended_at`, stav `awaiting_outcome`, `end_lead_call`, aktualizovaný completion RPC, grants, RLS policy, unikátní current-assignment index a audit event constraints. Advisors jsou uložené odděleně od aplikačních testů.

**Stop podmínka:** Chybí sloupec/RPC/grant/policy, objevuje se cross-workspace přístup, role boundary není prokazatelná, nebo advisor odhalí nový blocker bez vysvětlení.

### Fáze 5 — Authenticated Operator persistence/recovery smoke

**Cíl:** Na řízeném testovacím účtu ověřit skutečný Operator workflow proti live sandboxu.

**Důkaz:** Browser trace/screenshot plus read-only DB evidence pro stejný fixture: claim → start → End call → `awaiting_outcome` → outcome → summary, reload, logout/login, a případně zavření tabu s následným lease/recovery.

**Stop podmínka:** UI zobrazí success bez potvrzeného serverového zápisu, lead zmizí, změní vlastníka, vznikne duplicitní call/callback, nebo se po loginu nevrátí stejný recovery lead.

### Fáze 6 — Negative cross-workspace/role test

**Cíl:** Prokázat, že oprávnění není jen pozitivní happy path.

**Důkaz:** Authenticated testy s neoprávněným Operatorem, Team Leaderem/Adminem mimo workspace a cizím workspace ID. Každý pokus skončí odmítnutím a nevytvoří call, order, callback ani queue event mimo očekávanou auditní stopu.

**Stop podmínka:** Cizí workspace vrací data, Operator může manager action, manager může obejít role boundary, nebo chyba není fail-closed.

### Fáze 7 — Fixture cleanup

**Cíl:** Odstranit pouze jasně označené testovací fixture z target workspace.

**Důkaz:** Před/po read-only počet, přesný seznam fixture ID, potvrzení `remaining=0` pro testovací prefix a kontrola, že nebyla odstraněna produkční data.

**Stop podmínka:** Fixture není jednoznačně identifikovatelná, cleanup by zasáhl reálná data, nebo po testu zůstane neznámý call/order/callback.

### Fáze 8 — Final gates and delivery

**Cíl:** Uzavřít důkazy, aktualizovat PR #9 a rozhodnout, zda je možné opustit draft.

**Důkaz:** Oddělený report static/browser/persistence/authorization-RLS/provenance, čistý Git stav, přesný commit, migration evidence a potvrzení, že PR #6–#8 zůstaly nedotčené.

**Stop podmínka:** Chybí jediný důkaz z acceptance matice, migration provenance zůstává nejasná, nebo live stav neodpovídá kódu. PR #9 zůstává draft.

## 6. Validační matice

| Scénář | Očekávaný serverový výsledek | Povinný důkaz | Stop při |
| --- | --- | --- | --- |
| Aktivní hovor | Stav `in_progress`; žádné outcome completion akce | Browser snapshot aktivního hovoru + read-only queue stav | Outcome tlačítka jsou dostupná během hovoru |
| End call | Lokální session skončí; server přejde na `awaiting_outcome`, ownership zůstane | Browser + queue row + `outcome_pending` event | Lead se uvolní nebo se otevře callback bez volby |
| Call Later / No answer | Completion `no_answer`; správná retry/available cesta; summary | Call row, queue row, event, summary | Duplicitní call nebo jiný outcome |
| Schedule callback | Callback vznikne až po explicitní volbě a potvrzení budoucího času; `waiting_callback` | Callback/queue row, `scheduled_at`, event, summary | Callback vznikne při End call nebo bez času |
| Not interested | Completion `objection`; lead/queue status odpovídá existující cestě; summary | Call, lead status, queue event | Jen lokální UI změna nebo falešný success |
| Create order | Order completion pouze přes explicitní order flow; call/order jsou ve stejném workspace | Call, order, lead status, queue event, summary | Order vznikne bez potvrzení nebo mimo workspace |
| End call → reload | `awaiting_outcome` přežije reload; stejný operator vidí stejný lead | Browser reload + queue read | Lead zmizí, claimne se další, nebo se znovu nabídne Call client |
| End call → logout/login | Ownership a pending outcome se vrátí stejnému operatorovi | Dvě authenticated session fáze + queue row | Lead je dostupný jinému operatorovi nebo stav zmizí |
| Zavření tabu během aktivního hovoru | Žádný outcome/callback; assignment zůstane u operátora a přejde do recovery | Browser close + event/state po lease/re-entry | Lead se vrátí do `available` nebo vznikne outcome |
| Lease recovery | Expirovaný `in_progress` se označí `interrupted`/`recovery_required`, ne jako available | Lease timestamps, queue event, owner, re-entry snapshot | Expirace uvolní skutečně započatý hovor |
| Blokace dalšího claimu | `claim_next_lead` vrátí současný `awaiting_outcome` assignment nebo odmítne nový claim | RPC response + queue count | Operator dostane další lead před outcome |
| Idempotence | Dvojité End je bezpečné; opakované completion/callback nevytvoří duplicitní řádky | Dvě identická odeslání + counts/unique IDs | Druhý call/order/callback vznikne |
| Team Leader/Admin release | Release/recovery pouze autorizovanou RPC cestou, s audit eventem | Role test, RPC response, queue event | Přímá mutace, chybějící audit, nebo Operator release |
| Cizí workspace/role | Read/write/RPC pokus je odmítnut; žádný cizí row leakage | Negative authenticated test + DB counts | Cross-workspace nebo role escalation |

## 7. Oddělení důkazů

### Static tests

Patří sem `npm test`, `npm run check`, `npm run build`, `git diff --check`, TypeScript/lint a kontrola explicitního seznamu souborů. Tyto testy potvrzují konzistenci checkoutu, ne Auth, RLS, migration aplikaci ani persistence.

### Browser

Patří sem skutečná přihlášená session, End call → inline outcome, čtyři outcome průchody, callback confirmation, reload, logout/login, close-tab recovery a vizuální/error state. Browser smoke bez DB evidence není důkaz persistence.

### Persistence

Patří sem read-only kontrola call/order/lead/queue/callback/event řádků před a po akci, kontrola reloadu a absence duplicit. Zobrazený summary sám o sobě není persistence důkaz.

### Authorization/RLS

Patří sem pozitivní Operator access, manager release a negativní cizí workspace/role testy. Inventář policy nebo počet RLS policy není důkaz role-by-role authorization; musí být doložený runtime negative test.

### Migration provenance

Patří sem pouze read-only porovnání remote/local historie, provenance remote-only verzí, schválená aplikační strategie a schema/RLS/advisor výsledek. Úspěšný build ani přítomnost SQL souboru neznamená, že live migrace existuje.

## 8. Doporučený další krok

Jediný doporučený další krok je samostatný **migration-provenance reconciliation slice** v izolovaném scratch prostoru. Dokud nebude provenance vysvětlená a schválený způsob aplikace potvrzený, PR #9 zůstává draft a feature se nesmí označit jako live ověřená.
