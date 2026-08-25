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

## 8. Přesná hranice důkazu

Tento audit potvrzuje, že:

- správná nová migration version je v targetu aplikovaná;
- schema objekty, RLS a routine grants očekávané touto migration boundary jsou přítomné;
- apply nepřidal další migrace ani doložená aplikační data;
- advisors neukázaly nový blocker pro queue migration.

Stále nebyly ověřeny:

- authenticated Operator persistence přes skutečný claim → start → End call → outcome workflow;
- persistence po reloadu;
- persistence po logout/login;
- browser recovery po zavření tabu během skutečně aktivního hovoru;
- všechny four outcomes a callback confirmation;
- idempotency při dvojitém odeslání nebo opakovaném callback/completion;
- negativní cross-workspace a role behavior;
- autorizovaný Team Leader/Administrator recovery nebo release workflow v runtime.

Feature proto nesmí být označena jako kompletně live ověřená pouze na základě tohoto migration/schema postflightu. Zbývá oddělený authenticated Operator, persistence, authorization/RLS negative a idempotency smoke.
