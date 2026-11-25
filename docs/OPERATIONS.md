# Countdown CRM — provozní návod

Tento návod obsahuje lokální vývoj, seed katalogu a postupy pro kontrolu migrací. Ověření lokálního prostředí a linked sandboxu jsou oddělené; příkaz pro lokální databázi se nepovažuje za důkaz vzdáleného nasazení.

## Příprava na přejmenování projektu — 22. 11. 2026

- Plánovaný nový název je **Velocity CRM**. Tento záznam nepředstavuje přejmenování ani změnu nasazení: aplikace, repozitář, domény a odkazy zůstávají do dokončení samostatného úkolu pod současným názvem.
- Přejmenování aplikace, připojení vlastních domén a aktualizaci projektových odkazů provede GPT Work v druhém chatu. V tomto projektu se tyto zásahy neprovádějí.
- Po potvrzení dokončení změny zkontrolovat odkazy a nastavení projektu podle nových adres. Teprve potom pokračovat úplnou maticí oprávnění všech rolí a uzavřením závěrečného checkpointu. Historické a místní výsledky níže nejsou důkazem funkčnosti po přejmenování.

Před během ověř skutečný cíl prostředí; historické záznamy níže neprokazují současné nastavení, dostupnost ani stav databáze. Práci se zápisem či vzdáleným prostředím předem odsouhlas podle [pravidel](Rules.md).

## Aktuální stav prostředí (22. 11. 2026)

| Prostředí | Cíl | Ověřený stav |
|---|---|---|
| Lokální | Docker/Supabase a `.env.local` | Docker/Supabase odpovídá na portech 54321/54322; místní parita 144/144. |
| Sandbox | `countdown-crm-sandbox-20260824`, ref `lpvypihpxhyjljikfzqo` | Supabase CLI je sem propojená; dashboard hlásí Healthy a read-only kontrola potvrdila migrace 144/144. |
| Produkce | `countdown-crm`, ref `qlzrsookyobtvyekhrqi`, Vercel `https://countdowncrm.vercel.app` | Migrace 142/142; nejnovější produkční deployment READY z commitu `d648a0c`. |
| Preview | Vercel větev `work/clean-baseline` | Deployment READY z commitu `9e26d1f`; následný commit `d648a0c` byl jen dokumentační. |

Produkční řádek zachycuje poslední kontrolu z 21. 11. 2026 (142/142); produkce v této práci nebyla kontaktována. Nové migrace byly aplikovány pouze do místní databáze a ověřeného sandboxu.

Stav se může změnit; před zásahem nebo testem cíl znovu ověř. Produkční nasazení neznamená, že místní SIP adaptér je aktivní; v produkci nebyl žádný adaptér přepnut.

## Lokální spuštění a kontroly

Požadavky jsou Node.js 22.22.2 až 22.x, 24.15.0 až 24.x nebo 26 a novější a podle režimu lokální Supabase prostředí. CI používá Node.js 22.22.2.

```powershell
npm install
npm run dev
```

Demo používá syntetická data. Nepřipojuj demo k náhodné živé databázi a tajné hodnoty neukládej do `NEXT_PUBLIC_*` proměnných.

