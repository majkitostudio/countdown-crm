# Countdown CRM — projektový kontext

Toto je kanonický stručný kontext projektu. Není to povinný workflow protokol,
nenahrazuje testy a sám o sobě neprokazuje, že je funkce pilot-ready nebo
production-ready.

**Snapshot:** 7. 9. 2026
**Repo baseline:** post-call hranice, Conversation Brief, Team Leader Exception Queue a server-side osobní preference
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
previous/new stav. Operátor nemá review link ani přístup k review stránce.

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

Supabase CLI je v projektu připnuté na `2.116.0`. Linked sandbox má po nasazení
osobních preferencí srovnanou migration history 83/83. Migrace byla nejprve
ověřena dry-runem, poté aplikována bez seedů, změn rolí a Vault secrets a
prověřena přes skutečný Team Leader/operator Auth průchod s následným cleanupem.
Veřejný schema diff nemá destruktivní změny, ale stále obsahuje rozdíly
v definicích několika starších funkcí, takže úplná schema shoda zůstává otevřená.
Lokální databázové testy prošly 109/109 a aplikační sada 255/255 v 69 souborech;
lint, typecheck i produkční build jsou zelené. Autentizovaný fallback průchod Team Leader → operátor →
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

1. `Workspace Readiness` je implementovaný; zbývá privilegovaný runner vzdálených
   databázových testů a nedestruktivní drift definic starších funkcí.
2. Post-call wrap-up s idempotentní hranicí je dokončený a nasazený v linked sandboxu.
3. Conversation Brief je implementovaný v Operator Console.
4. Team Leader Exception Queue je implementovaný, nasazený do linked sandboxu
   a ověřený přes Team Leader/operator Auth smoke test včetně cleanupu.
5. Role-aware vstup je dokončený: operátor začíná v Operator Console, Team Leader
   v Exception Queue a administrátor ve Workspace Readiness; původní Dashboard je
   manažerský přehled na `/dashboard`. Team Leader Review reálného hovoru je
   implementovaný lokálně včetně historie a auditu; před nasazením je třeba ověřit
   migraci v konkrétním linked sandboxu. Zmrazit custom objects, blueprints a Deals
   pipeline, dokud denní smyčka call centra drží.
6. Teprve po stabilizaci předchozích vrstev a dokončení externího ověření řešit
   Telnyx pilotní telefonní důkaz. Telnyx zůstává vzdálené To-Do, ne bezprostřední
   produktový krok.
7. Až následně přidat Gemini transcription a editovatelný návrh verdiktu/poznámky.
8. Další změny držet malé, tematické a samostatně ověřitelné.

**Odložené To-Do mimo aktuální pořadí:** operátorské výsledky a porovnání se
spolupracovníky řešit jako samostatný slice až po návrhu skutečné týmové struktury.
Současný workspace zatím nemá oddělení typu Příchozí linka nebo Odchozí linka,
proto stránka `Results` nesmí dočasně používat celý workspace jako náhradu týmu.

### Schválený scope pro P1–P5

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
