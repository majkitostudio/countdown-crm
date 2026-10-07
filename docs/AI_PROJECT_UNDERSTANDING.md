# Countdown CRM — AI Project Understanding

> Vytvořeno: 2026-09-28  
> Autor: AI agent (initial audit)  
> Stav: První verze po systematickém průzkumu projektu

---

## 1. Executive Summary

**Countdown CRM** je specializovaný, komplexní all-in-one CRM systém vytvořený na míru pro **telemarketingové call centrum** prodávající **doplňky stravy**.

Není to generický CRM produkt. Je to provozní nástroj, který propojuje:
- evidenci leadů a zákazníků,
- telefonní procesy (hovory, výsledky, callbacky),
- objednávkový tok,
- týmové řízení a výjimky,
- kontrolu kvality hovorů s AI asistencí,
- onboardingový trénink operátorů,
- reporting a analytiku,
- administraci workspace, uživatelů a skriptů.

**Pro koho:** Operátoři, Team Leadeři, Administrátoři v telemarketingovém call centru.

**Hlavní hodnota:** Propojit celý každodenní provoz call centra do jednoho pravdivého a použitelného systému. Produktový cíl je systém za ~200 000 Kč, který zkracuje ruční práci, zachovává auditní stopu a je spolehlivý v každodenním provozu.

**Dlouhodobá vize:** Kompletní, stabilní a auditovatelný CRM pro call centrum, kde každá role má jasný pracovní prostor a AI pomáhá s kontextem, tréninkem a kontrolou kvality — ale nikdy nepřepisuje pravdivý stav hovorů, objednávek nebo oprávnění bez explicitního rozhodnutí.

---

## 2. Product Vision

**DOCUMENTED** (ze `docs/PRODUCT_VISION.md`, `START_HERE.md`, `README.md`)

### Aktuální stav vs. vize

Projekt má rozsáhlý funkční základ, ale **produktový audit teprve probíhá** — prioritou je validace use-usefulness (zda systém skutečně použitelný pro konkrétní call centrum), nikoli přidávání nových funkcí.

### Produktové oblasti (vize)

| Oblast | Popis |
|---|---|
| Leads a zákazníci | Evidence, kontext, historie, segmentace |
| Calls a telephony | Telefonní proces, call session, výsledek, návazné kroky |
| Products a orders | Katalog doplňků stravy, objednávky, prodejní tok |
| Operator Console | Pracovní plocha pro aktuální hovor — `/workspace` |
| Team Operations | Fronty, výjimky, pomoc operátorům, týmový dohled |
| Quality a coaching | Hodnocení hovorů, zpětná vazba, AI quality review |
| Training | Onboarding a průběžný nácvik schválených scénářů |
| Analytics a reporting | Výkon, konverze, výsledky, provozní přehled |
| Administration | Workspace, uživatelé, role, skripty, nastavení |

### Role AI v produktu

**DOCUMENTED** AI pomáhá ve třech oblastech:
1. **Kvalita hovoru** — Gemini hodnotí hovory po skončení (deterministická + AI analýza)
2. **Trénink operátorů** — AI zákazník pro nácvik prodejních scénářů (Gemini nebo OpenAI)
3. **Kontextová doporučení** — Next Best Action pro operátory (callbacks, reorders)

**Zásada:** AI asistence, nikoliv AI autorita. AI nesmí přepisovat pravdivý stav obchodních dat.

---

## 3. Current Product State

**INFERRED** (ze struktury kódu, migrací, testů, dokumentace)

### Co existuje a je implementováno

- **Operator Console** (`/workspace`) — kompletní, komplexní klientský komponent s lifecycle managementem hovorů, lead queue, callbacky, post-call workflow
- **Lead management** — CRUD, statuses, scoring, bulk import
- **Lead Queue** — přiřazování leadů operátorům, heartbeat, recovery mechanismy, callback routing
- **Call recording** — vytváření hovorů, atomické dokončení, idempotentní completion
- **Orders** — vytváření, položky, ceny, status history, delivery address snapshot
- **Products & Product Scripts** — katalog, verze skriptů, publikování
- **Telephony layer** — abstrakce adaptérů: `simulation`, `local_sip`, `telnyx` (Telnyx zatím blokovaný pending externího ověření čísla)
- **Team model** — týmy, memberships, Team Leader scope, historické snapshots
- **Team workspace checkpoint** — přehled operátorů, volání, objednávek, callbacků (dnes/týden/měsíc)
- **Exception queue** — výjimky Team Leadera
- **Call Quality Review** — deterministická + Gemini AI analýza kvality hovorů, async zpracování po response
- **Training** — nácvikové scénáře s AI zákazníkem, compliance kontrola, feedback
- **Wallet** — bonus systém, pravidla, transakce, zůstatky
- **Workflows** — engine pro pravidla Trigger→Action, zatím funkční jen pro `on_call_ended`
- **Saved Views** — uložené filtry
- **Custom Objects / Blueprints** — rozšiřitelný datový model
- **Workspace Readiness** — dashboard pro admin s kontrolami připravenosti systému
- **Audit log** — sledování kritických operací
- **RLS politiky** — Row-Level Security na všech citlivých tabulkách