Dostupné kontroly:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:all
npm run test:smoke
```

`verify:all` spouští lint, typecheck, testy a build. Smoke test je samostatný browserový běh. Výsledek kontroly vždy vztahuj ke konkrétnímu běhu a jeho prostředí.

V OpenCode jsou dostupné projektové příkazy `/verify` pro bezpečné kontroly a `/review` pro nezměnovou revizi aktuálních změn. Smoke testy a kontroly linked databáze se nespouštějí automaticky.

### Ověření revize 20506c8 dne 21. 11. 2026

Prošly ESLint, TypeScript, 1 153 automatických testů ve 223 souborech a kontrola struktury 142 migrací. Běžné sestavení se zastavilo při stahování Google Fonts. Opakované sestavení s náhradními fonty prošlo a na něm proběhl prohlížečový test bez databáze. Přihlášení fungovalo pro zobrazení a fokus při 320, 390 a 1280 px, tři veřejné stránky účtu se načetly a šest chráněných tras přesměrovalo nepřihlášeného návštěvníka na přihlášení. Lokální Docker databáze nebyla dostupná a opakovaná kontrola evidence migrací v propojeném sandboxu nedoběhla. Výše uvedených 142/142 vychází z dřívějšího provozního záznamu.

### Lokální průchod 22. 11. 2026 — revize 20506c8

- Aplikace běžela na `127.0.0.1:3000` s místním Docker/Supabase API na `127.0.0.1:54321` a syntetickými účty. Místní evidence souhlasila ve všech 142 migracích. Databáze se neresetovala. Vzdálený sandbox ani produkce nebyly součástí průchodu.
- Administrátor přidal operátora do Oddělení P4. Pozvánka dorazila do místního Mailpitu. Běžící Auth odeslal výchozí šablonu a odkaz skončil na přihlášení bez nabídky nastavení hesla. Pro pokračování testu dostal tento účet heslo přes místní správu Auth. Přípravný skript `provision:user` u dvou nových testovacích účtů vytvořil účet, ale zápis členství zamítla databáze. Jejich členství bylo pro test doplněno přímo v místní DB.
- U dalšího nového operátora bylo dočasně nasimulováno selhání zápisu do týmu. Zůstal jeden účet, profil a členství v call centru bez týmu. Opakování stejného formuláře odmítlo duplicitu. Po odstranění simulované chyby administrátor přiřadil existujícího pracovníka přes správu týmu a členství potvrdil po obnovení i v databázi.
- Administrátor otevřel správu uživatelů a týmů, vedoucímu i operátorovi ji aplikace zamítla. Vedoucí vytvořil lead a uložil kontrolu hovoru svého týmu. Operátor si zobrazil vlastní hovor pouze pro čtení. Po uložení revize se mu dál zobrazovala hláška, že dokončená kontrola neexistuje. Revize je podle databázových pravidel dostupná vedoucím a administrátorům. Další hranice rolí a týmů nebyly systematicky ověřeny.
- Operátor převzal syntetický lead, ukončil simulovaný hovor a uložil objednávku za 29,99 USD. První pokus bez dostupného mikrofonu skončil před zahájením hovoru, opakování s virtuálním mikrofonem prošlo. Lead, objednávka i první revize kontroly zůstaly viditelné oprávněným rolím po obnovení stránky. Databáze potvrdila hovor 11 s, výsledek `order_placed`, jednu objednávku, jednu revizi a uzavřenou frontu bez obnovy rozpracovaného hovoru. První otevření konzole automaticky převzalo starší syntetický lead. Před voláním byl vrácen do dostupné fronty a nový lead dostal přednost pro testovacího operátora. Po dokončení objednávky konzole starší lead automaticky převzala ještě jednou. Po zavření relace byl opět vrácen do dostupné fronty. Auditní události převzetí zůstaly zachovány.

### Doplňující ověření 22. 11. 2026

- Místní Supabase byla restartována se zachováním dat a Auth načetl šablonu uvedenou v konfiguraci. Syntetická pozvánka dorazila do místního Mailpitu. Pozvání přes administrátorské rozhraní, přijetí odkazu, nastavení hesla, přihlášení, role operátora a přiřazení do P4 prošly. Opětovné použití odkazu bylo odmítnuto. Oprava kontroly původu požadavku umožnila použití místní adresy 127.0.0.1 a zachovala odmítnutí cizího původu. Šablona ve vzdáleném sandboxu znovu ověřena nebyla.
- Při otevření konzole novým operátorem se automaticky přiřadil starší syntetický lead. Po uzavření testovací relace byl bez hovoru vrácen do dostupné fronty; auditní záznam převzetí zůstal zachován.
- V propojeném sandboxu byla read-only kontrolou potvrzena evidence 142/142 migrací. Testovací účty administrátora, vedoucího a operátora se přihlásily. Přímý požadavek na administrátorskou změnu nastavení telefonie s nepodporovanou hodnotou byl vedoucímu i operátorovi zamítnut kvůli oprávnění. Celý provozní průchod v sandboxu nebyl proveden.
- Místní pgTAP prošel 320 kontrol v 18 souborech, včetně hranic rolí, týmů, kontroly hovorů, auditu a oprávnění k uzávěrce. V samostatné místní transakci nad syntetickou objednávkou prošlo doručení, zařazení do P3 na 21 dní, opakované doručení se zachováním termínu a vratka se zařazením do P4. Transakce byla vrácena zpět. PgTAP ověřil také odpočet vratky v měsíci vrácení. Výsledky se vztahují k místní databázi.
- Po opravách prošlo 1 156 automatických testů ve 223 souborech, lint, TypeScript a sestavení. Celý provozní scénář byl naposledy prakticky ověřen v předchozím místním průchodu; po opravách nebyl celý zopakován. Přístupnost se skutečnou čtečkou, editace skriptu klávesnicí, historické auditní záznamy a měnový údaj Call Logs vyžadují další ověření.

### Sandboxový průchod a opravy 22. 11. 2026

- Místní aplikace běžela na `127.0.0.1:3001` a podle `.env.local` byla připojena k ověřenému sandboxu `lpvypihpxhyjljikfzqo`. Přihlášení i místní Docker/Supabase odpovídaly; lokální databáze se neresetovala. Místní databáze a sandbox mají shodnou evidenci 144/144 migrací. Migrace `20261122130000` a `20261122140000` byly aplikovány v těchto dvou testovacích prostředích. Produkce nebyla měněna.
- V sandboxu se syntetickými účty byly ověřeny administrátor, vedoucí a operátor ve dvou týmech. Při testu operátor z druhého týmu dříve mohl přímo otevřít cizí kontrolu hovoru. Přidána databázová omezení pro přímé čtení hovorů, objednávek, leadů a jejich aktivity; druhý tým nyní dostává odpověď „nenalezeno“, vedoucí příslušného týmu kontrolu nadále otevře. Rozšířený pgTAP test prošel. Nejde o kompletní matici všech akcí všech rolí.
- Ověřeno opětovné poslání pozvánky a bezpečné dokončení přiřazení po částečném selhání; opakování nezaložilo druhý účet ani členství a změna nesprávné role byla odmítnuta. Opraven přípravný skript `provision:user`, jeho opakování je idempotentní a nesoulad role hlásí místo tichého přepsání. Testovací pozvánka použila pouze syntetickou adresu `example.test`; doručení do schránky ověřeno nebylo. Odkaz změnil stav syntetického účtu na potvrzený, ale nastavení hesla a následné přihlášení v sandboxu ověřeno nebylo.
- Po uživatelském ověření MFA byla v dashboardu zkontrolována Auth konfigurace sandboxu. Šablona Invite user je výchozí, s předmětem `You've been invited`; úpravy jsou vypnuté, dokud se nenastaví vlastní SMTP. Site URL je `http://localhost:3000` a seznam dalších povolených Redirect URLs je prázdný. Aplikace nyní běží na `http://127.0.0.1:3001` a v obou funkcích pro pozvání volá Auth bez `redirectTo`, takže Auth použije nastavenou Site URL. Ta proto nevede na právě běžící instanci na portu 3001. Nastavení ani SMTP nebyly změněny a e-mail nebyl znovu odeslán. Před změnou Auth návratových adres je potřeba určit stabilní URL testovací aplikace; nastavení ovlivňuje bezpečný návrat po ověření účtu.
- Hlavní průchod v sandboxu: vedoucí vytvořil syntetický lead, operátor jej převzal, uskutečnil simulovaný hovor přes virtuální mikrofon, uložil objednávku v CZK a vedoucí uložil kontrolu. Po obnovení stránky zůstaly objednávka i kontrola uložené. Testovací telefonní adaptér byl pro simulaci dočasně přepnut a následně vrácen do původního `local_sip`; zaznamenaný sandboxový zápis se týkal jen této syntetické práce. Telefonní hovor do skutečné sítě proveden nebyl. Tento úplný průchod proběhl před posledními bezpečnostními migracemi; po nich se znovu ověřily přímé hranice přístupu, celý průchod však zopakován nebyl.
- U syntetické objednávky v sandboxu prošlo doručení, zařazení do P3 na 21 dní, opakované doručení se zachováním původního termínu a vratka se zařazením do P4; události se zachovaly. Výpočet měsíční uzávěrky se zkoušel nad syntetickou objednávkou uvnitř vrácené transakce: výpočet prověřen, trvalý zápis uzávěrky či účetní knihy tím potvrzen není.
- Další změny: formulář pracovníka aktualizuje seznam týmů před otevřením a popisky ovládacích prvků jsou přístupnější; opraveny texty zastaralé stránky pozvánky. Klávesnicí byl upraven syntetický návrh skriptu, uložen a publikován jako testovací verze. Call Logs formátuje hodnotu objednávky jako CZK; zda každý hovor musí nést vlastní měnu, zůstává rozhodnutím produktu.
- Read-only kontrola linked sandboxu potvrdila právě čtyři auditní události změny telefonního adaptéru od 5. 9. do 18. 11. 2026; všechny měly aktéra i detail. Aktuální adaptér je `local_sip`. Během této testovací práce byl adaptér krátce přepnut na `simulation` přímým zápisem do testovací DB a následně vrácen na `local_sip`; tento pomocný přepínač obešel auditní RPC a v `audit_logs` po něm není záznam. Záznam nebyl zpětně vymyšlen ani doplněn. Úplnost starší historie tím ověřena není.
- Po změnách: 1 160/1 160 automatických testů ve 223 souborech, 326/326 místních pgTAP kontrol v 18 souborech, lint, TypeScript, sestavení, kontrola struktury 144 migrací a parita místní databáze i linked sandboxu 144/144 prošly. `git diff --check` také prošel. Kontejner Supabase Vector se při závěrečné kontrole opakovaně restartoval; testované databáze, aplikační port a potřebné Supabase služby odpovídaly.
- Neověřeno: doručení a dokončení nové pozvánky v sandboxu (výchozí SMTP šablonu nelze upravit a její Site URL nesouhlasí s právě běžícím portem aplikace), celá matice oprávnění všech akcí napříč rolemi, skutečná čtečka obrazovky, zvětšení na 200 %, všechny prázdné/nedostupné datové stavy a trvalé zaúčtování měsíční uzávěrky. Tyto body zůstávají otevřené.

