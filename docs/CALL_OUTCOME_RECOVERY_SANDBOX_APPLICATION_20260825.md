# Audit controlled sandbox application: call outcome recovery

Stav k 25. 8. 2026. Tento dokument zaznamenává controlled sandbox application provedenou parent taskem. Dokumentace sama neprovádí žádný databázový příkaz ani další změnu.

## 1. Target a kanonický baseline

Controlled application proběhla proti správnému Supabase sandboxu:

- project ref: lpvypihpxhyjljikfzqo
- host: lpvypihpxhyjljikfzqo.supabase.co

Kanonickým migration baseline source byl scratch export migration souborů z origin/feat/lead-call-outcome-order na d37b53e. Tento source byl použit pouze pro migration baseline. Neznamená povolení k merge nebo nasazení unrelated kódu z feature větve.

Starší origin/chore/close-pilot-readiness-gate nebyl použit jako úplný baseline, protože neobsahuje šest live call-order migrací.

## 2. Preflight

Read-only preflight před aplikací zaznamenal:

| Kontrola | Výsledek |
| --- | ---: |
| Migration history | 61 |
| public.lead_queue_items | 1 |
| public.lead_queue_events | 15 |
| end_lead_call RPC | 0 |
| Current-operator index | 1 |
| Queue policy | 1 |

Scratch export obsahoval pouze migration soubory z kanonického baseline a novou lokální migraci pro call outcome recovery. Nebyl zahrnut unrelated aplikační kód.

## 3. Dry-run a apply

Exact dry-run oznámil pouze jednu pending migraci:

20260824210525_persist_call_outcome_recovery.sql

Controlled apply příkaz následně proběhl úspěšně a bez dalších migrací. Aplikován byl pouze tento očekávaný nový migration version row. Dry-run i apply byly provedeny proti targetu lpvypihpxhyjljikfzqo.

## 4. Postflight schema a workflow objekty

Read-only postflight po aplikaci zaznamenal:

| Kontrola | Výsledek |
| --- | ---: |
| new_migration_applied | 1 |
| Migration history | 62 |
| Recovery columns present | 3 |
| Public call RPCs present | 2 |
| Current-operator index | 1 |
| Queue policy | 1 |
| public.lead_queue_items | 1 |
| public.lead_queue_events | 15 |

Tři recovery sloupce odpovídají nové call-state/recovery migraci: call_started_at, call_ended_at a recovery_required. Dvě public call RPC odpovídají completion cestě a novému end-call přechodu.

## 5. RLS a routine grants

Read-only RLS ověření potvrdilo:

| Tabulka | rls_enabled |
| --- | --- |
| public.lead_queue_items | true |
| public.lead_queue_events | true |

Routine grants výpis potvrdil:

- complete_lead_call má EXECUTE pro authenticated;
- end_lead_call má EXECUTE pro authenticated;
- postgres a service_role jsou systémové granty;
- ve výpisu nebyl anon ani public EXECUTE grant pro tyto call RPC.

Toto je schema/grant evidence. Samo o sobě to ještě není důkaz role-by-role runtime authorization ani authenticated Operator persistence.

## 6. Advisors

Advisor výstup obsahoval pouze:

- existující warning pro vypnutou ochranu proti leaked password;
- existující warningy multiple permissive policies na nesouvisejících tabulkách.

Nebyl nalezen nový blocking finding vztahující se k queue migration, lead_queue_items, lead_queue_events, end_lead_call nebo completion workflow.

Advisor výsledek není náhradou za browser, persistence nebo negativní cross-workspace/role test.

## 7. Rozsah změny a data

Read-only audit nepotvrdil žádný fixture ani aplikační INSERT, UPDATE nebo DELETE dat. Nebyla provedena žádná změna migration history mimo očekávaný nový version row pro 20260824210525_persist_call_outcome_recovery.sql.

Postflight counts queue_items=1 a queue_events=15 odpovídají preflightu. Nebyl doložen nový aplikační lead, callback, order nebo testovací fixture jako vedlejší efekt controlled application.

## 8. Authenticated Operator browser a persistence smoke

Smoke proběhl na PR9 buildu na localhost:3000 v existující přihlášené mikestudio Operator session v sandbox workspace 9015a0bf...; žádné secrets nebyly zaznamenány.

### Ověřené průchody