### Co je rozpracované nebo částečné

- **Telnyx WebRTC** — infrastruktura existuje, ale Telnyx je v kódu `isTelnyxActivationBlocked()` === vždy `true`; čeká na externí ověření telefonu
- **Workflow triggers** — pouze `on_call_ended` funguje server-side; ostatní (`on_lead_status_changed`, `on_order_placed`, `on_lead_created`) jsou označeny jako `unavailable` bez event source
- **Workflow actions** — `send_webhook` funguje; ostatní akce jsou `unavailable` nebo simulace
- **Shift planning** — explicitně `unavailable` v `TeamWorkspaceCheckpoint.sources.shifts`
- **Analytics** — stránka existuje (`/analytics`), ale hloubka dat není ověřena
- **Monitor** (`/monitor`) — stránka existuje, obsah neznámý
- **Custom object page** — existuje `/objects/[slug]`, implementace přes Blueprint engine

### Co je plánované, ale neimplementováno

- Produkční Telnyx integrace (čeká na ověření čísla)
- Kompletní workflow akce (email, notify_manager, update_lead_status)
- Shift/směny management

### Známé problémy/omezení

- **Generovaný Supabase typ** je zastaralý — `db.ts` obsahuje komentář: *"currently narrows some mutation builders to `never`"* a obchází to castem
- **Telnyx permanentně blokovaný** — `isTelnyxActivationBlocked()` vždy vrací `true` bez ohledu na konfiguraci (kód: `return adapter === "telnyx"`)
- **Transcript** — pole je v datovém modelu, ale `WorkspaceContent` odesílá `transcript: null` při dokončení hovoru
- **ai_score** — je počítán deterministicky (bodovací algoritmus v `calculateAiLeadScore`), název "AI score" je zavádějící

---

## 4. Users & Roles

**FACT** (ze `src/lib/auth/roles.ts`, `src/lib/dal/workspace.ts`, `src/app/workspace/page.tsx`)

### Tři workspace role

| Role | DB hodnota | Popis |
|---|---|---|
| **Operator** | `operator` | Pracuje s leadem, hovorem, objednávkou, callbackem |
| **Team Leader** | `team_leader` | Řídí tým, výjimky, kvalitu, fronty, pomoc operátorům |
| **Administrator** | `administrator` | Spravuje workspace, uživatele, skripty, nastavení |

### Oprávnění

- **Operator** — čte leady, volá, zakládá objednávky, odesílá žádosti o pomoc
- **Team Leader** — vše co operator + spravuje leady, vidí team workspace, výjimky, schvaluje quality reviews
- **Administrator** — vše + správa uživatelů, workspace, skriptů, wallet, nastavení telefonie

### Demo mode

**FACT** — `isDemoAuthEnabled()` vrátí `true` pokud `NODE_ENV !== "production"` a `NEXT_PUBLIC_ALLOW_DEMO_AUTH === "true"`. V demo módu všechny requesty automaticky získají roli `administrator` a fixní workspace ID `00000000-0000-0000-0000-000000000001`.

---

## 5. Core Business Workflow

**FACT** (ze `src/app/workspace/page.tsx`, `src/lib/dal/leadQueue.ts`, `src/lib/dal/callCompletion.ts`)

### Primární workflow operátora

