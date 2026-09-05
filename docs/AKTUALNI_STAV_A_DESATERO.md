# Aktuální stav a To-Do

**Snapshot:** 5. 9. 2026
**Baseline:** `main` na commitu `799dae9` + necommitnuté Supabase sync změny
**Produktový status:** stabilizace před interním pilotem

Tento dokument je pracovní backlog a release checklist. Neříká, že celý produkt je production-ready; každá položka je uzavřená teprve po odpovídajícím ověření.

Produktový průchod třemi rolemi (operátor, team leader, administrátor) je v sekci [Pohled na produkt jako celek](#pohled-na-produkt-jako-celek). Není to nový scope; odděluje, co chybí k dennímu provozu call centra, co je předčasné a co se má před pilotem zmrazit.

## Co je hotové

- hlavní Operator Console workflow: claim, call lifecycle, outcome, callback, recovery a objednávka,
- `Operator Next Action`: stavová hlavní další akce bez ručního procházení lead directory,
- první slice `Callback Recovery Inbox`: due/upcoming callbacky přímo v Operator Console se serverovým routingem,
- karta klienta s plným a kompaktním režimem,
- recent context řádek s posledním kontaktem, výsledkem, objednávkou a callbackem,
- callback modal s počátečním fokusem, klávesou `Escape`, obnovou fokusu a přístupným chybovým stavem,
- klávesové zkratky pro rychlé operátorské akce; při psaní do formuláře se neaktivují,
- Product Scripts s draft/publish/archive hranicí a sanitizací,
- role a workspace hranice v serverové vrstvě a Supabase RLS,
- Customer 360, deterministický Next Best Action, Team Leader Daily Brief a Wallet MVP,
- Telnyx foundation: serverové credentials, krátkodobý WebRTC token, call session/event persistence, podepsaný webhook a idempotentní event trail,
- Telnyx tabulky a RLS migrace jsou aplikované v linked Supabase prostředí.
- Supabase CLI `2.116.0`, lokální konfigurace a linked sandbox jsou srovnané s repozitářem; migration history nemá mezery, `db push --dry-run` je up-to-date a schema diff je nulový,
- wallet funkce i RLS politika na linked sandboxu odpovídají hranici manager/admin; lokální databázové RLS testy prošly 58/58.
- autentizovaný runtime důkaz prošel: Team Leader login/role/queue release, operátorské přiřazení, fallback call, outcome `no_answer`, reload a SQL read-back; testovací účty byly po ověření odstraněny.
- `/calendar` a `/wallet` byly ověřeny autentizovaným Team Leaderem v linked sandboxu; kalendář vytvoření/reload/zrušení reminderu přežil reload a Wallet načetl ledger i týmové zůstatky bez chyby.

## Co hotové není

- Telnyx live pilot je dočasně odložený kvůli ověření telefonního čísla mimo repo; live environment a veřejná webhook URL proto ještě nejsou ověřené end-to-end,
- lokální SIP ústředna v Dockeru je implementovaná jako validační cesta; pozitivní admin flow Settings → Local SIP → `/telephony` je ověřený, skutečný spojený audio hovor čeká na druhý browserový SIP endpoint,
- inbound routing, nahrávání hovorů a přepis hovorů nejsou implementované,
- Gemini post-call AI pro přepis, verdikt a návrh poznámky není implementovaná,
- training zůstává mimo telefonní vrstvu; softphone používá simulaci, Local SIP nebo blokovaný Telnyx podle serverové workspace volby,
- fulfillment webhook a produkční payout nejsou součástí Wallet MVP.

## To-Do

### P1 — bezpečnost a pilotní důkaz

- [x] dokončit testovací Team Leader provisioning, login, ověření role a cleanup,
- [x] doplnit autentizovaný call → outcome/order → reload → SQL read-back pro kritické role; ověřený je fallback call s výsledkem `no_answer`, nikoli živý Telnyx pilot,
- [x] explicitně evidovat a srovnat rozdíly migration history mezi repozitářem a linked sandboxem; schema diff je po opravě nulový,
- [ ] vyřešit privilegovaný způsob spuštění databázových testů proti linked sandboxu; aktuální Supabase runner nemá přístup do interních schémat `auth` a `private`, lokální testy proto zůstávají hlavním automatizovaným důkazem.
- [x] uložit aktivní telefonní adapter serverově na úrovni workspace; nepoužívat `localStorage`, změnu povolit pouze administrátorovi a zapsat ji do auditu.

### Vzdálené To-Do — Telnyx (externě blokované)

Telnyx integrační základ je v repozitáři připravený, ale živé ověření teď není
aktivní pracovní blok. Zakoupené číslo vedené pro Středočeský kraj neodpovídá
adrese žadatele, proto probíhá žádost o refundaci. Po potvrzení refundace bude
zakoupené číslo pro Moravskoslezský kraj potřeba ověřit a teprve potom navázat
na connection a projít pilotní důkaz.

- [ ] dokončit refundaci nevhodného krajského čísla,
- [ ] zakoupit a ověřit Telnyx číslo odpovídající skutečné adrese,
- [ ] přiřadit ověřené číslo k vybrané voice connection,
- [ ] nastavit serverové `TELNYX_*` proměnné a `NEXT_PUBLIC_TELNYX_ENABLED=true` pouze v cílovém environmentu,
- [ ] nasadit veřejnou webhook URL `/api/telephony/telnyx/webhook` a ověřit podpisy i eventy,
- [ ] projít přihlášený outbound hovor v browseru a ověřit lifecycle v UI i v databázi po reloadu,
- [ ] doplnit negativní role/workspace scénáře pro telephony data.

Do dokončení těchto externích kroků zůstává živý Telnyx flag vypnutý a
simulovaný softphone je jediný dostupný fallback.

### Dočasná validační telefonní cesta — Docker ústředna

Tato cesta nemění pořadí produktu ani nenahrazuje budoucí Telnyx pilot. Má nám
umožnit pochopit a ověřit, jak se telefonie chová v Countdownu, i když zatím
nemáme ověřené Telnyx číslo.

**Docker ústředna** bude lokální integrační laboratoř, předběžně postavená na
Asterisku, se dvěma interními testovacími linkami. Bez SIP trunku nebude volat
na veřejná mobilní čísla. Jejím úkolem bude ověřit zejména:

- vytvoření a ukončení call session,
- přechody stavů hovoru a jejich bezpečné opakování,
- vazbu hovoru na operátora, lead a workspace,
- post-call wrap-up, outcome a recovery,
- auditní kontext a chování při chybě,
- oddělení telefonního adaptéru od zbytku Countdownu.

V Admin Settings bude sekce **Telephony adapter** se stabilní kotvou
`/settings#telephony-adapter`. Volba `Local SIP` zobrazí proklik na
`/telephony`. Volba `Telnyx adapter` zůstane viditelná, ale zablokovaná s
vysvětlením externího blockeru. Pokud administrátor otevře `/telephony` při
jiném aktivním adapteru, stránka mu nabídne proklik přímo zpět na
`/settings#telephony-adapter`.

Navržený postup:

1. přidat malou provider-neutrální telephony service boundary,
2. připojit k ní lokální SIP adapter,
3. spustit Asterisk v Dockeru se dvěma interními endpointy,
4. projít call lifecycle a databázový read-back,
5. Telnyx připojit až později jako produkční carrier adapter.

Stav této cesty: **implementováno a lokálně ověřeno v Dockeru**. Asterisk je
localhost-only, obsahuje pouze interní endpointy 1001/1002 a nepředstavuje
produkční veřejnou telefonii.

Telnyx není bezprostřední produktový krok. Před jeho návratem má přednost
stabilizace migration history, post-call toku, Conversation Briefu, Team Leader
Exception Queue, role-aware ploch a první bezpečné AI vrstvy.

### P1 — runtime stabilita před pilotem

- [x] ověřit dostupnost `/calendar` a `/wallet` v aktuálním cílovém workspace autentizovaným uživatelem; obě plochy i kalendářová persistence prošly, databázová migration/schema příčina je vyloučená,
- [ ] doplnit diagnostiku připravenosti workspace pro queue, calendar/reminders, wallet settings, published scripts a aktivní integrace,
- [ ] zajistit, aby selhání jedné podpůrné datové části neskrývalo dostupná data z ostatních zdrojů; například callbacky nesmí zmizet jen kvůli chybě osobních reminders.

### P1 — operátorský pracovní tok

- [x] přidat `Operator Next Action`: stavová hlavní další akce je v Operator Console a respektuje assignment, call lifecycle i recovery,
- [x] přidat první slice `Callback Recovery Inbox`: due/upcoming callbacky jsou v Operator Console a zůstávají omezené serverovým routingem; hlubší automatické recovery a claim callbacku jsou další krok,
- [x] přejmenovat negativní outcome na `Fail` a při jeho uzavření vyžadovat konkrétní důvod i krátkou poznámku; důvod a poznámka se ukládají odděleně pro další reporting,
- [ ] zrychlit post-call wrap-up tak, aby outcome, poznámka, další krok, callback a objednávka tvořily jeden krátký a jednoznačný tok chráněný proti dvojímu odeslání.

### P2 — operátorská čitelnost a vedení týmu

- [x] zlepšit čitelnost Product Scriptu bez interaktivních kroků: statické sekční nadpisy, vizuální hierarchie, oddělení textu k přečtení od interních poznámek, lepší kontrast a scan-friendly layout; zachovat souvislou osnovu bez potvrzování a klikání během hovoru,
- [ ] přidat předhovorový `Conversation Brief`: problém klienta, poslední relevantní kontakt, předchozí výsledek, callback promise a doporučený bezpečný další krok na jedné ploše,
- [ ] rozšířit schválené objection cards a FAQ o bezpečné formulace pro zdravotně citlivá témata; nesmí jít o diagnózu, léčebný slib ani improvizované tvrzení,
- [ ] přidat Team Leader Exception Queue pro overdue callbacky, stuck recovery, neuzavřené outcomes, dlouhé leases, failed workflows a chybějící publikované skripty; každá položka musí mít důvod, prioritu, vlastníka a bezpečnou další akci,
- [ ] vytvořit role-aware `Attention Layer`: operátor vidí další akci u klienta, teamleader týmové výjimky a admin stav workspace; nepřidávat další obecný dashboard bez akčního kontextu,
- [ ] přidat Team Leader Review **reálného hovoru** (call, outcome, použitý skript, ruční coaching); `/training/reviews` je review simulace, ne tento bod; AI může navrhnout místa k pozornosti, ale nesmí sama vydat verdikt,
- [ ] přidat Admin `Workspace Readiness`: telefonie, webhook, migration history, RLS/role hranice, publikované skripty, callbacky, wallet a poslední kritické chyby se stavem `Ready`, `Needs attention` nebo `Blocked`,
- [ ] rozšířit správu Product Scriptů o diff draft/published, autora, účinnost, preview operátorského zobrazení a rollback předchozí verze,
- [ ] role-aware úvodní plochy a zúžení navigace — podrobnosti v sekci P2 níže,
- [ ] Alert Center **až po** Exception Queue: jen akční upozornění s odložením a dohledatelným vyřešením; nebudovat notifikační chat ani duplicitní dashboard,
- [ ] rozšířit auditní log o kontext změny, předchozí/nový stav a vazbu na entitu pro změny rolí, skriptů, callbacků, outcomes, objednávek a telefonie,
- [ ] doplnit responsive layout pro menší displeje, nebo explicitně zdokumentovat desktop-only podporu,
- [ ] sjednotit jazyk UI a pravdivé labely — podrobnosti v sekci P2 níže.

### P2 — AI po stabilizaci telefonie

- [ ] uložit bezpečný zdroj nahrávky nebo audio streamu s vazbou na call session,
- [ ] přidat serverovou Gemini transcription boundary bez vystavení klíče v browseru,
- [ ] po přepisu generovat editovatelný návrh verdiktu a poznámky pro operátora,
- [ ] oddělit retention, přístupová práva a případné mazání audio/transcript dat.

### P2 — role-aware den a pravdivé označení

Tyto body přišly z průchodu třemi rolemi. Nejsou nový produkt; opravují, že tři práce sdílejí jeden obecný shell a že některé plochy slibují víc, než umí.

- [ ] role-aware úvodní plocha: operátor začíná v Operator Console, team leader u výjimek a denního briefu, administrátor u zdraví workspace; Dashboard Overview nesmí být výchozí práce pro všechny,
- [ ] zúžit navigaci podle práce, ne podle počtu modulů: operátor vidí Console, Calendar, Orders, Wallet, Products/skripty, Call Logs, Settings; Deals, Live Monitor, AI Training a Workflows nejsou denní nástroje operátora,
- [ ] dát team leaderovi v navigaci cestu k frontě (`/team` dnes umí queue, ale v sidebaru je jen pro administrátora jako Workspace Members),
- [ ] navázat status Ready / In call / Break v sidebaru na serverovou `operator_presence`; lokální přepínač bez persistence nesmí vypadat jako stav směny,
- [ ] Live Monitor buď napojit na skutečnou presence/queue, nebo stránku označit `Unavailable` a z navigace pilotu ji schovat; prázdné pole s ticking duration je falešný floor,
- [ ] Call Logs nesmí slibovat „full speech transcript protocols“, dokud přepis neexistuje; stránka je historie hovorů, ne QA nahrávek,
- [ ] přejmenovat branding `AI CRM` a pole `ai_score`: skóre je deterministická heuristika (telefon, e-mail, status), ne predikce modelu; stejné pravidlo platí pro cross-sell copy s vymyšlenými procenty,
- [ ] sjednotit jazyk UI (čeština vs. angličtina) a zkontrolovat označení `AI`, `live`, `simulation` a `Unavailable`.

### Zmrazit do po-pilota (neodebírat, nerozšiřovat)

Tyto plochy mají v kódu smysl, ale odvádějí práci od denní smyčky call centra. Do interního pilotu je **nemazat**, jen **nezakládat na nich další featury**.

- custom objects / schema engine a EAV v Settings,
- industry blueprints a `/objects/deals` (Deals & Pipelines),
- rozšiřování AI Roleplay Training a compliance scoreru, dokud není živý hovor a QA reálných hovorů,
- Wallet payout / fulfillment webhook,
- inbound routing, nahrávky a Gemini.

## Pohled na produkt jako celek

Průchod 4. 9. 2026. Otázka nebyla „který modul přidat“, ale **jakou práci každý člověk v call centru během směny skutečně dělá** a zda mu CRM tu práci zkracuje, nebo rozptyluje.

### Co chybí, ale nejde to pojmenovat jedním tlačítkem

Chybí **denní provozní smyčka tří rolí**, ne další dashboard.

Operátor potřebuje uzavřený den: jsem k dispozici → vím, koho a proč volám → vedu hovor ze schváleného textu → za 20–40 sekund uložím výsledek → hned další lead nebo slíbený callback. Team leader potřebuje výjimky a koučink, ne BI. Administrátor potřebuje vědět, jestli workspace smí jet, ne další katalog objektů.

Dnes je jádro (fronta, Console, outcome, callback, objednávka, skripty, RLS) silné. Okolo něj je **široký CRM shell** (dashboard, deals, schema, blueprints, prázdný live monitor, training simulator, „AI“ skóre), který vypadá hotově, ale **není prací směny**. Ten pocit „něco chybí“ je spíš: *chybí práce, přebývá produkt*.

### Operátor

**Co už drží:** Operator Console, claim/recovery, Next Action, Callback Recovery Inbox, profil klienta, recent context, skript jako osnova, Fail s důvodem, klávesové zkratky, vlastní objednávky a kalendář.

**Co bolí v reálném hovoru:**

1. Před hovorem není jeden `Conversation Brief` — problém, poslední kontakt, slib, bezpečný další krok. Operátor skládá kontext z karty, timeline, skriptu a recent row.
2. Po hovoru není jeden krátký wrap-up. Outcome, poznámka, callback a objednávka jsou pořád víc kroků; po uložení skočí Post-call summary, které víc hlásí automatizace než „co teď“.
3. Neví, *proč* tenhle lead volá zrovna teď: chybí kampaň / list / nabídka / souhlas. Queue dává „další člověka“, ne „další práci“.
4. Status v sidebaru je lokální UI, ne stav směny. Pauza, wrap-up a konec směny nejsou provozní akce.
5. Navigace ho tahá do Dashboardu, Deals, Training, Products, Wallet, Call Logs. Během hovoru má zůstat v Console.

**Neměnit teď:** skript nepřevádět na klikací Run mode. Wallet operátorovi nechat jako přehled bonusů, nerozšiřovat. Training nechat simulací a neprodávat ho jako coaching živého hovoru.

### Team leader

**Co už drží:** Daily Brief na dashboardu, analytics z workspace dat, správa fronty na `/team`, lead directory, CSV import, workflows, audit, training reviews.

**Co bolí na směně:**

1. Nemá **Exception Queue**: overdue callback, stuck recovery, neuzavřený outcome, dlouhý lease, chybějící publikovaný skript. Brief počítá callbacky a re-ordery, ale není to seznam „teď zasáhni tady“.
2. **Live Monitor je prázdný** (`getLiveOperators()` vrací `[]`) a přitom vypadá jako floor s ticking duration. To je horší než chybějící stránka.
3. **Koučink reálného hovoru chybí.** Team Leader Review je review training sessions, ne call + outcome + použitý skript + ruční feedback.
4. Fronta existuje, ale v sidebaru na ni team leader nevidí; `/team` je schované jako Workspace Members pro admina.
5. Dashboard, Analytics, Monitor, Brief a Next Best Action říkají podobné věci na čtyřech místech. Vedení týmu má jednu pozornost: výjimka → vlastník → další akce.

**Neměnit teď:** nepřidávat další obecný dashboard. Workflows nechat pro pozdější automatizaci e-mail/SMS, ale nepřestavovat je na jádro pilotu.

### Administrátor

**Co už drží:** členové workspace, RLS a serverové role, Product Scripts draft/publish/archive, wallet pravidla, settings, audit, Telnyx foundation v kódu.

**Co bolí před pilotem:**

1. Chybí `Workspace Readiness`: telefonie, webhook, migration history, publikované skripty, fronta, calendar/wallet, poslední chyby — `Ready` / `Needs attention` / `Blocked`.
2. Ověření `/calendar` a `/wallet` nyní v linked sandboxu prošlo; stále chybí jednotná diagnostika pro případ budoucího selhání (data vs. migrace vs. demo).
3. Settings míchají zvuk operátora, schema engine, wallet a skripty. Admin nemá „provoz workspace“, má kuchyň modulů.
4. Není ověřený negativní důkaz: cizí workspace, špatná role, Team Leader login a cleanup.

**Neměnit teď:** nerozšiřovat custom objects a blueprints. Nezapínat Telnyx, dokud číslo a webhook nejsou ověřené mimo repo.

### Co přidat, zjednodušit, odebrat

| Rozhodnutí | Co | Proč |
|---|---|---|
| Přidat (P1/P2) | krátký wrap-up, Conversation Brief, Exception Queue, role-aware home/nav, Workspace Readiness, persistence důkaz | To je chybějící denní práce |
| Zjednodušit | jedna pozornost na roli, pravdivé labely, team leader cesta k frontě, status = presence | Teď se tři práce tváří jako jeden CRM |
| Zmrazit | schema/blueprints/deals, AI training expansion, wallet payout, inbound/Gemini | Široké, ale nepilotní |
| Neodebírat | Console, fronta, RLS, skripty, objednávky, wallet ledger, Telnyx foundation | Jádro produktu |
| Neoznačovat za hotové | Live Monitor, call transcripts, `ai_score`, sidebar status, simulovaný softphone | Vypadají živě, ale nejsou |

Nejhorší chyba teď by byla přidat další plochu (Alert Center, další dashboard, víc AI), než existuje **jedna další akce na roli** a **jeden pravdivý stav směny**.

## Desatero pro práci na projektu

1. Každá změna má jasný cíl, hranici scope a způsob ověření.
2. Jeden commit řeší jednu tematickou věc.
3. UI stav není důkaz persistence; kritické zápisy ověřujeme po reloadu a v databázi.
4. Workspace a role se vynucují serverem a RLS, ne pouze skrytím tlačítka.
5. Žádná migration nebo změna live dat bez explicitního cíle a kontroly migration history.
6. Simulace, fallback a `Unavailable` musí být v UI pravdivě označené.
7. Nevymýšlíme latency, AI skóre, online stav, webhook nebo úspěšný hovor bez skutečného zdroje.
8. Před předáním spouštíme testy, lint, typecheck, build a kontrolu diffu.
9. Chybu opravujeme v příčině; nemažeme test ani bezpečnostní pravidlo jen kvůli zelenému běhu.
10. Po změně aktualizujeme tento stavový dokument, pokud se změnil scope, důkaz nebo blocker.

## Kdy lze říct „interní pilot je připravený“

- hlavní workflow projde skutečný Auth uživatel a zápisy přežijí reload,
- negativní role a cross-workspace scénáře jsou ověřené,
- Telnyx outbound call má ověřenou session, webhook lifecycle a bezpečné failure states,
- simulované plochy jsou zřetelně oddělené od živých dat,
- testy, lint, typecheck, build a databázové ověření mají známý výsledek,
- dokumentace odpovídá skutečnému runtime.

Do té doby je správný status: **stabilizační práce / interní pilot v přípravě**.