### Opakovaný místní průchod po změnách přístupů — 22. 11. 2026

- Aplikace na `localhost:3000` byla v tomto průchodu výslovně spuštěna proti místní Supabase na `127.0.0.1:54321` (DB `127.0.0.1:54322`). Soubory `.env.local` a sandboxu zůstaly oddělené. Před testem i po něm bylo potvrzeno 144/144 migrací; databáze se neresetovala a starší testovací záznamy nebyly měněny. Produkční projekt nebyl kontaktován.
- Administrátor založil syntetického pracovníka a přiřadil jej do Oddělení P4. Pozvánka přišla do místního Mailpitu; uživatel nastavil heslo, přihlásil se a členství operátora v P4 bylo potvrzeno. Odděleně byl připraven syntetický aktivní sandboxový účet operátora a přiřazen do týmu `QA sandbox 22 A`; přístupové údaje jsou uložené v prostoru Countdown, ne v repozitáři.
- Administrátor se přihlásil a otevřel správu pracovníků. Vedoucí i operátor se přihlásili; oba při přímém otevření `/admin/users` dostali jasné upozornění, že stránka je pouze pro administrátory. Tím jsou ověřené základní hranice, ne úplná matice všech akcí a týmů.
- Vedoucí vytvořil nový syntetický lead. Operátor jej převzal z běžné fronty, po krátkém čekání na dostupnost spustil simulovaný hovor, zvolil objednávku a uložil ji za 29,99 USD se syntetickou adresou. Po obnovení stránky zůstala objednávka i adresa uložená. Vedoucí uložil lidskou kontrolu; verdikt výslovně uvádí, že bez přepisu nelze posoudit obsah hovoru. Simulace nevolala do telefonní sítě a objednávka nebyla odeslána.
- První pokus o hovor po ručním přiřazení vrátil `Operator is not available for a call`; po prodlevě, během níž se objevila čerstvá dostupnost, a bezpečném opakování hovor proběhl. Je potřeba ověřit, zda jde o očekávané čekání na heartbeat, nebo o závod při prvním přiřazení. Otevřený bod je veden v [To-Do](To-Do/To-Do.md).
- Kontroly po průchodu: `npm run verify:all` (lint, TypeScript, 1 160 testů ve 223 souborech a build), `npm run verify:migrations` (144 migrací), místní pgTAP 326/326 v 18 souborech a read-only evidence migrací v místní DB i linked sandboxu 144/144 prošly. Použit byl Supabase CLI 3.2.0 přes `npx`, protože příkaz `scoop` na tomto počítači není dostupný. Linkované CLI ověření ukazovalo projekt sandboxu `countdown-crm-sandbox-20260824` (`lpvypihpxhyjljikfzqo`); žádné vzdálené změny databáze se neprováděly.