```
1. PŘIHLÁŠENÍ A INIT
   └── Operator Console načte: products, current lead assignment
   └── Pokud žádné přiřazení → setOperatorPresenceAction("available") → claimNextLeadAction()

2. PŘIŘAZENÍ LEADU
   └── Server přiřadí lead z fronty (lead_queue_items)
   └── State: "assigned" — heartbeat každých 30s pro udržení lease

3. ZAHÁJENÍ HOVORU
   └── startLeadCallAction() — server změní stav na "in_progress"
   └── Softphone: dial (simulation / local_sip / telnyx)
   └── State: "in_progress"

4. AKTIVNÍ HOVOR
   └── Operátor vede hovor dle skriptu
   └── Může: použít skript, vidět zákaznický kontext, timeline, notes

5. UKONČENÍ HOVORU
   └── endLeadCallAction() → state: "awaiting_outcome"

6. POST-CALL VÝBĚR VÝSLEDKU
   └── Operátor vybere outcome:
       - order_placed → zadá objednávku (produkty, množství, cena)
       - followup_scheduled → naplánuje callback
       - no_answer → hovor bez odpovědi
       - objection_handled → selhání prodeje (failReason povinný)

7. DOKONČENÍ (completeLeadCallAction)
   └── Atomická DB operace: complete_call_with_order_items_idempotent
       ├── Uloží hovor (calls)
       ├── Vytvoří objednávku s položkami (pokud order_placed)
       ├── Naplánuje callback (pokud followup_scheduled)
       └── Vrátí next_lead (automaticky další lead z fronty)
   └── Po response: workflow dispatch (on_call_ended)
   └── Po response: Gemini quality review (async, neblokuje)

8. POST-CALL SUMMARY
   └── Zobrazí výsledek, workflow execution log
   └── Automatické přiřazení dalšího leadu
```

### Vedlejší workflow

- **Callback management** — operátor vidí upcoming/overdue callbacky v Next Action panelu
- **Lead notes** — operátor může přidávat poznámky k leadu
- **Conversation brief** — kontextový souhrn zákazníka
- **Assistance request** — operátor může požádat Team Leadera o pomoc (help / SOS)
- **Quality review** — Team Leader vidí AI review hovorů, může přidávat komentáře

---

## 6. Business Rules

**FACT** (ověřeno v kódu)

### Lead lifecycle

| Status | Popis |
|---|---|
| `new` | Nový, dosud nekontaktovaný lead |
| `contacted` | Byl kontaktován, ale nevznikla objednávka |
| `qualified` | Projevil zájem, ale objednávka ještě není |
| `customer` | Vznikla objednávka |
| `unresponsive` | Nereaguje |

**Mutace:** Status se mění přes `update_lead_status_with_audit` (DB RPC s audit logem).

### Call outcomes

| Outcome (DB) | Completion outcome | Popis |
|---|---|---|
| `order_placed` | `order_placed` | Objednávka vznikla |
| `followup_scheduled` | `followup_scheduled` | Callback naplánován |
| `no_answer` | `no_answer` | Nikdo nezdvihl |
| `objection` | `objection_handled` | Prodej selhal |
| `completed` | — | Hovor bez výsledku (legacy/training) |

### Fail reasons (pro outcome `objection`)

- `price` — Cena
- `distrust` — Nedůvěra / pochybnosti
- `alternative_solution` — Zákazník má jiné řešení
- `health_concern` — Zdravotní překážka
- `no_interest` — Žádný zájem
- `needs_time` — Chce si rozmyslet
- `other` — Jiný důvod

**FACT:** Fail reason je povinný pokud outcome === `objection`. Validace probíhá jak na klientovi, tak server-side v `validateCallFailFields()`.

### Order rules

- Objednávka může mít max. 50 položek
- Každý produkt může být v objednávce pouze jednou
- Quantity: 1–1000
- Unit price: 0–1 000 000 000
- Objednávka vyžaduje alespoň jednu položku pokud outcome === `order_placed`
- **Idempotent:** `complete_call_with_order_items_idempotent` — retry-safe díky `call_session_id`

### Oprávnění (server-side)

**FACT:** `requireWorkspaceRole()` vynucuje roli na serveru pro každou DAL operaci. Nestačí skrýt UI.

- Leads CRUD: pouze `team_leader`, `administrator`
- Orders: operator smí vytvořit pouze pro aktuálně přiřazený lead
- Team workspace: pouze `team_leader`, `administrator`
- Lead notes: operator smí přidávat pouze ke svému aktuálně přiřazenému leadu
- Wallet management: `team_leader`, `administrator`
- Schema management: `team_leader`, `administrator`
- Workspace readiness: pouze `administrator`

### Lead Queue rules

- Každý lead má `lease_expires_at` — po expiraci může jiný operátor převzít lead
- Heartbeat každých 30s prodlužuje lease
- Recovery mechanismus pro případ pádu browseru nebo timeoutu

### Pricing / Wallet

