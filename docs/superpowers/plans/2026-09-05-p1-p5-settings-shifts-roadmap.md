# Countdown CRM P1–P5, Settings and Shift Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilizovat Countdown CRM před interním pilotem, dokončit hlavní operátorský a týmový pracovní tok, převést trvalá nastavení na server-side persistence a přidat bezpečně řízený Users & Permissions a směnový kalendář.

**Architecture:** Supabase PostgreSQL a Auth zůstávají jediným zdrojem pravdy pro workspace data, role, oprávnění, nastavení, směny a audit. Next.js server actions, DAL a RPC vynucují workspace a role; React klient pouze zobrazuje stav, posílá validované akce a drží dočasné UI/draft stavy. Nové domény budou mít vlastní tabulky, RLS, DAL, actions a testy místo jednoho volného JSON nastavení.

**Tech Stack:** Next.js App Router 16.3.2, React 19, TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth, Supabase CLI 2.116.0, Vitest 4, ESLint 9, Docker/Asterisk pro Local SIP.

**Spec:** `Review.md`, `PROJECT.md` a `docs/AKTUALNI_STAV_A_DESATERO.md`; tento plán sjednocuje jejich aktuální priority a poslední schválené změny scope.

## Global Constraints

- Aktuální pořadí produktu zůstává: P1 runtime/migration stabilita, post-call wrap-up, Conversation Brief, Team Leader Exception Queue, role-aware plochy/Workspace Readiness/Team Leader Review/auditní kontext, potom Telnyx a nakonec Gemini.
- Každá samostatná část končí vlastním testem, ověřením a commitem; žádný velký neověřitelný „all-in-one“ commit.
- Supabase migrace se vytvářejí přes připnutý CLI příkaz `npx supabase migration new <name>`; timestamp nového souboru se nikdy nevymýšlí ručně.
- `supabase/schema.sql` není zdroj pravdy; zdrojem jsou verzované migrace a ověření konkrétního cílového prostředí.
- Před jakoukoli změnou linked databáze se kontroluje migration history, cílové schema, RLS, grants a `db push --dry-run`.
- Produkční databáze se nesmí resetovat; `migration repair` je přípustný pouze po důkazu, že cílové schema už přesně odpovídá dané migraci.
- Každá tabulka v `public` musí mít RLS, explicitní grants a politiky s workspace/user/role hranicí; `TO authenticated` samo o sobě není autorizace.
- `service_role` a všechny externí API klíče zůstávají mimo browser; server-side secrets se nikdy neukládají do běžných user settings.
- Současná serverem řízená fronta leadů zůstává zachovaná; alternativní assignment
  strategie ani konfigurovatelný počet souběžných leadů se nepřidávají.
- Pracovní dny, pracovní hodiny a svátky nebudou paralelní Admin Settings; jediným zdrojem pravdy bude směnový kalendář.
- Osobní dlouhodobé preference uživatelů budou server-side; `localStorage` smí zůstat pouze pro dočasné drafty nebo neautoritativní cache.
- Local SIP je lokální validační cesta v Dockeru; Telnyx zůstává externě blokovaný a Gemini je pozdější fáze.
- Žádná funkce nesmí vydávat build, simulaci, fallback nebo lokální test za důkaz živého Telnyx hovoru, nahrávání nebo AI transcription.

---

## 1. Výsledný model po lopatě

### Co je společné pro workspace

Toto nastavení platí pro celý workspace a mění ho pouze administrátor:

- aktivní telephony adapter,
- workspace a integrační nastavení,
- pravidla bezpečnosti, auditu a readiness,
- produktové skripty, custom objects a další administrátorské konfigurace.

### Co je osobní pro uživatele

Toto nastavení patří konkrétnímu uživateli, ale ukládá se na server:

- hlasitost a preference zvuku,
- compact/full zobrazení profilu klienta,
- výchozí stránka,
- callback/notifikační preference,
- osobní Saved Views.

Klíčem bude podle workspace modelu `(workspace_id, user_id)`, aby stejný člověk mohl mít v různých workspace různá pracovní nastavení.

### Co není nastavení

Lokálně může zůstat pouze dočasná informace, která nemá být sdílená ani autoritativní:

- rozepsaný draft poznámky,
- otevřený modal,
- aktuální filtr před uložením,
- stav načítání,
- dočasná cache serverového blueprintu.

### Doporučená varianta

Použijeme doménově oddělené tabulky a serverové DAL/actions. Jedna univerzální tabulka s volným `settings JSONB` by byla rychlá, ale hůře by se validovala, auditovala a chránila RLS. Čistě lokální persistence by neřešila více zařízení ani konzistenci mezi operátory. Server-side doménové tabulky jsou proto doporučená varianta.

---

## 2. Pořadí samostatných commitů

| Pořadí | Commit | Výsledek | Proč v tomto místě |
|---:|---|---|---|
| 0 | `docs: record current roadmap decisions` | Zachycený aktuální scope a pravidla | Nejprve uzamkne nové požadavky v dokumentaci |
| 1 | `chore: verify and align database migration state` | Evidence a bezpečně srovnané cílové databáze | Vše další závisí na pravdivém schema a migration history |
| 2 | `feat: harden post-call completion flow` | Krátký a idempotentní wrap-up | Nejvyšší produktová hodnota pro operátorský pilot |
| 3 | `feat: add operator conversation brief` | Kontext před hovorem | Zkrátí hledání a přípravu bez AI závislosti |
| 4 | ✅ `feat: add team leader exception queue` | Akční fronta výjimek | Lokálně dokončeno v commitu `aa3618c` |
| 5 | `feat: persist user preferences server-side` | Audio, density a základ osobních settings | Odstraní skutečnou chybu `localStorage` persistence |
| 6 | `feat: persist saved views server-side` | Uživatelské Saved Views | Uložené filtry přežijí zařízení a session |
| 7 | `refactor: make blueprint state server authoritative` | Blueprint bez lokální autority | Sjednotí další workspace setting s pravdou na serveru |
| 8 | `feat: split role-aware settings surfaces` | My Settings, Team Operations, Workspace/Admin | Settings přestanou být směsí různých rolí |
| 9 | `feat: add role-aware surfaces and attention layer` | Role-aware home/nav a další akce | Každá role dostane správný pracovní kontext |
| 10 | `feat: add workspace readiness checks` | Pravdivý stav workspace | Admin uvidí konkrétní blokery a ne falešné „Ready“ |
| 11 | `feat: add real call review and audit context` | TL review reálných hovorů a kontext změn | Navazuje na stabilní call lifecycle a Exception Queue |
| 12 | `feat: add users and permissions administration` | Admin stránka `/users` | Explicitní týmy a oprávnění jsou nutné pro směny |
| 13 | `feat: add shift calendar data model` | Serverový model směn a osobního rozvrhu | Připraví jediný zdroj pravdy pro plánovanou dostupnost |
| 14 | `feat: add shift management workflows` | Směny, absence, přesčasy a schvalování | Admin/TL dostanou řízené provozní akce |
| 15 | `feat: connect schedule with presence and queue` | Rozvrh, presence a queue spolupracují | Dokončí směnový kontext bez záměny plánu za live status |
| 16 | `docs: record p1-p5 verification evidence` | Kompletní release evidence | Teprve zde lze rozhodnout o interním pilotu |