### Opakovaný sandboxový průchod — 22. 11. 2026

- Izolovaná aplikace běžela na `localhost:3001` a byla připojena k sandboxu `countdown-crm-sandbox-20260824` (`lpvypihpxhyjljikfzqo`), nikoli k produkci. Databáze se neresetovala. Vedoucí byl se souhlasem uživatele přiřazen do syntetického týmu `QA sandbox 22 A`; přiřazení operátora zůstalo aktivní.
- Vedoucí vytvořil nový syntetický lead `QA Ověření 22.11.2026`. Operátor jej převzal a po opakování po chybě inicializace zvuku úspěšně dokončil simulovaný hovor, objednávku za 123 CZK a vedoucí uložil kontrolu hovoru. Po obnovení stránky zůstala objednávka i kontrola uložená. Hovor nešel do telefonní sítě a objednávka nebyla odeslána. Vedoucí otevřel i funkce týmu; přístupové hranice byly ověřeny jen v základních cestách, úplná matice zůstává otevřená.
- Simulační adaptér byl kvůli tomuto testu dočasně zapnut přímou změnou v sandboxu, protože auditní RPC přepnutí na `simulation` odmítá. Po testu byl přes administrační rozhraní vrácen na `local_sip`; tento návrat je v auditu a read-only kontrola potvrdila aktuální `local_sip`. Pomocné zapnutí simulace v auditu chybí. Samostatnou otevřenou žádost o pomoc jsme ponechali; testovací žádost vzniklá při průchodu byla vyřešena.
- Při hovoru uživatel nahlásil, že vyzváněcí tón pokračuje i po spojení a že odkaz na nastavení opustí ovládání hovoru. Kontrola kódu potvrdila chybějící zastavení tónu po spojení. Počáteční návrh otevřít Nastavení v nové kartě byl později nahrazen odstraněním tohoto tlačítka během hovoru; profil zákazníka se otevírá v nové kartě. Automatický průchod původně selhal při inicializaci syntetického mikrofonu. Opravu tónu a chování navigace následně ověřil nový místní simulovaný průchod níže.
- Navazující úprava zdrojového kódu ponechává hovor a přiřazení leadu živé při přechodu mezi stránkami CRM; plovoucí ovládání nabízí zavěšení, mikrofon, podržení a u SIP/Telnyx také hlasitost zákazníkova zvuku. Při obnovení či zavření stránky prohlížeč zobrazí standardní varování. Simulace nemá vzdálený zvuk zákazníka, takže skutečná hlasitost přes SIP/Telnyx zůstává neověřená. Původní změny prošly ESLintem, TypeScriptem a 13 cílenými testy; novější ověření je uvedeno níže.
- Kvůli tomuto pokusu byl vytvořen syntetický lead `QA Zvuk 22.11.2026`. Simulovaný telephony session se po timeoutu uzavřel jako `failed` přes autorizované API; fronta zůstala přiřazená operátorovi bez požadavku na obnovu. Session nebyla spojena ani dokončena a do telefonní sítě se nevolalo. Adaptér byl vrácen na `local_sip`; stav i session byly následně ověřeny read-only dotazy. Pomocné přepnutí adaptéru na `simulation` opět obešlo auditní RPC, návrat přes administrační obrazovku je zaznamenán.
- Při vytváření objednávky se také zobrazovala země `CZ`, ale formulář ji neuložil do svého stavu, dokud uživatel pole nezměnil. První odeslání proto selhalo; po skutečné změně hodnoty a návratu na `CZ` se objednávka uložila. Dalším otevřeným bodem je nefunkční přechod tlačítka „Vytvořit objednávku“ z panelu obnovy; přímé otevření formuláře fungovalo.