- Wallet podporuje currency: `CZK`, `EUR`, `PLN`
- Bonus rules: minimum_order_amount + bonus_amount + effective_from
- Transakce: credits, debits, manual adjustments
- **Měsíční uzávěrka provizí:** Team Leader a Administrátor provádí uzávěrku za uzavřené měsíce přes `finalize_wallet_monthly_commission` nebo hromadně přes `finalize_workspace_monthly_settlement`.
- **Odečet vratek:** Celkový obrat operátora tvoří pouze `delivered` objednávky, od nichž se odečítají vratky `returned` (`net_delivered_total := greatest(delivered_total - returned_total, 0)`). Z čistého obratu se vypočte měsíční provize podle `monthly_commission_rate` a zapíše se auditovaná, idempotentní transakce.
- **Export podkladů pro mzdy:** Z panelu `/wallet` lze stáhnout kompletní mzdový přehled v CSV pro Microsoft Excel (s UTF-8 BOM): Operátor, počet doručených zásilek a vratek, celkový a čistý obrat, fixní bonusy za objednávky, procentuální provize, manuální úpravy a celková částka k výplatě včetně součtu za celý tým.

---

## 7. Technical Architecture

**FACT** (ověřeno v kódu)

### Stack

| Vrstva | Technologie |
|---|---|
| Frontend | Next.js 16.3.5, React 19, TypeScript |
| Styling | Tailwind CSS 4, tailwind-merge, clsx |
| Icons | lucide-react |
| Charts | recharts |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS + Functions) |
| ORM | Přímé Supabase JS SDK (bez Prisma) |
| AI | @google/genai (Gemini), openai (OpenAI) |
| Telephony | @telnyx/webrtc, sip.js |
| Testing | Vitest 4, jsdom, Playwright |

### Architektonická vrstva

```
Browser (React Client Components)
  │
  ├── Server Actions (src/app/actions/*.ts)
  │     └── "use server" direktivy
  │
  ├── DAL — Data Access Layer (src/lib/dal/*.ts)
  │     ├── import "server-only"
  │     ├── requireWorkspaceContext() / requireWorkspaceRole()
  │     └── Supabase queries
  │
  ├── Business logic libs (src/lib/*.ts)
  │     └── Typy, mapování, validace
  │
  └── Database (Supabase PostgreSQL)
        ├── RLS policies
        └── RPC functions (atomické operace)
```

**FACT:** DAL soubory mají `import "server-only"` — nelze je importovat do client components. Server Actions jsou jediná povolená brána z klienta na server.

### Routing (App Router)

| Route | Účel |
|---|---|
| `/` | Root redirect podle role |
| `/workspace` | Operator Console (hlavní pracovní plocha) |
| `/leads`, `/leads/[leadId]` | Seznam leadů + detail |
| `/calls` | Historie hovorů |
| `/calendar` | Kalendář a callbacky |
| `/products` | Katalog produktů |
| `/orders`, `/orders/[id]` | Objednávky |
| `/team` | Team workspace (TL/admin) |
| `/exceptions` | Exception queue (TL) |
| `/telephony` | Telefonie admin |
| `/training`, `/training/reviews` | Trénink operátorů |
| `/workflows` | Workflow pravidla |
| `/wallet` | Wallet a bonusy |
| `/dashboard` | Reporting dashboard |
| `/analytics` | Analytika |
| `/audit` | Audit log |
| `/settings` | Nastavení workspace |
| `/settings/users` | Správa uživatelů |
| `/settings/scripts` | Správa skriptů |
| `/objects/[slug]` | Custom objekty (Blueprint) |
| `/readiness` | Workspace readiness check |
| `/monitor` | Monitoring |
| `/login` | Přihlášení |

### Demo mode vs. Produkce

**FACT:** `isDemoAuthEnabled()` — aktivní pouze pokud `NODE_ENV !== "production"` a `NEXT_PUBLIC_ALLOW_DEMO_AUTH === "true"`. V demo mode jsou všechny autentizační a autorizační kontroly obcházeny (pevné userId, role administrator, demo workspace ID).

### Supabase specifika

- **Admin client** (`createAdminClient`) — používán pro operace po response (quality review), které vyžadují obejití RLS
- **Authenticated client** (`createClient`) — pro běžné DAL operace s RLS
- **RPC functions** — pro atomické operace (call completion, wallet adjustments, lead status update)

---

## 8. Data & Domain Model

**FACT** (ze Supabase migrací a DAL typů)

