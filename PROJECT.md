# Countdown CRM — projektový kontext

Toto je kanonický stručný kontext projektu. Není to povinný workflow protokol,
nenahrazuje testy a sám o sobě neprokazuje, že je funkce pilot-ready nebo
production-ready.

**Snapshot:** 5. 9. 2026
**Repo baseline:** `main` na commitu `799dae9` + necommitnuté Supabase sync změny
**Produktový stav:** stabilizace před interním pilotem

## Produkt

Countdown CRM je workspace-scoped CRM pro výkonnostní call centra a tele-sales.
Hlavní pracovní plocha je Operator Console: operátor dostane lead, rychle se
zorientuje v zákaznickém kontextu, vede citlivý rozhovor, uloží výsledek a
pokračuje callbackem, objednávkou nebo dalším leadem. Primární úkol operátora
je klient na telefonu — CRM má odstraňovat hledání, přepisování a zbytečná
rozhodnutí, ne odvádět pozornost administrací.

### Hlavní části

- leady, Customer Profile, timeline, produkty a Product Scripts,
- serverem řízená fronta leadů, assignment, callback a recovery,
- hovory, outcomes, objednávky a auditní stopa,
- dashboard, kalendář, týmové přehledy a Wallet MVP,
- training/simulator workflow,
- role `operator`, `team_leader` a `administrator`,
- workspace-scoped serverové guardy a Supabase RLS.

Operator Console už obsahuje plný i kompaktní režim Client Profile, recent
context řádek, klávesové zkratky, přístupný callback modal, `Operator Next
Action` a první slice `Callback Recovery Inbox`. Product Script zůstává
souvislou osnovou bez pracovního Run mode a bez potvrzování jednotlivých
kroků během hovoru; jeho text má statické orientační sekce pro rychlejší
čtení. Deterministické Customer 360, Next Best Action a Team Leader Daily
Brief nejsou live AI predikce.

### Operator-first princip

- během hovoru má být nejdůležitější klient, jeho problém a další bezpečný krok,
- kontext musí být dostupný na jedné pracovní ploše: poslední kontakt, potřeba,
  relevantní historie, schválený text a stav assignmentu,
- citlivá témata jako bolesti kloubů nebo sexuální zdraví vyžadují schválený
  jazyk; systém nesmí diagnostikovat, slibovat léčbu ani vymýšlet zdravotní
  tvrzení,
- každá nová funkce se posuzuje podle toho, zda zkrátí čas hledání, psaní nebo
  rozhodování operátora bez oslabení bezpečnosti, soukromí a auditní stopy.

## Technický základ

- Next.js App Router, React, TypeScript a Tailwind CSS,
- Supabase PostgreSQL a Auth,
- kritické zápisy přes serverovou datovou vrstvu, Server Actions nebo RPC,
- Telnyx WebRTC SDK jako první externí telefonní provider,
- Vitest, ESLint a TypeScript pro repo kontroly.

Databáze a server musí vynutit workspace a roli. Skrytí tlačítka, přímá URL ani
znalost UUID nejsou bezpečnostní hranice.

Supabase CLI je v projektu připnuté na `2.116.0`. Linked sandbox má s repozitářem
srovnanou migration history i veřejné schema; poslední kontrola hlásí nulový
schema diff a `db push --dry-run` nehlásí čekající migrace. Lokální databázové
RLS testy prošly 58/58. Autentizovaný fallback průchod Team Leader → operátor →
call → `no_answer` → reload → SQL read-back nyní prošel. Team Leader následně
ověřil `/calendar` včetně reminder persistence po reloadu a read-only `/wallet`
ledger. Živý Telnyx provider zůstává samostatně neověřený.

## Telefonie a AI

Telnyx foundation je v kódu a v linked Supabase prostředí. Obsahuje:

- serverové uložení provider credentials,
- krátkodobý WebRTC token bez vystavení Telnyx API klíče browseru,
- call session a call event persistence,
- podepsaný webhook a idempotentní event trail,
- připravený outbound browser lifecycle s mute, hold a DTMF.