### Ověření obnovy ovládání hovoru — 22. 11. 2026

- Aplikace na `localhost:3000` běžela s výslovným připojením k místní Supabase (`127.0.0.1:54321`, databáze `127.0.0.1:54322`). Proměnné pro veřejné připojení i oba názvy serverového klíče byly přepsány hodnotami místní Supabase; `.env.local` zůstal nedotčen. Databáze nebyla resetována a vzdálený sandbox ani produkce nebyly cílem požadavků.
- Syntetický administrátor zahájil simulovaný hovor na syntetickém leadu s falešným mikrofonem. Session přešla přes `ringing` do `connected`. Měření zvukových oscilátorů zachytilo dvě spuštění a dvě zastavení tónu po spojení. Hovor nešel do telefonní sítě.
- Během spojení se aplikace přes navigaci otevřela na `/orders`; plovoucí ovládání zůstalo viditelné a zavěšení přes něj změnilo session na `ended`. Nastavení v plovoucím ovládání nebylo a simulace správně nenabídla posuvník vzdáleného zvuku. Odkaz na profil zákazníka má `target="_blank"`.
- Při prvním obnovení testovací stránky se ztratil stav klientského hovoru a výsledek nešel uložit s prázdným ID session. Server nyní dohledá poslední neuzavřenou ukončenou session podle workspace, operátora a přiřazení; opakované uložení výsledku přes UI uspělo. Syntetické přiřazení je uzavřené a telephony session je spojena se záznamem hovoru; objednávka v tomto konkrétním testu nevznikla.
- Otevřené zůstává ověření skutečného zvuku a posuvníku zákazníka přes SIP/Telnyx. Simulace nemá vzdálený zvuk zákazníka. Místní kontroly: 21 cílených testů, TypeScript, ESLint a `git diff --check` prošly; produkční build prošel před posledním drobným upravením posluchače stavu hovoru.

### Webhook kurýra

Endpoint `/api/carriers/webhook` přijímá události pouze tehdy, když jsou nastavené serverové proměnné `CARRIER_WEBHOOK_SECRET` a `CARRIER_WEBHOOK_WORKSPACE_ID`. Druhá proměnná určuje jediný workspace, jehož objednávky může tento endpoint aktualizovat; samotný `workspace_id` v těle požadavku není důvěryhodný. Pokud proměnná chybí, endpoint vrací HTTP 503 a události nezpracuje. Tajný klíč ani jeho hodnoty neukládej do repozitáře nebo `NEXT_PUBLIC_*`.

### Odchozí webhooky automatizací

Serverové webhooky automatizací přijímají pouze cíle přes HTTPS na portu 443. Před odesláním se DNS přeloží a spojení se připne na ověřenou veřejnou IP adresu; lokální, privátní, link-local, testovací a další speciální rozsahy se odmítají. Přesměrování se nenásledují a požadavek má limit 10 sekund. Webhook na HTTP, vlastním portu nebo pouze interní IPv6 adrese proto není podporován.