### Hlavní entity

| Entita | Popis |
|---|---|
| `workspaces` | Tenant unit — vše je scoped na workspace_id |
| `workspace_members` | Uživatelé workspace s rolí (operator/team_leader/administrator) |
| `profiles` | Profily uživatelů (full_name, email) |
| `leads` | Kontakty/zákazníci (full_name, phone, email, city, status, ai_score) |
| `calls` | Záznamy hovorů (outcome, transcript, duration, fail_reason, operator_note) |
| `orders` | Objednávky (total_amount, currency, status, items) |
| `order_items` | Položky objednávek (product_id, quantity, unit_price) |
| `products` | Katalog produktů (title, category, price, currency) |
| `product_scripts` | Skripty produktů (content, version) |
| `lead_queue_items` | Fronta přiřazení leadů operátorům |
| `operator_presence` | Přítomnost operátora (available/busy/offline) |
| `operator_reminders` | Připomínky (calendar entries) |
| `teams` | Týmy (slug, name) |
| `team_memberships` | Členství v týmu (user_id, team_id, role, active_from/until) |
| `call_quality_reviews` | AI review kvality hovorů |
| `training_sessions` | Tréninkové session |
| `audit_logs` | Audit trail kritických operací |
| `workflow_rules` | Pravidla workflow automace |
| `workflow_executions` | Log spuštění workflow |
| `wallet_settings` | Wallet konfigurace (currency, commission_rate) |
| `wallet_bonus_rules` | Bonusová pravidla |
| `wallet_transactions` | Peněžní pohyby |
| `telephony_settings` | Nastavení telefonie per workspace |
| `telephony_call_sessions` | Záznamy telefonních sessions |
| `custom_objects` | Custom datové objekty (Blueprint) |
| `attribute_definitions` | Definice atributů custom objektů |
| `record_entities` | Instance custom objektů |
| `record_values` | Hodnoty atributů |
| `lead_notes` | Poznámky k leadům |
| `exception_queue` | Výjimkové případy (TL queue) |
| `assistance_requests` | Žádosti operátorů o pomoc |
| `workspace_saved_views` | Uložené filtry/pohledy |

### Team model

**FACT** — `leads` a `calls` mají `team_id` pro izolaci dat v rámci týmů. `team_memberships` má `active_from`/`active_until` pro historické snapshots.

---

## 9. AI Architecture

**FACT** (ze `src/lib/ai/`, `src/lib/dal/callQualityReviews.ts`, `src/lib/training.ts`)

### Gemini — Call Quality Review

**Implementováno a funkční (pokud je GEMINI_API_KEY nastavený)**

- Po každém dokončeném hovoru se asynchronně (přes Next.js `after()`) spustí Gemini analýza
- Input: transcript, operator note, duration, outcome, fail_reason
- Output: `recommendation` (ok/review), `missing_sections`, `reasons`, `confidence`
- Fallback: deterministická analýza (délka hovoru, absence note, atd.) kombinovaná s Gemini výsledkem
- Model: `GEMINI_QUALITY_MODEL` env (default: `gemini-3.6-flash`)
- Timeout: 8 sekund
- Claim token: race condition protection pro multi-instance deploy

### AI Training (Gemini nebo OpenAI)

**Implementováno** — simuluje AI zákazníka pro trénink operátorů

- Provider: `TRAINING_AI_PROVIDER` env (default: `gemini`)
- Gemini model: `GEMINI_ROLEPLAY_MODEL` + `GEMINI_FEEDBACK_MODEL`
- OpenAI model: `OPENAI_TRAINING_MODEL` (default: `gpt-5.4-mini`)
- Compliance check: deterministická analýza textu operátora (regex patterns)

### Custom Object AI attributes

**INFERRED** — `attribute_definitions` má sloupce `is_ai`, `ai_prompt`, `ai_config` — připraveno pro AI-generované hodnoty atributů, trigger: `on_call_end`. Produkční implementace není ověřena.

### Workflow AI action

- `compute_ai_summary` — označena jako `unavailable` v ACTION_REGISTRY (čeká na verified AI provider)

---

## 10. Testing

**FACT** (z `tests/` adresáře a `vitest.config.mts`)

### Přehled

- **147 testovacích souborů** v `tests/` adresáři
- **Framework:** Vitest 4, environment: `node`
- **E2E/Integration:** Playwright je v devDependencies, ale E2E testy nebyly nalezeny v `tests/` — lze testovat browser průchodem manuálně
- **SQL testy:** `supabase/tests/database/` — 11 PostgreSQL testů (pgTAP)