Telnyx a Gemini nejsou součástí těchto bezprostředních commitů. Zůstanou jako navazující kroky po externím ověření čísla a po stabilizaci předchozích vrstev.

---

## 3. Sdílené rozhraní a datový model

### Existující zdroje, které se zachovají

- `public.workspace_telephony_settings` — aktivní telephony adapter.
- `public.workspace_blueprint_state` — serverový stav blueprintu.
- `public.operator_presence` — aktuální online pracovní stav.
- `public.lead_queue_items` a `public.lead_queue_events` — assignment a queue historie.
- `public.profiles` a `public.workspace_members` — identity, role a workspace membership.
- `public.audit_logs` — centrální auditní stopa.
- existující call, callback, order, product script, calendar a wallet tabulky.

### Nové domény

#### `workspace_user_preferences`

Primární klíč `(workspace_id, user_id)`, cizí klíče na `workspaces(id)` a `profiles(id)`. První vlna obsahuje pouze skutečně používané preference:

```sql
workspace_id UUID NOT NULL
user_id UUID NOT NULL
ringtone_volume SMALLINT NOT NULL DEFAULT 80 CHECK (ringtone_volume BETWEEN 0 AND 100)
client_profile_density TEXT NOT NULL DEFAULT 'full' CHECK (client_profile_density IN ('full', 'compact'))
default_landing_page TEXT NOT NULL DEFAULT '/workspace'
callback_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

Uživatel čte a mění pouze vlastní řádek v workspace, ve kterém je členem. Preference nejsou workspace policy a administrátor je neupravuje za uživatele.

#### `workspace_saved_views`

Vlastnictví `(workspace_id, user_id)` a validovaný `filters JSONB`. Filtry obsahují pouze známé `fieldKey`, `operator` a scalar `value`; nesmí obsahovat SQL, callback nebo executable content. RLS dovolí vlastníku číst, vytvářet, měnit a mazat vlastní pohledy. Týmové sdílení se nepřidá v první migraci, ale model ho musí umožnit bez porušení vlastnictví.

#### Users, teams and permissions

Stávající `workspace_members` nestačí pro bezpečné pravidlo „Team Leader spravuje svůj tým“. Pokud aktuální schema nemá explicitní týmovou vazbu, přidají se:

- `workspace_teams` — workspace-scoped tým s názvem a leaderem,
- `workspace_team_members` — vazba user/team s historií změn,
- případná workspace policy pole pro to, zda TL smí spravovat členy a měnit týmová provozní pravidla.

Administrátor vidí celý workspace. Team Leader vidí a spravuje pouze týmy, ke kterým má explicitní leader/member vazbu. Operátor nevidí správu členů ani globální permissions.

#### Shift calendar

Pro historii a schvalování se oddělí plánovací vzor od konkrétní naplánované směny:

- `workspace_shift_templates` — opakovatelný vzor dne, časového rozsahu a timezone,
- `workspace_shift_assignments` — konkrétní směna uživatele s `starts_at`, `ends_at`, stavem a auditními údaji,
- `workspace_absences` — plánovaná nebo neplánovaná absence se stavem žádosti/schválení,
- `workspace_overtime_requests` — žádost nebo záznam přesčasu se schválením a časovým rozsahem.

Proběhlé směny a schválené změny se nepřepisují bez historie. Konflikty a překryvy se validují na serveru. `operator_presence` zůstává live status; směnový kalendář je plán, nikoli náhrada za `Ready`, `In call` nebo `Break`.

---

## Task 0: Uzamknout dokumentační baseline

**Status:** dokončeno 5. 9. 2026. Dokumentační baseline je v
`docs/superpowers/reports/2026-09-05-roadmap-baseline.md`.

**Files:**

- Modify: `docs/AKTUALNI_STAV_A_DESATERO.md`
- Modify: `PROJECT.md` tak, aby obsahoval aktuální pořadí priorit a schválený scope
- Include: `docs/superpowers/plans/2026-09-05-p1-p5-settings-shifts-roadmap.md` jako hlavní implementační plán
- Create: `docs/superpowers/reports/2026-09-05-roadmap-baseline.md`
- Test: `git diff --check`

**Interfaces:**

- Consumes: poslední uživatelské rozhodnutí o zachování současné lead queue, Users & Permissions a směnovém kalendáři.
- Produces: dokumentační baseline, na kterou odkazují všechny další commity.

- [ ] **Step 1: Zapsat schválené hranice.** Do To-Do uvést zachování současné lead queue bez alternativních strategií a souběžných leadů, směnový kalendář jako jediný zdroj plánované dostupnosti a samostatnou admin stránku `Users & Permissions`.
- [ ] **Step 2: Zkontrolovat konzistenci dokumentů.** `PROJECT.md`, `Review.md` a To-Do nesmí tvrdit, že pracovní dny, hodiny a svátky existují jako samostatná admin konfigurace.
- [ ] **Step 3: Ověřit dokumentaci.** Spustit:

```powershell
git diff --check
rg -n "lead|směnov|absence|přesčas|Users & Permissions|pracovní dny|pracovní hodiny|svát" docs/AKTUALNI_STAV_A_DESATERO.md PROJECT.md
```

- [ ] **Step 4: Commit.**

```powershell
git add docs/AKTUALNI_STAV_A_DESATERO.md PROJECT.md docs/superpowers/reports/2026-09-05-roadmap-baseline.md
git add docs/superpowers/plans/2026-09-05-p1-p5-settings-shifts-roadmap.md
git commit -m "docs: record current roadmap decisions"
```

---

## Task 1: Bezpečně srovnat migration history a databázové prostředí

**Files:**

- Inspect: `supabase/migrations/`
- Inspect: `supabase/config.toml`
- Inspect: `.env.local` pouze bez vypisování secrets
- Modify: `docs/superpowers/reports/2026-09-05-database-parity.md`
- Test: linked migration/schema/RLS checks

**Interfaces:**

- Consumes: aktuální repo migrations, linked sandbox a hlavní Supabase project identity.
- Produces: klasifikaci `same`, `local-only`, `remote-only`, `schema-drift` nebo `blocked` a bezpečný rollout decision.

- [ ] **Step 1: Zapsat výchozí evidence.** Zachytit repo branch/commit, počet a názvy lokálních migrací, CLI verzi, project ref z prostředí bez vypisování klíčů a rozlišení sandbox versus production.
- [ ] **Step 2: Vypsat linked history.** Spustit přes připnutý CLI:

```powershell
npx supabase --version
npx supabase migration list --linked
npx supabase db push --linked --dry-run
npx supabase db diff --linked --schema public
```

- [ ] **Step 3: Porovnat cílové schema a policy.** Ověřit existenci kritických tabulek, constraints, indexes, grants, RLS a politik pro `workspace_telephony_settings`, `operator_presence`, queue, wallet, scripts a audit. Pokud CLI nebo target není dostupný, výsledek označit jako `blocked`; nepoužívat demo auth jako náhradu.
- [ ] **Step 4: Rozhodnout o rollout pořadí.** Pokud sandbox obsahuje schema odpovídající repo, pouze doložit parity. Pokud má čekající repo migrace, nejprve je aplikovat do sandboxu po dry-run. Hlavní production project řešit až po samostatném dry-run a explicitním potvrzení před skutečným push.
- [ ] **Step 5: Aplikovat pouze schválený forward rollout.** Použít `npx supabase db push --linked` pouze na přesně identifikovaný target. Neprovádět reset. `migration repair` použít jen tehdy, když read-only schema evidence prokáže shodu.
- [ ] **Step 6: Ověřit po změně.** Znovu spustit migration list, dry-run, schema diff, security/performance advisors a read-only SQL kontrolu kritických tabulek/RLS. Zaznamenat skutečné exit codes a výsledky do reportu.
- [ ] **Step 7: Commit evidence.**

```powershell
git add docs/superpowers/reports/2026-09-05-database-parity.md
git commit -m "chore: verify and align database migration state"
```

**Acceptance criteria:** Sandbox a repo mají doloženou shodu; production má buď doloženou shodu, nebo explicitní otevřený rollout blocker. Neexistuje tvrzení o synchronizaci bez skutečného migration/schema/read-back důkazu.

---

## Task 2: Dokončit post-call wrap-up

**Files:**

- Modify: `src/app/workspace/page.tsx`
- Modify: `src/app/actions/crm.ts`
- Modify: `src/lib/dal/callCompletion.ts`
- Modify: `src/components/workspace/PostCallSummaryCard.tsx`
- Test: `tests/post-call-wrap-up-contract.test.ts`, `tests/post-call-read-model-contract.test.ts`, focused call completion tests

**Interfaces:**

- Consumes: existující `completeCallAction`, `CompleteCallInput`, queue/call/order DAL a současný call lifecycle.
- Produces: jeden idempotentní completion contract pro outcome, note, next action, callback a order.

- [ ] **Step 1: Napsat failing contract test.** Test musí ověřit, že opakované odeslání stejného completion requestu neprovede druhý outcome, callback nebo order a že fail outcome vyžaduje `failReason` a krátkou poznámku.
- [ ] **Step 2: Ověřit RED.** Spustit:

```powershell
npm test -- tests/post-call-wrap-up-contract.test.ts tests/post-call-read-model-contract.test.ts
```

Očekávání: test selže na chybějící deduplication/atomicity assertion, nikoli na syntaxi testu.
- [ ] **Step 3: Sjednotit input a idempotency key.** Completion request musí obsahovat stabilní `callSessionId` nebo existující call identity, záměrný outcome a bezpečně normalizované optional fields. Server nesmí věřit klientskému workspace ID.
- [ ] **Step 4: Zachovat současné write boundary.** Rozhodnutí o queue release, call state, callbacku a orderu provést v existující transakční/RPC vrstvě nebo v jedné serverové orchestraci s idempotentní ochranou.
- [ ] **Step 5: Upravit UI.** `PostCallSummaryCard` má zobrazit jasný stav `Saving`, `Saved`, `Failed` a `Retry`; po úspěchu se nesmí znovu odeslat stejná akce ani vytvořit duplicate.
- [ ] **Step 6: Ověřit GREEN a plný call test.** Spustit focused testy, následně `npm test -- tests/operator-call-outcome.test.ts tests/calls-fail-contract.test.ts tests/post-call-fail.test.ts`.
- [ ] **Step 7: Commit.**

```powershell
git add src/app/workspace/page.tsx src/app/actions/crm.ts src/lib/dal/callCompletion.ts src/components/workspace/PostCallSummaryCard.tsx tests/post-call-wrap-up-contract.test.ts tests/post-call-read-model-contract.test.ts
git commit -m "feat: harden post-call completion flow"
```

---

## Task 3: Přidat Conversation Brief

**Files:**

- Create: `src/lib/dal/conversationBrief.ts`
- Create: `src/app/actions/conversationBrief.ts`
- Create: `src/components/workspace/ConversationBriefCard.tsx`
- Modify: `src/app/workspace/page.tsx`
- Test: `tests/conversation-brief-contract.test.ts`

**Interfaces:**

- Consumes: lead, recent calls, last outcome, callback promise, notes, order context, Product Script data.
- Produces: `getConversationBriefForWorkspace(leadId): Promise<ConversationBriefDTO>` with deterministic, workspace-scoped read-only data.

- [ ] **Step 1: Napsat failing contract.** Ověřit, že brief vrací pouze dostupná data, řadí poslední relevantní kontakt, nefabuluje chybějící hodnoty a respektuje lead/workspace access.
- [ ] **Step 2: Ověřit RED.** Spustit `npm test -- tests/conversation-brief-contract.test.ts`.
- [ ] **Step 3: Implementovat read DAL.** Použít existující `createDataClient`, `requireWorkspaceContext` a datové typy; chybějící data mapovat na `null`/`Unavailable`, nikoli na vymyšlený text.
- [ ] **Step 4: Přidat server action a kartu.** Karta zobrazí problém, poslední relevantní kontakt, výsledek, callback promise a bezpečný další krok. Nebude předstírat AI predikci.
- [ ] **Step 5: Ověřit UI contract a runtime.** Spustit focused test, `npm run typecheck` a autentizovaný browser flow v Operator Console po reloadu.
- [ ] **Step 6: Commit.**

```powershell
git add src/lib/dal/conversationBrief.ts src/app/actions/conversationBrief.ts src/components/workspace/ConversationBriefCard.tsx src/app/workspace/page.tsx tests/conversation-brief-contract.test.ts
git commit -m "feat: add operator conversation brief"
```

---

## Task 4: Team Leader Exception Queue

**Files:**

- Create: migration generated by `npx supabase migration new team_leader_exception_queue`
- Modify: `src/lib/supabase/types.ts`
- Create: `src/lib/dal/exceptionQueue.ts`
- Create: `src/app/actions/exceptionQueue.ts`
- Create: `src/app/exceptions/page.tsx`
- Create: `src/components/exceptions/ExceptionQueue.tsx`
- Modify: role-aware navigation when Task 9 lands
- Test: `tests/exception-queue-contract.test.ts`

**Interfaces:**

- Consumes: overdue callbacks, stuck recovery, unclosed outcomes, long leases, failed workflows and missing published scripts.
- Produces: `listTeamLeaderExceptions()`, `resolveException(id, resolution)`, `snoozeException(id, until)` with server-side ownership and audit.

- [x] **Step 1: Napsat failing contract.** Každá výjimka má důvod, prioritu, vlastníka/cíl, source entity a bezpečnou další akci; operátor týmovou frontu nečte.
- [x] **Step 2: Ověřit RED.** Fail-first byl doložen pro základní model i pozdější návrat opakované výjimky.
- [x] **Step 3: Navrhnout read model.** Výjimky se odvozují ze source tables; ukládá se pouze auditované resolve/snooze rozhodnutí a výpadek jednoho zdroje nevyrábí falešné řádky.
- [x] **Step 4: Implementovat role boundary.** Team Leader a administrátor pracují v celém aktivním workspace, operátor je odmítnut navigací, serverovým guardem i RLS. Po explicitních týmech se TL scope zúží.
- [x] **Step 5: Implementovat resolve/snooze.** Ukládá se actor, timestamp, předchozí/nový stav a důvod; opakovaný stejný požadavek je idempotentní, ale skutečně nový výskyt stejného problému se znovu zobrazí a audituje.
- [x] **Step 6: Přidat UI.** `/exceptions` filtruje prioritu/stav/typ, ukazuje konkrétní důvod a další akci a přiznává částečný výpadek zdroje.
- [x] **Step 7: Ověřit GREEN a runtime.** 92 databázových testů, 251 aplikačních testů, lint/typecheck/build, lokální TL/operator browser flow, reload a audit read-back; admin hranice je ověřená databázově.
- [x] **Step 8: Commit.** `aa3618c feat: add team leader exception queue`.

**Stav nasazení:** lokálně ověřeno. Vzdálený dry-run ukazuje pouze migraci
`20260906062331_team_leader_exception_queue.sql`; do linked sandboxu zatím nebyla
aplikována, takže vzdálený smoke test zůstává otevřený.

```powershell
git add supabase/migrations src/lib/supabase/types.ts src/lib/dal/exceptionQueue.ts src/app/actions/exceptionQueue.ts src/app/exceptions/page.tsx src/components/exceptions/ExceptionQueue.tsx tests/exception-queue-contract.test.ts
git commit -m "feat: add team leader exception queue"
```

---

## Task 5: Server-side osobní preference

**Files:**

- Create: migration generated by `npx supabase migration new user_preferences`
- Modify: `src/lib/supabase/types.ts`
- Create: `src/lib/dal/userPreferences.ts`
- Create: `src/app/actions/userPreferences.ts`
- Modify: `src/lib/settings.ts`
- Modify: `src/app/settings/page.tsx`
- Modify: `src/components/workspace/ClientProfileCard.tsx`
- Modify: `src/components/workspace/clientProfileDensity.ts`
- Test: `tests/user-preferences-contract.test.ts`, `tests/settings.test.ts`

**Interfaces:**

- Consumes: current `UserSettings`, `getUserSettings`, `saveUserSettings` and `ClientProfileDensity` behavior.
- Produces: `getUserPreferencesForWorkspace()`, `updateUserPreferencesForWorkspace(input)`, `UserPreferencesDTO`.

- [ ] **Step 1: Napsat failing migration and DAL contract.** Ověřit composite key, volume/density checks, self-only RLS read/write a odmítnutí cizího `user_id`/`workspace_id`.
- [ ] **Step 2: Ověřit RED.** Spustit `npm test -- tests/user-preferences-contract.test.ts`; test musí selhat před novou tabulkou/DAL.
- [ ] **Step 3: Vygenerovat a lokálně replayovat migraci.** Použít `npx supabase migration new user_preferences`, `supabase db reset`, `supabase migration list --local` a `supabase db diff --local`.
- [ ] **Step 4: Implementovat server DAL/action.** Context se odvodí z authenticated session. Input z browseru obsahuje pouze nastavitelné hodnoty, nikoli identity nebo workspace authority.
- [ ] **Step 5: Převést Settings UI.** Načíst preference po přihlášení, ukládat přes server action a zobrazit pravdivé `saved on this account`. Hlasitost a density přežijí reload, logout/login i jiný browser.
- [ ] **Step 6: Odstranit localStorage jako authority.** `src/lib/settings.ts` nesmí být zdrojem pravdy. Krátkodobý migration fallback může načíst starou lokální hodnotu pouze jednou a explicitně ji odeslat na server; po úspěchu se lokální klíč odstraní.
- [ ] **Step 7: Ověřit GREEN.** Focused tests, typecheck, browser persistence a negativní role/workspace scénáře.
- [ ] **Step 8: Commit.**

```powershell
git add supabase/migrations src/lib/supabase/types.ts src/lib/dal/userPreferences.ts src/app/actions/userPreferences.ts src/lib/settings.ts src/app/settings/page.tsx src/components/workspace/ClientProfileCard.tsx src/components/workspace/clientProfileDensity.ts tests/user-preferences-contract.test.ts tests/settings.test.ts
git commit -m "feat: persist user preferences server-side"
```

---

## Task 6: Server-side Saved Views

**Files:**

- Create: migration generated by `npx supabase migration new saved_views`
- Modify: `src/lib/supabase/types.ts`
- Create: `src/lib/dal/savedViews.ts`
- Create: `src/app/actions/savedViews.ts`
- Modify: `src/components/views/FilterEngineBar.tsx`
- Test: `tests/saved-views-contract.test.ts`

**Interfaces:**

- Consumes: `SavedView`, `ActiveFilter`, `DEFAULT_SAVED_VIEWS` and current local persistence behavior.
- Produces: `listSavedViewsForWorkspace()`, `createSavedView(input)`, `deleteSavedView(id)` with user ownership.

- [ ] **Step 1: Napsat failing contract.** Ověřit CRUD pouze pro vlastní views, validaci operators/field keys, limit délky názvu a odmítnutí neplatného JSON shape.
- [ ] **Step 2: Ověřit RED.** Spustit `npm test -- tests/saved-views-contract.test.ts`.
- [ ] **Step 3: Vygenerovat migration a RLS.** Tabulka bude workspace/user scoped, RLS self-owned, grants explicitní; žádný týmový share v první implementaci.
- [ ] **Step 4: Implementovat DAL/actions.** Validovat schema filtrů proti povolenému modelu; při mazání ověřit ownera a idempotentní success pro již smazaný view řešit jasným výsledkem.
- [ ] **Step 5: Převést komponentu.** Inicializovat views ze serveru, saving/deleting přes actions, zobrazit loading/error a zachovat default views jako server-side seed nebo bezpečný fallback bez lokální autority.
- [ ] **Step 6: Ověřit GREEN a persistence.** Testy, reload, logout/login, druhý browser a kontrola cross-user izolace.
- [ ] **Step 7: Commit.**

```powershell
git add supabase/migrations src/lib/supabase/types.ts src/lib/dal/savedViews.ts src/app/actions/savedViews.ts src/components/views/FilterEngineBar.tsx tests/saved-views-contract.test.ts
git commit -m "feat: persist saved views server-side"
```

---

## Task 7: Udělat blueprint state skutečně server-authoritative

**Files:**

- Modify: `src/lib/blueprints/engine.ts`
- Modify: `src/components/blueprints/BlueprintPickerModal.tsx`
- Modify: `src/app/actions/blueprints.ts` pro stabilní server read result
- Modify: `tests/blueprint-apply.test.ts`
- Test: blueprint server read-back and cross-browser behavior

**Interfaces:**

- Consumes: `applyBlueprintAction`, `getActiveBlueprintAction`, `workspace_blueprint_state`.
- Produces: client state hydratovaný ze serveru bez lokální volby, která by mohla přepsat workspace.

- [ ] **Step 1: Napsat failing test.** Simulovat starý lokální blueprint odlišný od serveru a ověřit, že po server hydration vyhraje server.
- [ ] **Step 2: Ověřit RED.** Spustit `npm test -- tests/blueprint-apply.test.ts`.
- [ ] **Step 3: Změnit hydration.** `BlueprintEngine` nesmí číst starý `countdown_active_blueprint` jako zdroj pravdy; server response určí aktivní blueprint.
- [ ] **Step 4: Zachovat bezpečnou UX.** Dokud server neodpoví, picker zobrazí loading nebo známý bezpečný default, ale nesmí aplikovat změnu bez potvrzení serveru.
- [ ] **Step 5: Odstranit lokální zápis.** Po úspěšné serverové změně není nutné zapisovat blueprint do localStorage; pokud zůstane cache, musí být označená jako neautoritativní a invalidovaná při hydration.
- [ ] **Step 6: Ověřit GREEN, reload a druhý browser.**
- [ ] **Step 7: Commit.**

```powershell
git add src/lib/blueprints/engine.ts src/components/blueprints/BlueprintPickerModal.tsx src/app/actions/blueprints.ts tests/blueprint-apply.test.ts
git commit -m "refactor: make blueprint state server authoritative"
```

---

## Task 8: Rozdělit Settings podle role

**Files:**

- Create: `src/app/my-settings/page.tsx`
- Create: `src/app/team/settings/page.tsx` pro Team Leader/Admin provozní settings
- Modify: `src/app/settings/page.tsx`
- Create: `src/components/settings/MySettingsPanel.tsx`
- Create: `src/components/settings/TeamOperationsSettings.tsx`
- Modify: `src/components/settings/TelephonyAdapterSettings.tsx`
- Modify: `src/components/settings/QueuePolicySettings.tsx`
- Modify: `src/lib/auth/roles.ts` pro sdílený route-level role guard
- Test: `tests/settings-role-boundary.test.ts`, browser role matrix

**Interfaces:**

- Consumes: user preferences, telephony adapter, wallet/schema/script visibility and existing role guards.
- Produces: oddělené plochy `My Settings`, `Team Operations` a `Workspace/Admin Settings` s route-level server guardem.

- [ ] **Step 1: Napsat failing boundary test.** Operator vidí pouze My Settings, Team Leader vidí My Settings + Team Operations, Admin vidí vše; přímá URL nesmí boundary obejít.
- [ ] **Step 2: Ověřit RED.** Spustit `npm test -- tests/settings-role-boundary.test.ts`.
- [ ] **Step 3: Přesunout osobní settings.** Audio, density, default page a notifications patří do `My Settings`; server načte identity a preferences.
- [ ] **Step 4: Přesunout provozní settings.** Team Operations bude připravené pro Exception Queue, review a směny, ale nedostane admin-only controls.
- [ ] **Step 5: Zjednodušit Admin Settings.** Telephony, workspace schema/scripts a později Users & Permissions zůstanou admin-only. Pracovní dny/hodiny/svátky se nepřidají.
- [ ] **Step 6: Ověřit browser.** Přihlášený operator/TL/admin, direct URL, reload, navigation visibility a forbidden response.
- [ ] **Step 7: Commit.**

```powershell
git add src/app/my-settings src/app/team/settings src/app/settings/page.tsx src/components/settings src/lib/auth/roles.ts tests/settings-role-boundary.test.ts
git commit -m "feat: split role-aware settings surfaces"
```

---

## Task 9: Role-aware plochy a Attention Layer

**Files:**

- Modify: `src/app/page.tsx`
- Modify: `src/app/workspace/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/RoleAwareAttentionLayer.tsx`
- Modify: Exception Queue, Conversation Brief, Daily Brief a Operator Next Action surfaces
- Test: `tests/role-aware-surfaces.test.ts`, `tests/navigation-role-boundary.test.ts`

**Interfaces:**

- Consumes: role identity, Conversation Brief, Exception Queue and operator presence.
- Produces: operator-first Console, TL-first exceptions/brief a admin-first workspace health bez obecného dashboardu jako výchozí práce.

- [ ] **Step 1: Napsat failing UI contracts.** Assert operator default landing `/workspace`, Team Leader exception path and Admin readiness path; hidden nav items must not be security boundary.
- [ ] **Step 2: Ověřit RED.** Spustit focused tests.
- [ ] **Step 3: Implementovat server-aware landing.** Role se bere z authenticated server identity, ne z localStorage ani URL.
- [ ] **Step 4: Zúžit navigaci podle práce.** Operator vidí Console/Calendar/Orders/Wallet/Products/Call Logs/My Settings; TL dostane Exception Queue/Review/Team Operations; Admin dostane Workspace/Admin/Users & Permissions.
- [ ] **Step 5: Přidat Attention Layer.** Operátor: další akce u klienta. TL: týmové výjimky a review. Admin: readiness a blocking configuration. Žádný falešný ticking monitor.
- [ ] **Step 6: Ověřit browser a direct URLs.**
- [ ] **Step 7: Commit.**

```powershell
git add src/app src/components/layout tests/role-aware-surfaces.test.ts tests/navigation-role-boundary.test.ts
git commit -m "feat: add role-aware surfaces and attention layer"
```

---

## Task 10: Workspace Readiness

**Files:**

- Create: `src/lib/dal/workspaceReadiness.ts`
- Create: `src/app/actions/workspaceReadiness.ts`
- Create: `src/app/readiness/page.tsx`
- Create: `src/components/readiness/WorkspaceReadinessPanel.tsx`
- Modify: admin landing/attention layer
- Test: `tests/workspace-readiness-contract.test.ts`

**Interfaces:**

- Consumes: telephony/local SIP status, webhook/integration status, migration evidence, RLS/role checks, published scripts, queue, callback, calendar, wallet and recent critical errors.
- Produces: `getWorkspaceReadiness(): Promise<WorkspaceReadinessDTO>` with per-check `ready | needs_attention | blocked`, explanation and evidence timestamp.

- [ ] **Step 1: Napsat failing contract.** Assert no check reports `ready` without positive evidence; missing runtime source becomes `needs_attention` or `blocked`, never fabricated success.
- [ ] **Step 2: Ověřit RED.** Spustit `npm test -- tests/workspace-readiness-contract.test.ts`.
- [ ] **Step 3: Implementovat check boundaries.** Reuse existing DAL, do not shell out to run migrations from a request. Migration status comes from safe recorded deployment evidence or a controlled server source.
- [ ] **Step 4: Implementovat admin UI.** Každý blocker má text „co to znamená“ a konkrétní další akci; Telnyx zůstane blocked kvůli externímu ověření čísla.
- [ ] **Step 5: Ověřit failure isolation.** Chyba Wallet nesmí skrýt telefonii nebo queue. Check list musí ukázat dostupné části i částečné selhání.
- [ ] **Step 6: Ověřit GREEN/browser.** Admin, TL a operator access; admin readiness reload; sandbox evidence.
- [ ] **Step 7: Commit.**

```powershell
git add src/lib/dal/workspaceReadiness.ts src/app/actions/workspaceReadiness.ts src/app/readiness src/components/readiness src/app src/components tests/workspace-readiness-contract.test.ts
git commit -m "feat: add workspace readiness checks"
```

---

## Task 11: Team Leader Review reálných hovorů a auditní kontext

**Files:**

- Create: migration generated by `npx supabase migration new call_reviews`
- Modify: `src/lib/supabase/types.ts`
- Create: `src/lib/dal/callReviews.ts`
- Create: `src/app/actions/callReviews.ts`
- Create: `src/app/reviews/page.tsx` pro review reálných hovorů; `/training/reviews` zůstává oddělené
- Create: `src/components/reviews/CallReviewPanel.tsx`
- Modify: `src/lib/dal/audit.ts`
- Modify: `src/app/audit/page.tsx`
- Test: `tests/call-reviews-contract.test.ts`, `tests/audit-context.test.ts`

**Interfaces:**

- Consumes: call session, outcome, used Product Script version, post-call data, Team Leader role/team boundary.
- Produces: one review per eligible call, manual coaching notes, review status and audit entries with previous/new state/entity context.

- [ ] **Step 1: Napsat failing migration/UI contracts.** Assert unique review per call/reviewer policy, rating bounds, workspace/team access and no AI verdict without human action.
- [ ] **Step 2: Ověřit RED.** Run focused tests.
- [ ] **Step 3: Create migration through CLI.** Add call review table, RLS, grants and indexes only after local contract test is red.
- [ ] **Step 4: Implement DAL/actions.** Review writes require TL/admin role and allowed team/call scope. Review completion is idempotent and auditable.
- [ ] **Step 5: Extend audit context.** Store action, actor, entity, previous state, new state and reason where available; do not expose unrelated private data.
- [ ] **Step 6: Separate real-call review from `/training/reviews`.** Labels must state that training simulation review and real call review are different surfaces.
- [ ] **Step 7: Verify roles, reload and read-back.**
- [ ] **Step 8: Commit.**

```powershell
git add supabase/migrations src/lib/supabase/types.ts src/lib/dal/callReviews.ts src/app/actions/callReviews.ts src/app src/components/reviews src/lib/dal/audit.ts tests/call-reviews-contract.test.ts tests/audit-context.test.ts
git commit -m "feat: add real call review and audit context"
```

---

## Task 12: Users & Permissions admin page

**Files:**

- Create: migration generated by `npx supabase migration new users_and_teams`
- Modify: `src/lib/supabase/types.ts`
- Create: `src/lib/dal/usersPermissions.ts`
- Create: `src/app/actions/usersPermissions.ts`
- Create: `src/app/users/page.tsx`
- Create: `src/components/users/UsersPermissionsPanel.tsx`
- Create: `src/components/users/UserInviteForm.tsx`
- Create: `src/components/users/TeamManagementPanel.tsx`
- Modify: sidebar/admin navigation
- Test: `tests/users-permissions-contract.test.ts`, role/RLS integration tests

**Interfaces:**

- Consumes: authenticated profiles, `workspace_members`, role guard and audit DAL.
- Produces: admin-only `listWorkspaceUsers`, `inviteWorkspaceUser`, `updateWorkspaceMemberRole`, `deactivateWorkspaceUser`, `createWorkspaceTeam`, `assignTeamMember`.

- [ ] **Step 1: Napsat failing security contract.** Assert only admin can invite/change roles/deactivate/manage team structure; TL can see only explicitly allowed team data; operator cannot access route/action.
- [ ] **Step 2: Ověřit RED.** Spustit `npm test -- tests/users-permissions-contract.test.ts`.
- [ ] **Step 3: Modelovat explicitní team boundary.** Pokud schema nemá team mapping, vytvořit `workspace_teams` a `workspace_team_members`; TL scope se nesmí odvozovat pouze z toho, komu byl lead přidělen.
- [ ] **Step 4: Implementovat safe invite flow.** Výchozí role musí být allowlisted a nikdy nesmí být převzata z user-editable metadata. Přidání člena a případné Auth invite chování musí být server-side a auditované.
- [ ] **Step 5: Implementovat deactivation.** Deaktivace nesmí mazat historická data; musí bezpečně řešit active membership, session/access policy a queue leases podle existujícího recovery kontraktu.
- [ ] **Step 6: Implementovat UI `/users`.** Samostatná admin stránka s přehledem členů, role, statusu, týmu, akcí a potvrzením nevratných/impactful změn.
- [ ] **Step 7: Ověřit RLS a browser matrix.** Admin positive, TL/operator forbidden, cizí workspace forbidden, audit read-back.
- [ ] **Step 8: Commit.**

```powershell
git add supabase/migrations src/lib/supabase/types.ts src/lib/dal/usersPermissions.ts src/app/actions/usersPermissions.ts src/app/users src/components/users src/components/layout tests/users-permissions-contract.test.ts
git commit -m "feat: add users and permissions administration"
```

---

## Task 13: Shift calendar data model a read-only rozvrh

**Files:**

- Create: migration generated by `npx supabase migration new shift_calendar`
- Modify: `src/lib/supabase/types.ts`
- Create: `src/lib/dal/shifts.ts`
- Create: `src/app/actions/shifts.ts`
- Modify: `src/app/calendar/page.tsx`
- Modify: `src/components/calendar/OperatorCalendar.tsx`
- Create: `src/components/calendar/ShiftSchedule.tsx`
- Test: `tests/shift-calendar-contract.test.ts`

**Interfaces:**

- Consumes: Users & Permissions team boundary, profiles/memberships and existing calendar/reminder read model.
- Produces: `listMyShiftAssignments(range)`, `listTeamShiftAssignments(range)` and stable DTOs separating shifts, reminders, absences and overtime.

- [ ] **Step 1: Napsat failing schema contract.** Assert template/assignment tables, timezone-aware timestamps, no invalid ranges, workspace FKs, immutable historical identifiers, RLS and indexes by workspace/user/time.
- [ ] **Step 2: Ověřit RED.** Spustit `npm test -- tests/shift-calendar-contract.test.ts`.
- [ ] **Step 3: Vygenerovat migration přes CLI.** Add tables, constraints and policies; do not add separate `work_days`, `working_hours` or `holidays` settings.
- [ ] **Step 4: Implementovat read DAL.** Operator sees own schedule; TL sees explicitly managed team; admin sees workspace. Use the authenticated workspace context and explicit team mapping.
- [ ] **Step 5: Extend `/calendar`.** Operator gets a detailed daily/weekly schedule view. Existing personal reminders remain a separate layer and do not disappear when another source fails.
- [ ] **Step 6: Verify reload and RLS.** Test operator/TL/admin, date range boundaries, timezone display and cross-workspace isolation.
- [ ] **Step 7: Commit.**

```powershell
git add supabase/migrations src/lib/supabase/types.ts src/lib/dal/shifts.ts src/app/actions/shifts.ts src/app/calendar/page.tsx src/components/calendar tests/shift-calendar-contract.test.ts
git commit -m "feat: add shift calendar data model"
```

---

## Task 14: Shift management, absence and overtime workflows

**Files:**

- Create: migration generated by `npx supabase migration new shift_operations`
- Modify: `src/lib/supabase/types.ts`
- Modify: `src/lib/dal/shifts.ts`
- Modify: `src/app/actions/shifts.ts`
- Create: `src/components/calendar/ShiftEditor.tsx`
- Create: `src/components/calendar/AbsenceRequestPanel.tsx`
- Create: `src/components/calendar/OvertimeApprovalPanel.tsx`
- Modify: `src/app/calendar/page.tsx`
- Modify: audit DAL and relevant admin/TL surfaces
- Test: `tests/shift-operations-contract.test.ts`

**Interfaces:**

- Consumes: shift read model, explicit teams, admin/TL role boundaries.
- Produces: `createShift`, `updateShift`, `cancelShift`, `requestAbsence`, `approveAbsence`, `requestOvertime`, `approveOvertime`, `rejectOvertime`.

- [ ] **Step 1: Napsat failing workflow contract.** Assert only admin/TL with explicit team scope can manage shifts; operator can submit allowed absence/overtime request but cannot approve; admin/TL approval writes audit.
- [ ] **Step 2: Ověřit RED.** Spustit `npm test -- tests/shift-operations-contract.test.ts`.
- [ ] **Step 3: Add constraints.** Server rejects `ends_at <= starts_at`, overlapping active shifts, conflicting approved absence, invalid approval actor and cross-workspace IDs. Past approved records are not silently overwritten.
- [ ] **Step 4: Implementovat shift editor.** Admin/TL select team/member, date, time, timezone, optional template and reason. Changes return saved server state.
- [ ] **Step 5: Implementovat absence workflow.** Operator creates request or reports absence according to policy; TL/admin approves/rejects with status, reason and timestamp.
- [ ] **Step 6: Implementovat overtime workflow.** Request/record includes interval, reason, actor, approval state and approved-by metadata. No automatic payroll claim is fabricated.
- [ ] **Step 7: Verify UI and database.** Browser flow for each role, reload, conflict error, audit read-back, local migration replay and linked dry-run.
- [ ] **Step 8: Commit.**

```powershell
git add supabase/migrations src/lib/supabase/types.ts src/lib/dal/shifts.ts src/app/actions/shifts.ts src/components/calendar src/app/calendar/page.tsx src/lib/dal/audit.ts tests/shift-operations-contract.test.ts
git commit -m "feat: add shift management workflows"
```

---

## Task 15: Napojit směnový kalendář na presence a queue

**Files:**

- Modify: `src/lib/dal/leadQueue.ts`
- Modify: `src/app/actions/leadQueue.ts`
- Modify: `src/lib/dal/workspace.ts` nebo presence DAL podle existující boundary
- Modify: sidebar status/presence components
- Modify: `src/lib/dal/workspaceReadiness.ts`
- Modify: Exception Queue and Admin/TL surfaces
- Test: `tests/shift-presence-queue-contract.test.ts`, existing lead queue/presence tests

**Interfaces:**

- Consumes: approved/current shift, absence/overtime status, `operator_presence` and team mapping.
- Produces: honest schedule-aware context without turning schedule into automatic live presence.

- [ ] **Step 1: Napsat failing contract.** Assert a scheduled operator is not automatically `Ready`; off-shift presence is represented honestly; queue assignment honors approved absence without deleting data.
- [ ] **Step 2: Ověřit RED.** Run `npm test -- tests/shift-presence-queue-contract.test.ts tests/lead-queue-contract.test.ts`.
- [ ] **Step 3: Implementovat derived context.** Add server-side helper returning scheduled/absent/overtime/current presence separately. Keep `Ready`, `In call`, `Break` as live states.
- [ ] **Step 4: Integrate safe queue behavior.** Queue uses approved absence while preserving the current one-active-lead workflow; recovery remains auditable. No silent reassignment solely because a browser tab is closed.
- [ ] **Step 5: Update UI/status labels.** Sidebar and readiness distinguish `Scheduled`, `Absent`, `Overtime`, `Ready`, `In call`, `Break` and `Unavailable`.
- [ ] **Step 6: Verify concurrency and reload.** Two operators, TL/admin schedule edit, presence heartbeat, queue claim/recovery, and cross-workspace checks.
- [ ] **Step 7: Commit.**

```powershell
git add src/lib/dal/leadQueue.ts src/app/actions/leadQueue.ts src/lib/dal src/components src/app tests/shift-presence-queue-contract.test.ts tests/lead-queue-contract.test.ts
git commit -m "feat: connect schedule with presence and queue"
```

---

## Task 16: Finální evidence, review a release gate

**Files:**

- Create: `docs/superpowers/reports/2026-09-05-p1-p5-settings-shifts-verification.md`
- Modify: `docs/AKTUALNI_STAV_A_DESATERO.md`
- Modify: `PROJECT.md`
- Test: full repository and target-environment verification

**Interfaces:**

- Consumes: all commits and evidence from Tasks 0–15.
- Produces: honest pilot decision with explicit remaining blockers.

- [ ] **Step 1: Repository evidence.** Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`; record exact counts and exit codes.
- [ ] **Step 2: Local Supabase evidence.** Run local reset/list/diff, inspect all new tables/grants/RLS and execute role/workspace database tests. No tests may rely on demo auth as a substitute for linked evidence.
- [ ] **Step 3: Linked sandbox evidence.** Run migration list, dry-run, schema diff, advisors, authenticated operator/TL/admin flows, reload persistence and SQL read-back. Verify Local SIP remains local-only and Telnyx blocked.
- [ ] **Step 4: Production evidence.** Separately record production migration/schema status. If production rollout was not explicitly approved or cannot be verified, mark it `blocked`; do not imply parity.
- [ ] **Step 5: Browser matrix.** Verify operator, Team Leader and administrator for Settings, Conversation Brief, wrap-up, Exception Queue, Readiness, Review, Users & Permissions and Calendar. Test direct URL, unauthorized access, reload and failure isolation.
- [ ] **Step 6: Security review.** Check no browser bundle contains service/secret keys, no RLS policy relies on user-editable metadata, all UPDATE policies have SELECT + USING + WITH CHECK as applicable, and all admin actions audit actor/target/change.
- [ ] **Step 7: Update status docs.** Mark only genuinely verified items complete; keep Telnyx/Gemini and any production migration blocker explicit.
- [ ] **Step 8: Commit.**