### Historické ověření prostředí — od 11. 11. 2026

Následující body jsou dobové výsledky včetně pozdějších doplňků, ne aktuální návod ani stav prostředí.

- Při tehdejší kontrole běžné `npm run dev` používalo `.env.local` a připojovalo aplikaci k sandboxu `countdown-crm-sandbox-20260824`; lokální Supabase byl oddělený stack na portech 54321/54322. Docker při kontrole běžel a lokální Supabase odpovídala; při dřívějším pokusu byl daemon dočasně nedostupný.
- Node.js 26.12.0 a npm 11.20.0 splňují požadavky projektu. Smoke test byl opraven: používá aktuální trasy a jako selhání počítá HTTP 4xx/5xx, chyby JavaScriptu a konzole i viditelný chybový stav načítání dat; neúspěšné interakční kontroly také nastaví neúspěšný exit code. Lze mu předat již běžící lokální server přes `SMOKE_TEST_BASE_URL` a přihlášení přes `SMOKE_TEST_EMAIL` / `SMOKE_TEST_PASSWORD`; tím se nekoliduje s vývojovým serverem a test jej nevypíná. Ověření proti lokální aplikaci a syntetickým datům jako administrátor skončilo 20/20 tras a 5/5 kontrol včetně přihlášení a chyb během interakcí, bez HTTP, konzolových a JS chyb. Demo-autentizovaný běh sám o sobě není důkazem rolového přístupu; pro tento průchod bylo použito skutečné lokální přihlášení.
- Dashboard potvrdil zdravý stav projektu a po přípravě účtu 14 Auth účtů; ve workspace je 1 `administrator`, 5 `team_leader` a 7 `operator`. Nový syntetický účet `qa.team-leader@example.test` je potvrzený a má roli `team_leader`; jeho e-mail a heslo jsou pouze v místním `.env.local`. Přihlašovací údaje dříve pojmenované jako Team Leader patří jedinému `administrator`; jeho roli jsme zachovali. Tajné hodnoty se do výstupu ani dokumentace nekopírují.
- Nový Team Leader se skutečně přihlásil do lokální Next.js aplikace připojené k sandboxu. `/team`, `/team/reviews`, `/team/exceptions` a `/schedule` vrátily HTTP 200; nebyly zaznamenány odpovědi HTTP 500 ani chyby JavaScriptu. Přihlášení a obrazovky administrátora i operátora byly ověřeny v předchozím průchodu.
- S reálným admin přihlášením v místním Next.js vrátily `/workspace`, `/orders`, `/settings/users` a `/admin` HTTP 200 bez chyb JS ani odpovědí 4xx/5xx. Operátor se přes UI přihlásil, načetl `/settings` a úspěšně uložil nezměněnou hodnotu osobní hlasitosti; po obnovení zůstala stejná. Tím se ověřilo čtení a zápis předvoleb pod rolí operátora; aktualizovalo se pouze technické `updated_at`.
- `npm run verify:parity` po startu Dockeru zjistil 5 chybějících lokálních migrací. Po kontrole jejich obsahu byly aplikovány výhradně na lokální DB příkazem `npx supabase db push --local --yes` (bez `--include-seed`, bez resetu a bez zásahu do linked sandboxu); následná parita je 137/137. Po lokálním QA průchodu DB obsahuje 1 administrátora, 2 workspace, 2 týmy, 6 leadů, 6 položek fronty, 6 produktů, 1 objednávku a 1 dokončený hovor.
- Lokální průchod administrátora po opravě UUID validace: přihlášení prošlo a všech 13 hlavních tras včetně `/products` a `/team` vrátilo HTTP 200 bez chyb JavaScriptu. Následně byla příčina tří chybajících obrázků odstraněna: lokální seed už neukládá URL souborů, které v `public/` neexistují, a katalogy zobrazují přístupný stav „No product image“ také při nefunkčním odkazu. Ověření `/products` později našlo tři fallbacky, žádné požadavky na obrázky, HTTP chyby ani chyby JavaScriptu. Lokální fronta po průchodu měla 3 volné položky a tabulka událostí fronty zůstala prázdná.
- Sandboxový rolový průchod po přihlášení: operátor otevřel Operator Console a prošel 12 tras, Team Leader prošel 14 tras; vše HTTP 200, bez HTTP chyb a chyb JavaScriptu. Před a po otevření Console měl operátor stejný počet přiřazených položek fronty. Jde o syntetická data sandboxu.
- Hlavní scénář byl ověřen pouze lokálně s novým syntetickým leadem a QA účty: Team Leader vytvořil lead, operátor jej převzal, simulovaný hovor dokončil výsledkem `order_placed`, vytvořil objednávku za USD 29.99 a Team Leader uložil první lidskou kontrolu hovoru. Stránka kontroly i ukládání doběhly bez HTTP chyb a chyb JavaScriptu; databáze potvrzuje uzavřenou položku fronty bez recovery a jednu revizi kontroly. Sandbox nebyl změněn.
- Omezení lokálního průchodu: úspěšný hovor trval podle serverových časů 0,401 s; databáze délku ukládá v celých sekundách zaokrouhlených na nejbližší sekundu, proto výsledek 0 s odpovídá krátkému testovacímu hovoru a není potvrzenou chybou měření. Delší hovor samostatně ověřen nebyl. Dva jiné nově vytvořené QA leady zůstaly po přerušených pokusech ve stavu `awaiting_outcome` s `recovery_required=true`; tento stav je záměrný, aby operátor doplnil výsledek, a záznamy zůstaly zachované. Ověřena a opravena byla chyba tlačítka `Recover`, které původně nevedlo k volbě výsledku; nyní panel zobrazí a přesune na něj fokus. Průchod recovery panelem při šířkách 320, 390 a 1280 px prošel bez horizontálního přetečení, HTTP chyb a chyb JavaScriptu; na 320 a 390 px byl ověřen také režim omezeného pohybu.
- Smoke test nyní spolehlivě selhává na HTTP 4xx/5xx a chybách konzole/JavaScriptu. Autentizovaný běh pod účtem operátora prošel 14/20 tras; neúspěšné trasy (`/team`, `/team/exceptions`, `/leads`, `/audit`, `/telephony`, `/automations`) odpovídají omezením role operátora, nikoli databázovým chybám. Interakční kontroly prošly 4/5; jediná neúspěšná je administrátorská kontrola Users & Teams. Team Leader i administrátor byli ověřeni samostatně níže.
- Délka hovoru delší než 1 s byla ověřena lokálně se syntetickým QA leadem a simulovaným režimem, naposledy bez umělého zdržení: hovor trval podle serverových časů 7,264 s a do `calls.duration_seconds` uložil 7, což odpovídá `ROUND(call_ended_at − call_started_at)`. Operátor hovor ukončil tlačítkem `Ukončit hovor`, položka fronty přešla do `awaiting_outcome` událostí `outcome_pending` (nikoli `interrupted`) a po výsledku `Nedostupný` se uzavřela bez `recovery_required`. Byly odstraněny obě příčiny dřívějšího přerušení: `getScopedLeadForWorkspace` pro operátora ověřuje vlastnictví bez mutujícího `get_current_lead` a obnovení přehledu konverzace v Console se během stavu `in_progress` už neprovádí, protože volalo `get_current_lead` a převádělo běžící hovor do `awaiting_outcome`. Dřívější hodnoty 0 a 3 s odpovídaly přerušení po 0,401 s a záměrnému zdržení požadavku o 3 s.
- Opakovaný smoke běh 11. 11. 2026 proti lokálnímu serveru připojenému k sandboxu: administrátor 20/20 tras a 5/5 interakcí, Team Leader 19/20 tras a 4/5 interakcí, operátor 14/20 tras a 4/5 interakcí. Jediná selhání odpovídají omezením rolí (`/telephony`, `/team`, `/leads`, `/audit`, `/automations` a administrátorská kontrola Users & Teams); ani jeden běh nevrátil HTTP 500.
- Chybějící řádek `workspace_user_preferences` sám o sobě nezpůsobuje HTTP 500: `getUserPreferencesForWorkspace` vrací výchozí hodnoty s `persisted=false` a stránka Settings je zobrazí. Předvolby testovacích účtů byly doplněny: operátor je měl, Team Leader je uložil přes UI bez HTTP/JS chyb a administrátorské účty dostaly výchozí řádek s hlasitostí 80. Ověřeno dotazem do sandboxu.
- Pro administrátorský smoke běh byl v sandboxu vytvořen syntetický účet `qa.admin@example.test` s rolí `administrator` a doplněnými předvolbami. Jeho heslo je pouze v místním `.env.local`; do dokumentace se nekopíruje.
- Při ručním přihlašování po ztrátě session se v dev logu objevil jeden `POST /login` s HTTP 500 z `heartbeatLeadAssignmentAction` (`Error: Unauthorized`): stará Console komponenta zavolala akci bez platné session. Nesouviselo to s `user_preferences`. Opraveno: akce nyní neplatnou session vrátí jako no-op (`null`) a obě klientské smyčky heartbeat po této odpovědi zastaví; ostatní chyby se dál předávají. Ověřeno testem `tests/lead-queue-heartbeat-action.test.ts`.
- Kontroly po tomto kroku: `npm run lint` prošel, `npm run typecheck` prošel a `npm test` 987/987.