### Pokrytí (z názvů test souborů)

| Oblast | Příklady testů |
|---|---|
| Auth/Role | `login-role-entry`, `role-aware-navigation`, `role-aware-page-authorization`, `schema-role-boundary` |
| Lead Queue | `lead-queue-contract`, `lead-note-assignment-guard` |
| Call workflow | `calls-fail-contract`, `post-call-fail`, `post-call-wrap-up-contract`, `post-call-completion-runtime`, `call-start-timeout` |
| Orders | `order-delivery-address-contract`, `completion-currency-contract`, `call-order` |
| Team | `team-workspace-metrics`, `team-checkpoint-composition`, `team-scope-enforcement`, `team-historical-snapshots` |
| Telephony | `softphone-lifecycle`, `telnyx-lifecycle`, `telnyx-webhook-contract`, `local-sip-*` |
| Quality review | `call-quality-review`, `call-quality-review-runtime-contract` |
| AI/Training | `speech-recognition`, `training-api-routes` |
| Workflows | `workflow-truth-dispatch`, `workflow-authorization-contract` |
| Wallet | `wallet-contract`, `wallet-runtime` |
| Design system | `design-system-primitives`, `design-tokens` |
| RLS | `rls-policy-performance`, `direct-read-function-security` |
| Supabase | `supabase-provisioning-permissions`, `p0-3-remote-db-evidence` |

### DB testy (pgTAP)

- `rls_role_workspace_test` — RLS základní izolace
- `call_completion_rpc_authorization_test` — autorizace RPC
- `call_review_revisions_rls_test` — RLS pro review revize
- `privileged_rpc_boundary_test` — hranice privilegovaných RPC
- `rls_policy_performance_test` — výkon RLS politik
- `user_preferences_rls_test` — izolace user preferences
- `team_leader_exception_queue_rls_test` — RLS pro exception queue

### Mezery v coverage

**UNCERTAIN** — bez spuštění testů nelze určit, které testy procházejí a které selhávají. Playwright E2E testy pro browser průchod v `tests/` adresáři chybí (jsou v devDependencies, ale soubory nebyly nalezeny).

---

## 11. Documentation State

### Aktuální a autoritativní dokumentace

| Soubor | Obsah |
|---|---|
| `README.md` | Technologický základ, lokální spuštění, routing přehled |
| `START_HERE.md` | Hlavní orientační dokument — kde projekt je a co se má dělat |
| `docs/PRODUCT_VISION.md` | Produktová identita, oblasti, role, principy |
| `docs/PROJECT_GUIDE.md` | Pracovní pravidla, bezpečnostní hranice, postup práce |
| `docs/HISTORY_COMPACT.md` | Kompaktní archiv historického vývoje |
| `docs/ai/AI_WORKLOG.md` | Stručný log AI práce |
| `docs/ai/AI_STUDIO_BASE_PROMPT.md` | Základní prompt pro AI Studio |
| `.env.example` | Dokumentace environment variables |

### Zastaralá dokumentace

**DOCUMENTED** — `docs/HISTORY_COMPACT.md` explicitně uvádí, že starší soubory byly sloučeny. Původní soubory ze `docs/superpowers/plans/`, `docs/superpowers/specs/`, `docs/superpowers/reports/`, `docs/checkpoints/` byly archivovány.

### Potenciální konflikty

- Soubory `countdown-crm-project-bundle-sanitized*.md` v root adresáři — jejich obsah a účel je nejasný (UNCERTAIN)
- Soubory `PROJECT.md`, `Review.md`, `design-qa.md` v root adresáři — obsah není znám, možná zastaralá dokumentace (UNCERTAIN)
- `CLAUDE.md` — odkaz na `@AGENTS.md` (soubor nebyl nalezen v repozitáři — UNCERTAIN)

---

## 12. Known Issues & Risks

### Confirmed Issues

1. **Telnyx blokovaný (Záměrně odložený Milník 3)** — `isTelnyxActivationBlocked()` vrací `true`.
   - Soubor: `src/lib/telephony/telephonyAdapterShared.ts`, řádek 17: `return adapter === "telnyx";`
   - Kontext: Na základě rozhodnutí PM z 7. října 2026 je Milník 3 (Live VoIP) pozastaven do neurčité budoucnosti kvůli absenci financí na nákup českého telefonního čísla a kreditu. Blokace je záměrná pojistka zabraňující neautorizovaným nákladům.

