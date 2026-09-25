# Countdown CRM — Current State

**Snapshot:** 2026-09-25

Tento dokument je rychlý orientační snapshot. Stavové štítky popisují stav podle aktuálního kódu, existující dokumentace a dostupných ověření; nenahrazují nové ověření při implementaci.

## Product and workflow

- **FACT / DONE** — Countdown CRM je workspace-scoped CRM pro výkonnostní call centra a tele-sales.
- **FACT / DONE** — Primární uživatel je operátor. Hlavní pracovní plocha je Operator Console na `/workspace`.
- **FACT / DONE** — Hlavní smyčka: přijmout nebo získat lead, pochopit zákaznický kontext, vést citlivý rozhovor, uložit výsledek a pokračovat callbackem, objednávkou nebo dalším leadem.
- **FACT / DONE** — Další uživatelé jsou Team Leader a Administrator s odlišným workspace/týmovým rozsahem.
- **FACT / DONE** — Produkt má odstraňovat hledání, přepisování a zbytečná rozhodnutí; při citlivých tématech musí používat schválený jazyk a nesmí diagnostikovat ani slibovat léčbu.

## Technology and architecture

- **FACT / DONE** — Next.js App Router, React, TypeScript a Tailwind CSS.
- **FACT / DONE** — Supabase PostgreSQL + Auth; kritické zápisy používají serverovou datovou vrstvu, Server Actions nebo RPC.
- **FACT / DONE** — Workspace a role jsou bezpečnostní hranice v serverových guarda a RLS. Skrytí tlačítka nebo přímá URL nejsou bezpečnostní hranice.
- **FACT / DONE** — Telnyx WebRTC SDK je připravený první externí telefonní provider; současný live režim není ověřený a zůstává blokovaný dostupností správného čísla a externí konfigurace.
- **FACT / DONE** — Kontroly používají Vitest, ESLint a TypeScript. Supabase CLI je v `package.json` připnuté na `2.116.0`.
- **FACT / UNKNOWN** — Zdroj databázových změn jsou verzované migrace; `supabase/schema.sql` je historický snapshot, nikoli autoritativní migration history.

## Main application areas

| Area | Route(s) | Current state |
|---|---|---|
| Operator Console | `/workspace` | **DONE / PARTIAL** — hlavní pracovní plocha s leadem, kontextem, skriptem, poznámkami, hovorem a dalším krokem; některé pilotní provozní důkazy zůstávají samostatné. |
| Leads and customer | `/leads`, `/leads/[leadId]` | **DONE** — leady, Customer Profile, timeline a workspace-scoped přístup. |
| Calls and review | `/calls`, `/calls/[callId]/review` | **PARTIAL** — outcomes, uložené hovory a Team Leader review existují; live provider, nahrávání a audio retention nejsou hotové. |
| Calendar and callbacks | `/calendar` | **DONE / PARTIAL** — callbacky a persistence jsou implementované; širší přepínání týmů/období čeká na read model podle aktuálního backlogu. |
| Orders | `/orders` | **DONE / PARTIAL** — ruční i post-call objednávka a immutable delivery-address snapshot jsou ověřené; externí fulfillment integrace není potvrzená. |
| Products and scripts | `/products`, `/settings/scripts` | **DONE** — produkty, Product Scripts a objection cards; skript je souvislá osnova bez potvrzování kroků během hovoru. |
| Team workspace | `/team` | **DONE / PARTIAL** — Team Checkpoint, týmové filtry, asistence, callbacky a kvalita mají ověřené části; další read-model a směnové scénáře zůstávají v práci. |
| Dashboard and analytics | `/`, `/dashboard`, `/analytics` | **DONE / PARTIAL** — role-aware dashboard a týmový/celoworkspace rozsah; nejde o live AI predikce. |
| Training | `/training`, `/training/reviews` | **IN PROGRESS / PARTIAL** — onboardingový trénink s AI zákazníkem a coaching feedbackem existuje, ale produktové uzavření vyžaduje další autentizované browserové scénáře a stabilitu AI provideru. |
| Wallet | `/wallet` | **DONE / PARTIAL** — wallet ledger/bonusy existují; Wallet zůstává workspace-global, nerozšiřuje se do týmového vlastnictví. |
| Administration and safety | `/audit`, `/exceptions`, `/settings`, `/telephony` | **DONE / PARTIAL** — audit, výjimky, nastavení a telefonní adapter mají role-aware hranice; live telefonie je externě blokovaná. |