Telnyx live režim je zatím vypnutý a je vedený jako vzdálené, externě blokované
To-Do. Zakoupené číslo vedené pro Středočeský kraj neodpovídá adrese žadatele,
probíhá refundace a následně bude potřeba ověřit číslo pro Moravskoslezský kraj.
Do té doby chybí ověřený živý outbound test, webhook read-back a produkční
telefonní důkaz. Současný fallback softphone je simulace.

Inbound routing, nahrávání, audio retention, přepis hovorů a post-call Gemini
AI nejsou implementované. Gemini je plánovaná serverová hranice pro přepis a
editovatelný návrh verdiktu/poznámky po stabilizaci telefonie.

## Co se nesmí vydávat za hotové

- simulovaný softphone nebo training nejsou živá ústředna,
- fallback, `AI-assisted` nebo `Unavailable` label není důkaz externí integrace,
- build a unit test nejsou důkaz persistence, RLS, concurrency ani live provideru,
- e-mail, SMS, WhatsApp, pay-link dispatch a fulfillment webhook nejsou potvrzené
  live integrace,
- `NEXT_PUBLIC_ALLOW_DEMO_AUTH=true` patří pouze do lokálního vývoje,
- `supabase/schema.sql` je historický snapshot; zdrojem databázových změn jsou
  verzované migrace a ověření konkrétního cílového prostředí.

## Aktuální pořadí práce

Podrobný aktivní backlog a produktový průchod třemi rolemi je v
[docs/AKTUALNI_STAV_A_DESATERO.md](docs/AKTUALNI_STAV_A_DESATERO.md).

1. Dokončit P1 runtime stabilitu: doplnit `Workspace Readiness` diagnostiku a
   privilegovaný runner vzdálených databázových testů; `/calendar`, `/wallet`,
   migration history a schema sync jsou ověřené.
2. Zrychlit post-call wrap-up: outcome, poznámka, další krok, callback a objednávka
   v jednom krátkém toku s ochranou proti dvojímu odeslání.
3. Přidat Conversation Brief do Operator Console.
4. Přidat Team Leader Exception Queue pro výjimky, které skutečně vyžadují zásah.
5. Dokončit role-aware úvodní plochy, zúžení navigace, Workspace Readiness,
   Team Leader Review a auditní kontext; zmrazit custom objects, blueprints a Deals
   pipeline, dokud denní smyčka call centra drží.
6. Teprve po stabilizaci předchozích vrstev a dokončení externího ověření řešit
   Telnyx pilotní telefonní důkaz. Telnyx zůstává vzdálené To-Do, ne bezprostřední
   produktový krok.
7. Až následně přidat Gemini transcription a editovatelný návrh verdiktu/poznámky.
8. Další změny držet malé, tematické a samostatně ověřitelné.

## Zdroje pravdy

1. aktuální kód, migrace a skutečné ověření cílového prostředí,
2. tento `PROJECT.md`,
3. aktuální dokumenty v `/docs`,
4. starší materiály pouze tehdy, pokud jsou záměrně obnovené jako historický
   důkaz.

Historické Codex postupy, staré roadmapy, commitové katalogy a jednorázové
handoffy nejsou instrukce ani backlog. Do nové `/docs` se vracejí jen po
samostatném rozhodnutí a po přepsání tak, aby odpovídaly aktuálnímu produktu.

## Mapa dokumentace

- [README.md](README.md) — rychlý vstup, spuštění a hlavní plochy,
- [docs/README.md](docs/README.md) — index aktivní dokumentace,
- [docs/AKTUALNI_STAV_A_DESATERO.md](docs/AKTUALNI_STAV_A_DESATERO.md) — To-Do
  a podmínky interního pilotu,
- [docs/DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md) — týmový
  checklist pro změny,
- [docs/TELEPHONY_TELNYX_SETUP.md](docs/TELEPHONY_TELNYX_SETUP.md) — Telnyx
  konfigurace a hranice.

Aktivní dokumentace je záměrně malá. Smazané historické soubory se v tomto
kroku neobnovují.