2. **Supabase generovaný typ zastaralý** — TypeScript typy pro DB jsou out-of-date, mutace builders vrací `never`.
   - Soubor: `src/lib/dal/db.ts`, komentář popisuje problém
   - Řešení: `as unknown as SupabaseClient` cast (technický dluh)

3. **Transcript se neposílá** — `completeCall` v `workspace/page.tsx` odesílá `transcript: null` vždy.
   - Dopad: AI quality review nemá přístup k transkriptu hovoru (degraduje kvalitu AI analýzy)

4. **ai_score není AI** — Název je zavádějící, jedná se o deterministický bodovací algoritmus.
   - Soubor: `src/lib/leads.ts`, funkce `calculateAiLeadScore()`

### Potential Risks

1. **Demo mode bezpečnost** — Demo auth bypass je podmíněn `NODE_ENV !== "production"`. Je nutné ověřit, že staging/preview prostředí mají správně nastavené `NODE_ENV=production`.

2. **Workflow dispatcher in-flight cache** — `inFlightEvents` Map je in-memory na jednom procesu. Multi-instance deploy bez sticky sessions může mít duplicitní workflow dispatch (cross-instance dedup je pouze DB-level).

3. **After() response handler** — `reviewCompletedCallForWorkspace` používá Next.js `after()` pro async AI review. Pokud Next.js process skončí před dokončením, review se nezpracuje (pending row zůstane).

4. **Custom object ai_config** — atributy mají `ai_prompt` a `contextSources: ["transcript", "leader_notes"]` v `schema.ts`, ale produkční zpracování (kdy a jak se volá AI) není v DAL vrstvě implementováno.

5. **Team Leader lead creation** — Team Leader musí vést přesně jeden aktivní tým pro vytvoření leadu. Pokud je Team Leader ve více týmech, `resolveLeadCreationTeam()` vyhodí FORBIDDEN chybu. Edge case.

6. **Lead queue heartbeat** — Pokud browser ztratí konektivitu, heartbeat selže a lease expiruje. Lead může být přiřazen jinému operátorovi. Recovery mechanismus existuje, ale edge cases nejsou plně otestovány.

7. **Hardcoded DEMO_WORKSPACE_ID** — UUID `00000000-0000-0000-0000-000000000001` — pokud demo data nejsou v DB, operace selžou bez jasné chybové zprávy.

### Uncertainties

1. **Stav testů** — Testy nebyly spuštěny. Nelze určit, kolik z 147 testů aktuálně prochází.

2. **Playwright / E2E testy** — Playwright je v devDependencies, ale E2E test soubory v `tests/` nebyly nalezeny. Možná jsou v jiném umístění nebo dosud neexistují.

3. **`countdown-crm-project-bundle-sanitized*.md`** — 5 bundle souborů v root adresáři — účel neznámý.

4. **`PROJECT.md`, `Review.md`, `design-qa.md`** — soubory v root adresáři, obsah neznámý, možná zastaralé.

5. **`/monitor` route** — stránka existuje, obsah a účel neznámý.

6. **Supabase migrations vs. live schema** — migrace jsou v repozitáři, ale není ověřeno, zda jsou aplikované na aktuální dev/prod databázi.

7. **Telnyx webhooks** — `telnyxWebhook.ts` existuje, ale produkční webhook endpoint a ověřovací logika nebyly podrobně auditovány.

---

## 13. Development Workflow

**DOCUMENTED + FACT** (ze `docs/PROJECT_GUIDE.md`, `docs/PRODUCT_VISION.md`, `START_HERE.md`)

### Základní princip

```
Understand → Plan → Small Change → Test → Verify → Review → Continue
```

### Postup při každém úkolu

1. Popsat problém lidsky — kdo, co, proč
2. Určit roli, produktovou oblast, konkrétní workflow
3. Zkontrolovat, zda podobné řešení existuje
4. Navrhnout nejmenší smysluplnou změnu
5. U změny chování: nejdříve definovat ověřitelný scénář nebo test
6. Implementovat **pouze** schválený rozsah
7. Ověřit: `npm test`, `npm run typecheck`, `npm run lint`, browser průchod
8. Popsat, co bylo ověřeno a co zůstává nejisté

### Co nikdy nedělat bez výslovného zadání

- Nepřipojovat se k live databázi
- Neměnit RLS, autentizaci ani migrace
- Neprovádět velkou refaktorizaci současně s redesignem
- Nepublikovat na GitHub bez kontroly difu a tajných hodnot