## What is done

- **FACT / DONE** — Workspace-scoped data model, membership/RLS foundation, serverové role guardy a třírolový smoke jsou popsány jako ověřené v aktuální projektové dokumentaci.
- **FACT / DONE** — Operator Console prošla sjednocením hlavních CRM cest podle společného designového systému.
- **FACT / DONE** — Customer Profile, Product Script, append-only poznámky, recent context, Operator Next Action a callback recovery mají implementované části popsané v `PROJECT.md`.
- **FACT / DONE** — Ruční i post-call objednávky ukládají validovaný neměnný snapshot doručovací adresy.
- **FACT / DONE** — Team Checkpoint, týmová analytika, read-only předání směny a Team Leader review mají implementované a dokumentované části.
- **FACT / DONE** — Serverová Gemini kontrola kvality poznámek reálných hovorů je oddělená od tréninku a vrací omezené doporučení `ok`, `review` nebo `unavailable`; nemění hovor, objednávku ani operátora.

## In progress, blocked and planned

- **FACT / BLOCKED** — Živý Telnyx outbound pilot čeká na správné telefonní číslo, externí konfiguraci, webhook read-back a autentizovaný browser test. Fallback softphone a Docker/Asterisk laboratoř nejsou live provider důkaz.
- **FACT / IN PROGRESS** — Stabilizace před interním pilotem: pilotní pracovní den, směny/dostupnost, training UX a provozní stabilita AI/migrací/telefonie.
- **FACT / PLANNED** — P0.4 Auth hardening, zejména leaked-password protection, je vědomě odložený do období před externím pilotem nebo expanzí.
- **FACT / PLANNED** — Další AI/audio/transcription scénáře jsou navázané na stabilní telefonii a nemají být vydávány za hotové před ověřením provideru.
- **FACT / DEFERRED** — Týmové vlastnictví workflow, produktů a Walletu se podle aktuálního směru zatím nerozšiřuje.
- **UNKNOWN** — Přesný aktuální počet testů v tomto pracovním stromu nebyl při vytvoření dokumentace znovu spuštěn. `PROJECT.md` uvádí 642/642 aplikačních testů a `docs/AKTUALNI_STAV_A_DESATERO.md` novější snapshot uvádí 687/687; jde o konflikt snapshotů, ne o potvrzení jedné hodnoty.

## Local development and validation

**FACT:** Spolehlivě zdokumentovaný základní postup:

```bash
npm install
# vytvořit .env.local podle .env.example
npm run dev
```

Aplikace se standardně otevírá na `http://localhost:3000`. Projekt vyžaduje Node.js a přístup k vývojovému Supabase projektu. Tajné klíče patří pouze do serverového environmentu.

**FACT:** Relevantní repo kontroly:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

`npm run check` spouští lint, typecheck a production build. Databázové a autentizované browserové důkazy se musí posuzovat odděleně od statických testů.

## Important limitations

- **FACT** — Simulator, fallback, `AI-assisted` nebo `Unavailable` label nejsou důkaz externí integrace.
- **FACT** — Lokální test, build nebo unit test není důkaz živé persistence, RLS, concurrency ani live provideru.
- **FACT** — E-mail, SMS, WhatsApp, pay-link dispatch a fulfillment webhook nejsou potvrzené live integrace.
- **FACT** — `NEXT_PUBLIC_ALLOW_DEMO_AUTH=true` patří pouze do lokálního vývoje.