```powershell
git add docs/superpowers/reports/2026-09-05-p1-p5-settings-shifts-verification.md docs/AKTUALNI_STAV_A_DESATERO.md PROJECT.md
git commit -m "docs: record p1-p5 verification evidence"
```

---

## 4. Pozdější práce mimo tento plán

### Telnyx

Po dokončení předchozích vrstev a externím ověření čísla:

- refundace nevhodného čísla,
- ověřené číslo odpovídající skutečné adrese,
- voice connection,
- serverové `TELNYX_*` secrets,
- veřejný podepsaný webhook,
- autentizovaný outbound browser test,
- lifecycle/read-back a negativní role/workspace scénáře.

### Gemini

Až po stabilizaci živé/validované telefonie:

- bezpečný zdroj audio streamu/nahrávky,
- serverová transcription boundary,
- retention a přístupová práva,
- editovatelný návrh verdiktu a poznámky,
- žádný automatický verdikt bez lidského potvrzení.

---

## 5. Finální release checklist

- [ ] P1 migration/runtime evidence je doložená zvlášť pro repo, sandbox a production.
- [ ] Post-call wrap-up je idempotentní a reload zachová serverový výsledek.
- [ ] Conversation Brief používá pouze skutečná data a bezpečně označuje chybějící kontext.
- [ ] Současná serverem řízená lead queue zůstává bez nefunkčních alternativních strategií a bez konfigurovatelného počtu souběžných leadů.
- [x] Exception Queue má konkrétní důvod, prioritu, vlastníka/cíl a bezpečné auditované resolution; linked nasazení se sleduje zvlášť.
- [ ] Osobní preference a Saved Views přežijí reload, logout/login a změnu browseru.
- [ ] `localStorage` není autoritou pro žádné trvalé workspace/user nastavení; lokální drafty jsou výslovně označené.
- [ ] Role-aware Settings a navigace neslouží jako jediná bezpečnostní hranice; server/RLS odmítá přímé URL i action request.
- [ ] Workspace Readiness nepíše falešné `Ready` bez evidence.
- [ ] Reálné call review je oddělené od training review a audit obsahuje kontext změny.
- [ ] `/users` je admin-only, TL scope je explicitní a deaktivace nemaže historická data.
- [ ] Směnový kalendář je jediný zdroj směn, plánované dostupnosti, absence a přesčasů; pracovní hodiny/svátky nejsou paralelní settings.
- [ ] Operátor vidí detailní vlastní rozvrh; TL/admin mohou nastavovat směny podle role/team boundary.
- [ ] Schedule, absence, overtime a live presence jsou v UI zřetelně odlišené.
- [ ] Local SIP zůstává localhost-only validační cesta a Telnyx/Gemini claims zůstávají pravdivě označené.
- [ ] Full test, lint, typecheck, build, migration checks, RLS checks, browser matrix a audit read-back mají uloženou evidenci.