### Bezpečnostní hranice

- Demo režim nesmí být povýšen na produkční přístup
- Tajné hodnoty pouze do lokálního `.env.local` (nikdy `NEXT_PUBLIC_`)
- AI nástroj není zdrojem pravdy o pracovním stromu

---

## 14. Recommended Next Steps

**Doporučeno na základě skutečného stavu projektu**

### 1. Spustit a ověřit testy
- `npm test` — zjistit aktuální stav 147 testů
- Identifikovat selhávající testy a kategorizovat je (bug vs. zastaralý test)
- **Proč:** Nelze smysluplně pracovat bez vědomí, co aktuálně funguje

### 2. Audit root Markdown souborů
- Projít `PROJECT.md`, `Review.md`, `design-qa.md`, `countdown-crm-project-bundle-sanitized*.md`
- Určit, co je aktuální dokumentace vs. zastaralé/pracovní soubory
- **Proč:** Duplicitní dokumentace zvyšuje kognitivní zátěž

### 3. Provést produktový audit navigace a workflow
- Projít každou stránku a odpovědět: kdo ji používá, jaký úkol dokončuje, co je zbytečné
- **Proč:** `START_HERE.md` to explicitně uvádí jako aktuální prioritu

### 4. Milník 3 (Telnyx Live VoIP) — Odloženo
- Odloženo do neurčité budoucnosti z rozhodnutí PM (vyžaduje rozpočet na koupi telefonního čísla a odchozí kredit). Systém používá simulační režim a bezplatný Local SIP.

### 5. Obnovit Supabase TypeScript typy
- Regnerovat typy z live schématu: `supabase gen types typescript`
- **Proč:** Cast `as unknown as SupabaseClient` je technický dluh, který může skrývat chyby

---

## 15. Agent Rules

Každý AI agent pracující na Countdown CRM musí dodržovat následující pravidla:

### R01 — Understand First
Před jakoukoli změnou projdi relevantní kód, testy a dokumentaci. Nevymýšlej architekturu.

### R02 — Minimal Change
Pro konkrétní problém udělej nejmenší rozumnou změnu. Netáhni s sebou refactoring.

### R03 — No Speculative Refactoring
Nerefactoruj pouze proto, že ty bys to navrhl jinak. Existující kód má kontext.

### R04 — Preserve Architecture
Architektonická vrstva UI → Server Actions → DAL → DB je záměrná. Neobcházej ji.

### R05 — Business Rules Are Sacred
Nemeň business behavior (lead statuses, call outcomes, fail reasons, order rules) bez explicitního schválení.

### R06 — Test Continuously
Po každé změně: `npm test`, `npm run typecheck`, `npm run lint`. Browser smoke test pro UI změny.

### R07 — Never Hide Uncertainty
Pokud si nejsi jistý — řekni to. Nespekuluj jako by to byl fakt.

### R08 — No Large Autonomous Changes
Větší změna = nejdříve plán, pak schválení, pak implementace po malých krocích.

### R09 — Human Approval for Destructive Actions
Databázové migrace, RLS změny, mazání dat, auth změny — vždy nejdříve vysvětlit a čekat na souhlas.

### R10 — Demo Mode Is Not Production
`isDemoAuthEnabled()` obchází autentizaci. Nikdy nepovyšuj demo přístup. Nikdy nedej `NEXT_PUBLIC_ALLOW_DEMO_AUTH=true` do sdíleného prostředí.

### R11 — Distinguish Facts From Inferences
Při analýze vždy rozlišuj: FACT (ověřeno v kódu), DOCUMENTED (uvedeno v dokumentaci), INFERRED (odvozeno), UNCERTAIN (nelze určit).

### R12 — Server-Only Is Sacred
Soubory s `import "server-only"` jsou server-only. Neimportuj je do client components. Nikdy.

### R13 — Secrets Stay Local
Tajné hodnoty patří pouze do `.env.local` (gitignore). Nikdy do `NEXT_PUBLIC_*`. Nikdy do kódu.

### R14 — One Source of Truth
Zdrojem pravdy je: (1) aktuální kód, (2) aktuální testy, (3) aktuální konfigurace, (4) aktuální dokumentace. V tomto pořadí priorit.

---

*Dokument byl vytvořen po systematickém průzkumu projektu dne 2026-09-28. Zobrazuje stav projektu k tomuto datu. Aktualizovat při výrazných architektonických změnách.*