### Obnova hesla

Stránky `/auth/forgot-password` a `/auth/update-password` se stejně jako přihlášení zobrazují bez navigace pracovního prostoru.

Obnovovací e-mail se vrací na `/auth/confirm` na stejné doméně, ze které uživatel o obnovu požádal. Přesnou návratovou adresu je nutné povolit v Supabase Auth Redirect URLs pro dané prostředí; pro lokální provoz se `localhost` a `127.0.0.1` posuzují samostatně. Odkaz PKCE je nutné otevřít ve stejném prohlížeči, ve kterém vznikla žádost. Funkčnost doručení e-mailu a návratu ověřuj samostatně na testovacím účtu.

## Katalog pro lokální demo

`data/seeds/catalog-seed-template.json` je vstupní šablona. Po její úpravě spusť:

```powershell
npm run seed:catalog
```

Skript ověří strukturu a povolená pole, sestaví bezpečné HTML skriptů a vygeneruje `supabase/seed.sql`. Jde o lokální demo seed; příkaz nenasazuje katalog do vzdáleného projektu.

## Migrace a parita

Kontrola počtu a duplicitních verzí:

```powershell
npm run verify:migrations
```

Parita vůči lokální databázi:

```powershell
npm run verify:parity
```

Parita vůči linked projektu:

```powershell
node scripts/verify-migration-parity.mjs --linked
npx supabase migration list --linked
```

Kontrola 21. 11. 2026: skript používá výslovně `--local` nebo `--linked` a strojový JSON výstup CLI. Repozitář obsahuje 142 migrací; linked sandbox i produkce (`--project-ref`) hlásí 142/142. Lokální parita nebyla při této kontrole ověřena, protože lokální Docker databáze nebyla dostupná. Kontrola porovnává evidenci verzí, nikoli skutečný obsah databázových funkcí.

Linked kontrola vyžaduje přihlášení do správného projektu. CLI je propojena se sandboxem; pro produkci použij výslovný `--project-ref` a samostatný token. V `.env.local` jsou pro tyto účely `SUPABASE_SANDBOX_LINK_TOKEN` a `SUPABASE_PROD_ACCESS_TOKEN`; starší `SUPABASE_ACCESS_TOKEN` a `SUPABASE_MIGRATE_ACCESS_TOKEN` tam rovněž existují, ale jejich aktuální oprávnění se z dokumentace neověřují. Starý produkční migrační token byl odvolán. Token nepatří do repozitáře ani výstupu a jeho platnost ověř v Supabase účtu. Uživatel souhlasí s opakovaným read-only čtením evidence migrací v propojeném testovacím sandboxu bez dalšího dotazu; oprávnění umožňující zápis samo o sobě není souhlasem ke změně databáze.

### Nasazení chybějících migrací

Nejdříve zkontroluj cílový projekt a plán:

```powershell
npx supabase db push --linked --dry-run
```

Teprve po kontrole dry-run a potvrzení, že jde o správný sandbox, může oprávněný operátor spustit:

```powershell
npx supabase db push --yes --linked
node scripts/verify-migration-parity.mjs --linked
```

`migration repair` mění evidenci aplikovaných migrací. Použij ho pouze po ručním porovnání názvů a schématu; sám neopraví schéma databáze. Migraci neoznačuj jako aplikovanou ani nevrácenou odhadem. Při nejasném driftu zastav a zjisti původ.

### Zaznamenané nasazení 21. 11. 2026

- Sandbox: migrace `20261118120000` a `20261118130000` aplikovány; parita 142/142. Přímé zápisy do `audit_logs` a `workspace_telephony_settings` jsou odmítnuty, RPC `update_telephony_adapter_with_audit` funguje a vytvořil auditní záznam.
- Produkce: aplikováno pět chybějících migrací `20261116120000`, `20261116130000`, `20261117100000`, `20261118120000`, `20261118130000`; parita 142/142.
- Aplikace: produkční Vercel deployment READY z `d648a0c`; funkční kontrola `/admin/settings` potvrdila sekci „Adaptér telefonie“. Místní SIP v produkci aktivní není, adaptér nebyl přepnut. Preview `work/clean-baseline` měl READY deployment z `9e26d1f` a funkční kontrolu stejné sekce.

## Bezpečnostní hranice

- Vzdálené migrační operace mohou měnit schéma sandboxu. Nepoužívej je jako běžný lokální test.
- Tokeny mají časovou platnost; jejich aktuální platnost ověř v účtu, ne podle historických dat v dokumentaci.
- Nepoužívej `SUPABASE_SERVICE_ROLE_KEY` jako náhradu za scoped migrační token.
- P0.3 linked evidence runner je oddělený read-only postup s užším tokenem; viz [runner P0.3](P0_3_REMOTE_DB_RUNNER.md).