- /workspace původně neměl assignment. Bylo vytvořeno přesně pět dočasných sandbox fixture leadů s markerem TEMPORARY CODEX FIXTURE - REMOVE AFTER CALL OUTCOME TEST 20260825. Všechny byly po testu odstraněny.
- Během aktivního hovoru UI zobrazilo Active call a pouze End call; outcome actions nebyly dostupné.
- End call zobrazil Outcome required, Lead remains assigned a přesně čtyři inline outcome actions.
- End call → reload zachoval outcome state i všechny čtyři akce.
- Schedule Callback otevřel inline dialog s povinným datem/časem; save proběhl až po explicitním kliknutí na Schedule callback a summary zobrazilo Follow-up scheduled.
- Call Later dokončil průchod se summary No answer.
- Not interested dokončil průchod se summary Not interested.
- Create Order vyžadoval Place Order a summary zobrazilo Order placed / Created.
- Při zavření tabu během potvrzeného in_progress byly před zavřením read-only ověřeny state=in_progress, stejný assigned_operator_id a recovery_required=false. Nová tab/session načetla stejný lead se stavem Outcome required, textem The call was interrupted, ownership zůstala operátorovi a byly dostupné všechny čtyři outcomes. Dokončení recovery vrátilo stav do waiting for assignment.
- End call → logout → login stejného Operatora zachoval stejný lead ve stavu Outcome required se všemi čtyřmi outcomes.
- Dvojité souběžné odeslání Call Later skončilo jedním dokončením: SQL kontrola po průchodu ukázala přesně jeden fixture call a pět očekávaných queue events. Nebyla vytvořena duplicita.
- Operator role smoke po čistém buildu potvrdil, že /team zobrazuje Team operations unavailable a /settings/scripts zobrazuje Script administration unavailable; obě stránky měly srozumitelné role omezení a žádné nové console errors.
- Finální recovery tab neměl v browser console errors ani warnings.
- Během jednoho časného dialing-only pokusu End call bezpečně vrátil item do assigned bez outcome. To odpovídá hranici před potvrzeným serverovým call startem.

## 9. Přímý authorization/RLS smoke

V live sandboxu proběhl rollback-only SQL test přes skutečné databázové role
`authenticated` a JWT claims existujícího Administratora a Operatora. Test
nepoužil service-role výsledek jako důkaz oprávnění.

- Administrátor u dočasného `awaiting_outcome` itemu úspěšně provedl
  `release_lead_assignment`; item přešel na `available`, ztratil ownership a
  `recovery_required` se vrátilo na `false`.
- Vznikl očekávaný auditní event `released` s actorem Administrátora.
- Operator stejný release nedokázal; server vrátil přesně
  `Queue item is not available for release`.
- V dočasném druhém workspace byl vytvořen queue řádek bez membershipu
  testovaného Operatora. RLS mu nevrátila žádný řádek a `get_current_lead`
  vrátil `Only an Operator member can view current queue work`.
- Celý test skončil rollbackem. Po testu zůstaly baseline counts
  `queue_items=1`, `queue_events=15`, `calls=17`, `orders=9`; dočasné leady i
  workspace měly počet `0`.

### Cleanup a persistence evidence

Read-only cleanup ověření potvrdilo odstranění všech pěti fixture leadů a návrat na baseline counts:

| Kontrola | Výsledek |
| --- | ---: |
| remaining fixture leads | 0 |
| queue_items_total | 1 |
| queue_events_total | 15 |
| calls_total | 17 |
| orders_total | 9 |
| leads_total | 4 |

Tyto browser/persistence důkazy doplňují migration/schema/RLS postflight a přímý authorization smoke níže. Browser evidence sama o sobě nenahrazuje serverový/RLS důkaz.

## 10. Přesná hranice důkazu

Tento audit potvrzuje, že:

- správná nová migration version je v targetu aplikovaná;
- schema objekty, RLS a routine grants očekávané touto migration boundary jsou přítomné;
- apply nepřidal další migrace ani doložená aplikační data;
- advisors neukázaly nový blocker pro queue migration.

Stále nebylo ověřeno:

- pozitivní browser průchod Administrátora přes /team; pro tento běh nebyla
  dostupná přihlášená Administrator session;
- Team Leader runtime varianta, protože v live sandboxu není žádný aktivní
  Team Leader membership.

Operator UI omezení pro /team a /settings/scripts jsou ověřená jako browser evidence, ale nenahrazují přímý serverový/RLS negativní test.

Existující login page confusion nebyla řešena jako unrelated fix: session už byla autentizovaná jako mikestudio Operator a navigace na /workspace se načetla nebo přesměrovala správně.

Feature proto nesmí být označena jako kompletně live ověřená pouze na základě tohoto migration/schema/browser postflightu. Serverová authorization/RLS cesta a Administrator release jsou ověřené; zbývá už jen pozitivní browser průchod managera a Team Leader varianta.
