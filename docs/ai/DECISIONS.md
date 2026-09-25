# Decisions

Tento soubor obsahuje pouze rozhodnutí s dopadem na další práci. Návrhy a otevřené otázky patří do `OPEN_QUESTIONS.md`.

## Decision: Operator-first pracovní smyčka

- Date: 2026-09-25 (decision recorded from existing project sources)
- Status: ACTIVE
- Area: Product / UX
- Decision: Countdown CRM má prioritizovat klienta na telefonu, zákaznický kontext, schválený text a bezpečný další krok; nemá přidávat zbytečnou administrativu.
- Reason: Explicitně uvedeno v `README.md` a `PROJECT.md` jako základní produktový princip.
- Consequences: Nové funkce se posuzují podle zkrácení času hledání, psaní nebo rozhodování bez oslabení bezpečnosti, soukromí a auditní stopy.
- Source: `README.md`, `PROJECT.md`

## Decision: Workspace and role enforcement

- Date: 2026-09-25 (decision recorded from existing project sources)
- Status: ACTIVE
- Area: Architecture / Security
- Decision: Workspace a role musí být vynucené serverem a databázovým RLS; UI skrytí, přímá URL ani znalost UUID nejsou bezpečnostní hranicí.
- Reason: Ochrana cross-workspace dat a role-aware přístupu nesmí záviset na klientovi.
- Consequences: Kritické zápisy musí procházet serverovou datovou vrstvou, Server Actions nebo RPC a změny musí mít odpovídající bezpečnostní ověření.
- Source: `PROJECT.md`, `docs/DEVELOPMENT_WORKFLOW.md`, Supabase migrations

## Decision: Truthful provider and AI boundaries

- Date: 2026-09-25 (decision recorded from existing project sources)
- Status: ACTIVE
- Area: Product / Safety
- Decision: Simulator, fallback, `AI-assisted` a `Unavailable` se nesmí vydávat za live telefonii nebo potvrzenou externí integraci; AI nesmí diagnostikovat, slibovat léčbu ani vymýšlet zdravotní tvrzení.
- Reason: Produkt pracuje s citlivými rozhovory a externími providery, jejichž stav musí být pro uživatele pravdivý.
- Consequences: UI, dokumentace a testy musí rozlišovat lokální/statické důkazy od živé persistence, RLS a live provideru.
- Source: `README.md`, `PROJECT.md`, `docs/AKTUALNI_STAV_A_DESATERO.md`

## Decision: Team scope remains bounded

- Date: 2026-09-25 (decision recorded from existing project sources)
- Status: ACTIVE
- Area: Product / Authorization
- Decision: Team Leader pracuje v týmovém scope, zatímco workspace-global výjimky a Wallet zůstávají administrátorské nebo workspace-global; týmové vlastnictví se zatím nerozšiřuje do workflow, produktů a Walletu.
- Reason: Aktuální týmová vlna má držet hlavní denní smyčku a nepřidávat předčasný cross-domain scope.
- Consequences: Nové týmové funkce potřebují explicitní scope, serverové guardy, RLS a odpovídající read-back; nesmí automaticky rozšířit team ownership do zmrazených oblastí.
- Source: `PROJECT.md`, `docs/AKTUALNI_STAV_A_DESATERO.md`, team specs/reports

## Decision: Versioned migrations are database source of truth

- Date: 2026-09-25 (decision recorded from existing project sources)
- Status: ACTIVE
- Area: Database / Operations
- Decision: Databázové změny se řídí verzovanými migracemi a ověřením konkrétního cílového prostředí; `supabase/schema.sql` je historický snapshot.
- Reason: Historický schema dump sám neprokazuje migration history ani stav linked prostředí.
- Consequences: Database work musí oddělovat lokální testy, migration history, RLS a autentizovaný read-back cílového prostředí.
- Source: `PROJECT.md`, `docs/DEVELOPMENT_WORKFLOW.md`, `docs/P0_3_REMOTE_DB_RUNNER.md`

## Decision: Historical decisions are not deleted

- Date: 2026-09-25
- Status: ACTIVE
- Area: Documentation
- Decision: Když nové rozhodnutí nahradí staré, staré rozhodnutí se zachová a označí `SUPERSEDED` s odkazem na nové.
- Reason: AI memory layer musí zachovat auditní stopu a nesmí zaměnit změnu směru za původní stav.
- Consequences: Tento dokument není seznam drobných úkolů; každá změna statusu musí zachovat zdroj a návaznost.
- Source: Zadání AI memory layer
