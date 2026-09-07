# Countdown CRM — projektový kontext

Toto je kanonický stručný kontext projektu. Není to povinný workflow protokol,
nenahrazuje testy a sám o sobě neprokazuje, že je funkce pilot-ready nebo
production-ready.

**Snapshot:** 7. 9. 2026
**Repo baseline:** post-call hranice, Conversation Brief, Exception Queue, server-side osobní preference a Team Leader Review reálného hovoru
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
Action`, první slice `Callback Recovery Inbox` a serverový Conversation Brief
se skutečnými údaji a bezpečným dalším krokem. Product Script zůstává
souvislou osnovou bez pracovního Run mode a bez potvrzování jednotlivých
kroků během hovoru; jeho text má statické orientační sekce pro rychlejší
čtení. Deterministické Customer 360, Next Best Action a Team Leader Daily
Brief nejsou live AI predikce.

Team Leader a administrátor mají na samostatné stránce `/exceptions` odvozený
Exception Queue. Zobrazuje pouze problémy doložené současnými workspace daty,
umožňuje je s důvodem vyřešit nebo odložit a každou změnu zapisuje do auditu.
Operátor položku v navigaci nevidí a serverový role guard odmítne i přímou URL.

Osobní preference operátorů jsou uložené v `workspace_user_preferences` podle
kombinace workspace + uživatel. Aktuálně pokrývají hlasitost vyzvánění a hustotu
karty Client Profile. Server odvozuje identitu z přihlášené session, RLS brání
čtení či zápisu cizích hodnot a staré browserové hodnoty se případně importují
jen jednou.

Team Leader Review reálného hovoru je nyní oddělený od `/training/reviews`.
Manažer nebo administrátor otevře přesný uložený hovor, vidí jeho outcome,
operátorskou poznámku, zachovaný transcript a důkaz použitého skriptu. U starých
hovorů se bez uložené vazby zobrazí „verze nebyla zaznamenána“; systém nic
nedopočítává. Budoucí telephony sessions ukládají immutable snapshot publikované
verze skriptu a při dokončení se vážou na konkrétní call. Verdikt a coaching zapisuje
člověk jako append-only revizi; oprava vytvoří další revizi a audit obsahuje přesný
previous/new stav. V Call Logs má manažer stav `Not reviewed`, `Reviewed` nebo
`Corrected`, počet čekajících review, filtr nehodnocených hovorů, prázdný stav po
vyřízení celé fronty a přímý odkaz na review s návratem do stejného filtru.
Operátor nemá review link ani přístup k review stránce.

### Barevná hierarchie

CRM používá barvu jako signál, ne jako dekoraci: běžné plochy, odkazy, ikony a
kontextové karty zůstávají v neutrální škále `zinc`. `emerald` označuje potvrzení
nebo připravenost, `amber` vyžaduje pozornost, `rose` chybu či riziko a `sky` je
vyhrazená pro skutečný informační kontext nebo důležitou navigaci. Call Outcome,
readiness, živá telefonie, auditní závažnost a finanční polarita si ponechávají
své sémantické barvy.

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

Supabase CLI je v projektu připnuté na `2.116.0`. Linked sandbox má srovnanou
migration history 86/86. Migrace Team Leader Review byla nejprve
ověřena dry-runem, poté aplikována bez seedů, změn rolí a Vault secrets a
prověřena přes skutečný Team Leader/operator Auth průchod s následným cleanupem.
Raw veřejný schema diff nemá destruktivní změny. Devět vypsaných definic funkcí
bylo katalogově prokázáno jako čistý CRLF/LF false positive; všech 80
projektových funkcí se shoduje v těle po line-ending normalizaci i v security
metadatech. Následující P0 advisor bod je rovněž uzavřený: pět stabilních
veřejných RPC signatur používá invoker wrappery, privilegovaná těla jsou v
`private` a `pgtap` 1.3.3 je přesunutý z `public` do `extensions`. Linked
katalogový read-back potvrdil očekávané security režimy, ACL a prázdný
`search_path`; advisor už těchto šest původních příčin nehlásí. Čistý lokální
reset a 183/183 databázových testů prošly.
Aktuální P0.2 větev navíc prošla aplikační sadou 351/351 v 89 souborech, lintem,
typecheckem a produkčním buildem. Autentizovaný fallback průchod Team Leader → operátor →
call → `no_answer` → reload → SQL read-back nyní prošel. Team Leader následně
ověřil `/calendar` včetně reminder persistence po reloadu a read-only `/wallet`
ledger. Operátorský callback dotaz a `/calendar` byly znovu ověřeny po nasazení
post-call migrací. Živý Telnyx provider zůstává samostatně neověřený.

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

1. P0 pokračuje bezpečným vzdáleným test runnerem a poté produkčním Auth
   nastavením. Funkční schema drift i advisor nálezy privilegovaných RPC a
   `pgtap` jsou uzavřené a podložené read-backem.
2. P1 stabilizuje hlavní pracovní smyčku: dílčí selhání, role-aware navigaci,
   pravdivé UI, full-shift smoke test a dependency gate.
3. P2 zavádí skutečné týmy/oddělení, členství, Team Leader scope, správu a RLS.
   Teprve nad tímto základem vzniknou operátorské Results a týmová srovnání.
4. P3 propojí presence, směny, Live Monitor a role-aware Settings.
5. P4 rozšíří kvalitu obsluhy a cíleně sníží rizikový coupling.
6. Telnyx je externě blokovaný; transcription/Gemini následují až po stabilní
   telefonii. Široké moduly zůstávají do po-pilotního rozhodnutí zmrazené.

Celoprojektový důkaz a důvody tohoto pořadí jsou v
[checkpoint reportu](docs/superpowers/reports/2026-09-07-project-checkpoint.md).

### Schválené hranice scope

- Současný způsob práce s leady zůstává zachovaný: operátor zpracovává jeden
  aktivní kontakt a další mu server vybere podle priority, dostupnosti a callbacku.
  Alternativní assignment strategie ani konfigurovatelný počet souběžných leadů
  se nepřidávají.
- Směnový kalendář je jediný zdroj směn, plánované dostupnosti, absence a
  přesčasů. Pracovní dny, pracovní hodiny ani svátky nebudou paralelní
  konfigurací v Admin Settings.
- Správa pozvánek, členství, rolí, deaktivací a hranic oprávnění bude na
  samostatné administrátorské stránce `Users & Permissions`.

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
