# Aktuální stav, jednotné To-Do a Desatero

**Snapshot:** 21. 9. 2026

**Detailní zdroj pořadí práce:** tento dokument

**Stav:** dokončený checkpoint P0.1–P0.3, P1 stabilizační/UI vlna, první bezpečná vlna P2 týmů, Team Checkpoint a interní P1.5 onboardingový trénink. Production zůstává beze změny. Ruční i post-call objednávky mají ověřený adresní snapshot a read-back; Team Leader pracovní plocha, Daily Brief, callbacky, týmová analytika a AI doporučení mají ověřený nebo zdokumentovaný týmový rozsah. Trénink ukládá coaching feedback bez skóre, má bezpečný lokální fallback a oddělené modely Gemini: `gemini-3.5-flash-lite` pro AI zákazníka a `gemini-3.6-flash` pro závěrečné hodnocení. Další práce se má soustředit na ověřený pilotní pracovní den, směny a dostupnost, dotažení training UX a stabilitu AI provideru; týmové vlastnictví se zatím nerozšiřuje do workflow, produktů a Walletu.

## Co je skutečně hotové

- Operator Console má serverem řízený assignment, callback/recovery, Customer 360,
  Conversation Brief, Product Script a idempotentní post-call zápis.
- Role-aware vstup směruje operátora do konzole, Team Leadera do Exception Queue
  a administrátora do Workspace Readiness.
- Exception Queue je nasazená a ověřená přes autentizované role i záporné
  workspace/role scénáře. Team Leader nově vidí pouze týmové queue výjimky;
  workflow a chybějící produktové skripty jsou výslovně administrátorské.
- Team Leader Review pracuje s reálným uloženým hovorem, neměnným snapshotem
  skriptu, append-only revizemi hodnocení a auditem. Linked sandbox prošel
  autentizovaným smoke testem včetně cleanupu.
- AI kontrola kvality poznámek je oddělená od tréninku, spouští se u všech
  uložených reálných hovorů, vytváří `pending`, používá Gemini
  `gemini-3.6-flash`, rediguje kontaktní údaje a ukládá pouze doporučení.
  Anonymizovaný end-to-end průchod včetně atomického claimu prošel; detail je v
  `docs/superpowers/reports/2026-09-16-gemini-call-quality-verification.md`.
- Osobní preference operátora jsou serverové, workspace-scoped a chráněné RLS.
- Aktuální pracovní strom prošel 687/687 aplikačními testy, lintem,
  typecheckem, produkčním buildem, `git diff --check` a autentizovaným
  Playwright smoke testem tréninku.
- Linked migration history **není plně srovnaná**: Sandbox obsahuje historické
  migration ID, která nejsou v lokálním repozitáři. Nová training migrace byla
  proto ověřeně aplikována cíleně; `db push` se nesmí spouštět hromadně bez
  samostatného rozhodnutí o opravě historie.
- P0.3 je skutečně uzavřené: linked runner provedl read-only ověření 8/8
  databázových kontraktů. Použil oddělenou identitu s pouze `Database: Read` a
  `Data API Config: Read`; produkce nebyla použita a žádný zápis neproběhl.
- Aktuální nasazení je interní systém pro jednu konkrétní firmu. Leaked-password
  protection zůstává vědomě vypnutá a zapne se před případnou expanzí na trh;
  projekt se proto nyní nevydává za externě pilot-ready Auth.
- Dílčí výpadky zdrojů, role-aware navigace a pravdivý stav Call Logs mají
  samostatné kontrakty v aplikačních testech. Jeden nedostupný zdroj se nevydává
  za ověřenou nulu ani neskrývá nezávislá dostupná data.
- Všechny CRM cesty používají společný Operator Console designový systém.
  Kompletní migrace ověřena: `docs/superpowers/reports/2026-09-13-unified-design-system-complete-verification.md`.
  Admin browser smoke ověřil Dashboard, Workspace, Products, Calls, Team,
  Monitor, Training, Wallet, Readiness, Telephony, Settings, Exceptions,
  Analytics, Objects; Workspace prošel i na šířce 390 px bez browser chyb.
  Tento důkaz nenahrazuje samostatný průchod operátora a Team Leadera (bod 7).

Hotový bod se do priorit níže nevrací. Pokud se objeví regrese, zapisuje se jako
nový konkrétní problém s vlastním důkazem.

## Doporučený směr dalších pěti oblastí

Po auditu bych nyní nevolil další velkou izolovanou funkci. Produkt má zdravý
základ; největší přínos přinese dotažení pracovního dne operátora, odstranění
rozporů mezi tím, co UI slibuje, a tím, co data skutečně říkají, a stabilnější
pilot. Doporučené pořadí:

1. **Pilotní pracovní den operátora — dotažení existujícího produktu (P0/P1).**
   Projít jeden úplný scénář: přihlášení → převzetí leadu → hovor → výsledek
   nebo objednávka → callback → reload → kontrola v Team Workspace. Doplnit
   živé důkazy persistence, rolí a cross-workspace hranic. To je nejvyšší
   priorita, protože potvrzuje CRM jako celek, ne jen jednotlivé obrazovky.
2. **Směny, dostupnost a pravdivé Talk Time — nová podpůrná funkce (P1/P2).**
   Navrhnout jediný serverový model směn, absencí, plánované dostupnosti a
   přesčasů. Team Checkpoint pak může zobrazovat skutečné konverze a Talk %
   místo dnešních nedostupných hodnot. Nezačínat grafy; nejprve vytvořit zdroj
   pravdy a role-aware pravidla.
3. **AI trénink jako použitelný onboarding — redefinice již implementované
   funkce (P1.5).** Ověřit více než jeden browserový tah, historii po reloadu,
   Team Leader review, fallback při `429/503`, limity opakování a skutečnou
   dostupnost speech UX. Rozhodnout, zda zůstáváme u textové/diktovací
   pipeline, nebo investujeme do realtime voice. Nehonit chytřejší AI, dokud
   není stabilní pracovní zážitek.
4. **UI/UX polish a lokalizace kritických cest — cílený polish upgrade (P1).**
   Udělat průchod tabulkami, metrikami, empty/error/unavailable stavy a češtinou
   napříč `/workspace`, `/team`, `/training` a review. Sjednotit hierarchii
   hodnoty a metadat, délku textů, názvy stavů a sémantiku barev.
5. **Provozní stabilita AI, migrací a telefonie — technická připravenost
   pilotu (P1/P2).** Zastavit retry při `429`, měřit provider latency a
   fallbacky bez logování citlivých dat, zdokumentovat modely/kvóty a bezpečně
   vyřešit migration-history drift. Telnyx řešit až po získání čísla; do té
   doby nepředstírat živou telefonii ani realtime monitoring.

**Co bych nyní nedělal:** další dashboard, další AI skóre, rozšiřování Walletu
do týmů ani obecný „AI copilot“. Nejdříve musí být spolehlivý základní pracovní
den, pravdivé metriky a opakovatelný pilotní důkaz.

## Jediné pořadí další práce

Jednotlivé body se řeší shora dolů. Nový implementační plán smí přeskočit vyšší
prioritu jen tehdy, když je blokovaná externím vstupem nebo checkpoint doloží, že
už není relevantní. Každý větší bod dostane před implementací vlastní návrh,
akceptační kritéria a důkazní plán.

### P0 — bezpečnost a shoda databáze před pilotem

1. [x] **Vysvětlit linked drift projektových funkcí.** Přímé katalogové srovnání
   prokázalo shodu všech 80 projektových funkcí po normalizaci pouze CRLF/LF,
   včetně signatur, security režimu, konfigurace a ACL. Devět funkcí v raw public
   diffu je známý Windows line-ending false positive Supabase enginů, ne logický
   drift. Reprodukovatelný `npm run verify:linked-functions` nyní skutečný rozdíl
   odmítne; žádný migration repair ani no-op migrace nevznikly.
2. [x] **Prověřit pět RPC funkcí typu `SECURITY DEFINER`, které může volat role
   `authenticated`, a umístění `pgtap`.**
   Jde o wallet a call-completion hranice označené linked Security Advisorem.
   Každá musí mít explicitní workspace/role kontrolu, minimální grant a negativní
   test; změna na invoker/revoke se provede jen podle skutečného kontraktu.
   Extension `pgtap` se přesune mimo exponované `public` schéma bezpečným postupem.
   - Dokončeno: stabilní veřejné RPC signatury jsou invoker wrappery,
     privilegovaná těla jsou v `private`, granty a záporné role/workspace/call
     scénáře kryjí testy a idempotentní migrace přesouvá `pgtap` do `extensions`.
     Linked historie je 86/86, katalogový read-back potvrdil security režim,
     signatury, ACL i prázdný `search_path`, `pgtap` 1.3.3 je v `extensions` a
     linked advisor už původních šest příčin nehlásí.
   - Hotovo, když advisor nálezy mají odstraněnou příčinu nebo zdokumentované
     bezpečné odůvodnění podložené testem a `pgtap` už není v `public`.
3. [x] **Definovat bezpečný privileged runner pro vzdálené databázové důkazy.**
   Současný secret key zvládá Auth admin operace, ale Data API nemá grant na
   `public.workspaces`; lokální pgTAP proto není vzdálený důkaz. Široké granty se
   nesmějí přidat jen kvůli testu.
   - Dokončeno: runner v `scripts/p0-3-remote-db-evidence.mjs` používá
     oddělený scoped token, read-only SQL endpoint a autoritativní PostgREST
     config endpoint. Linked běh prokázal 8/8 kontraktů; sanitizovaný report je
     v `docs/superpowers/reports/2026-09-07-p0-3-linked-run.md`.
   - Runner se nepoužívá jako produkční readiness test a jeho token nesmí být
     uložený v repozitáři, browseru, Docker image ani logu.
4. [ ] **Před externí expanzí uzavřít produkční Auth hardening.**
   Pro současný interní provoz jedné konkrétní firmy je leaked-password
   protection vědomě odložená a zůstává vypnutá. Při expanzi na trh nebo před
   externím pilotem ji zapnout, znovu projít Auth smoke test a ověřit, že
   `NEXT_PUBLIC_ALLOW_DEMO_AUTH` není v pilotním prostředí dostupné.
   - Tento bod není technicky hotový; je pouze odložený podle aktuálního
     produktového scope.

### P1 — stabilní a pravdivá hlavní pracovní smyčka

1. [x] **Izolovat dílčí selhání dat.** Jeden nefunkční zdroj nesmí skrýt nezávislý
   užitečný výsledek. Prioritně: Next Best Action, Recent Context, Products,
   Team queue a Analytics; současné `Promise.all` kontrakty se posoudí jednotlivě.
   - Hotovo, když chování při každém relevantním dílčím výpadku pokrývá test a UI
     rozliší částečná data od úplného selhání.
2. [x] **Sjednotit role-aware navigaci a pravdivost ploch.** Sidebar, hlavička a
   command palette mají používat jeden zdroj pravidel. Team Leader musí vidět
   svou frontu; operátor nesmí dostávat manažerské nebo nepoužitelné cíle.
   Neaktivní Live Monitor a zmrazené plochy se skryjí nebo přesně označí.
   - Hotovo, když matice tří rolí souhlasí se server guardy a má navigační testy.
3. [x] **Opravit zavádějící text Call Logs.** UI nyní rozlišuje ověřený zachycený
   přepis od nedostupného stavu; nezaručuje zvuk ani přepis pro každý hovor.
   - Hotovo, když copy přesně rozlišuje uložený transcript od nedostupného stavu.
4. [x] **Sjednotit celý CRM vzhledem Operator Console.** Zavést společný systém
    povrchů, tlačítek, stavových prvků a metrik; upravit stručnost textů a
    nechat barvy výhradně pro potvrzený výsledek, nutnou pozornost a riziko.
    Stejný prvek nesmí podle stránky měnit neprůhlednost, okraj, radius ani
    význam barvy.
    - Schválený návrh: `docs/superpowers/specs/2026-09-11-unified-operator-console-design-system.md`
    - Plán: `docs/superpowers/plans/2026-09-11-unified-operator-console-design-system.md`
    - Důkaz dokončení: `docs/superpowers/reports/2026-09-13-unified-design-system-complete-verification.md`
    - Dokončeno: **všechny 19 CRM cest** (12 opravených + 7 už kompatibilních) používají sdílené primitivy `Button`, `Surface`, `Status`, `MetricCard`, `PageHeader`. 3 workspace komponenty (`ConversationBriefCard`, `ClientProfileCard`, `OperatorCallControls`/`CallOutcomePanel`) migrovány. Barevná politika dodržena: zinc default, barvy pouze pro sémantické stavy. 548 testů, lint, typecheck, build — PASS.
5. [x] **Dokončit Entry, Dashboard a Workspace state completeness.** Sjednotit
    Login, Dashboard, Workspace, loading/empty/unavailable/error/success stavy,
    modaly a úzké viewporty podle stejných pravidel Operator Console.
    - Specifikace: `superpowers/specs/2026-09-12-entry-workspace-state-completeness-design.md`
    - Plán: `superpowers/plans/2026-09-12-entry-workspace-state-completeness.md`
    - Ověření: `superpowers/reports/2026-09-12-entry-workspace-state-completeness-verification.md`
    - Doplňkové ověření: `superpowers/reports/2026-09-13-unified-design-system-complete-verification.md`
     - Dokončeno: Login, Dashboard, Workspace včetně modulů a úzkého viewportu (390px) dodržují designový systém. Všechny entry/workspace stavy používají sdílené primitivy.
6. [x] **Zjednodušit Operator Console kolem Klientského profilu a ověřené adresy.**
   Základní kontext přesunout do hlavičky přiřazeného zákazníka, odstranit
   Compact / Extended režim, umožnit zvětšení Product Scriptu bez ztráty identity
   klienta a otevřít read-only Klientský profil v nové kartě. Operátor smí pouze
   přidávat sdílené poznámky. Nové objednávky musí v ručním i post-call toku
   atomicky uložit validovaný snapshot doručovací adresy. „Poslední ověřená
   doručovací adresa“ smí pocházet jen z nejnovější skutečně doručené objednávky;
   historická data se nedoplňují.
   - Schválený návrh je commit `ae5c014`; provedení rozepisuje aktuální plán
     `2026-09-11-operator-client-profile-and-verified-address.md`.
   - Implementace datového modelu, obou atomických objednávkových toků a UI je
     na `main` v commitech `a165a69`, `a402129` a `e4b7f5a`. Následný
     autentizovaný P1.7 smoke s izolovanými testovacími účty prokázal kartu,
     poznámku, reload a odmítnutí cizího assignmentu. Oprava autorizační
     hranice poznámek je v `e7c731d`.
   - Dokončeno: ruční objednávka prošla browserem včetně obnovení detailu a
     zobrazení adresy. Post-call objednávka prošla autentizovanou serverovou
     hranicí se skutečným Team/Operator kontextem a SQL read-backem hovoru,
     session, objednávky, položky, adresy a auditu. Browserová simulace hovoru
     se kvůli chybějícímu přístupu k mikrofonu nepřipojila; systém proto správně
     nic nepředstíral a přešel do recovery. Důkaz: `superpowers/reports/2026-09-15-p1-7-order-evidence.md`.
7. [x] **Provést souvislý browser smoke test celého pracovního dne.** Odděleně jako
   operátor, Team Leader a administrátor, včetně reloadu, persistence, prázdných
   stavů a přímých URL.
   - Hotovo, když report obsahuje kroky, identity rolí bez tajných údajů, read-back
     a cleanup; unit/build test se za tento důkaz nevydává.
   - Dokončeno v linked sandboxu: `superpowers/reports/2026-09-14-p1-7-full-shift-smoke.md`.
8. [ ] **Prověřit runtime závislosti telefonie.** Bezpečné patch aktualizace
   proběhly, ale Telnyx/uuid větev a posouzení install skriptů zůstávají otevřené.
   Automatický audit navrhuje nevhodný major downgrade Telnyx SDK, který se bez
   kompatibilitního testu nepoužije. Živý provider navíc čeká na dostupné číslo.
   - Část hotová: Next.js critical advisory je opravený na `16.3.5`; po patchi
     zůstaly pouze tři moderate nálezy v Telnyx/uuid řetězci.
   - Záměrné rozhodnutí: dokud není číslo a stabilní telefonní návrh, nepřidáváme
     novou pre-call UI diagnostiku ani neměníme telefonní adapter.
   - Důkaz a zbývající kroky: `superpowers/reports/2026-09-14-p1-8-runtime-dependency-audit.md`.

### P1.9 — Přechod na další neblokovanou práci

P1.8 je rozdělené na dvě oddělené části: bezpečné patch aktualizace jsou hotové,
zatímco kompatibilita Telnyx/uuid a živý provider zůstávají externě blokované.
P1.9 proto nepřidává telefonní funkcionalitu ani dočasnou
diagnostickou obrazovku, která by se mohla změnit spolu s providerem.

Další práce může pokračovat pouze nad neblokovanou částí roadmapy. P2 Team
Model má schválenou specifikaci, implementační plán, foundation, přiřazení P1/P2/P3,
team scope pro leady/frontu, historické snapshoty a Team Leader RLS v Sandboxu.
Přes skutečné přihlášení byly ověřeny administrátorský i Team Leader pohled včetně
team-scoped seznamu a povoleného přímého detailu cizí objednávky/review; operátor
má stejný read-only detailní průchod. Exception Queue už nesděluje Team Leaderovi
globální workflow/product problémy. Production zůstává beze změny. Otevřené zůstávají
linked concurrency důkaz snapshotů a další rozšíření týmové pracovní plochy; callbacky,
read-only presence, `/team` pohled a týmová analytika mají první ověřený průchod. Telnyx se
vrátí do práce až s číslem, ověřenou konfigurací a rozhodnutím k `uuid` větvi.

### P1.5 — P2 onboarding trénažér (interní pilot)

Trénažér je bezpečný nástroj pro operátora, který si před prvními ostrými
hovory procvičí reálný P2 outbound/free-sample rozhovor s AI zákazníkem. Není
to obecný AI simulátor, herní plocha ani náhrada živé telefonie. Vznikne až po
uzavření P1: potřebuje pravdivý Call Log, ověřenou hranici zápisu hovoru,
neměnný snapshot Product Scriptu a funkční Team Leader Review. Skutečné týmy
nejsou pro první workspace-scoped pilot závislostí; týmové porovnávání výsledků
se však odloží až za P2.

1. **Použít pouze jeden až dva schválené P2 skripty.** Operátor vybírá skript a
   obtížnost, ne katalog nesouvisejících produktů. Cvičení používá konkrétní
   publikovanou verzi skriptu; jméno fiktivního zákazníka se do něj bezpečně
   předvyplní.
2. **Vést jeden přirozený cvičný hovor.** AI zákazník reaguje jako zákazník,
   klade přirozené otázky a podle zvolené obtížnosti přidává námitky. Při
   úspěšném průchodu může nabídku přijmout a předat výhradně fiktivní, ale
   věrohodné doručovací údaje. Cvičení nikdy nevytváří objednávku, callback,
   workflow událost ani zásah do skutečné fronty.
3. **Uložit ho do Call Logu jako jasně oddělený tréninkový hovor.** Záznam
   obsahuje přepis, použitý skript a automatické vyhodnocení. Je viditelně
   označený jako trénink a nesmí zkreslovat ostré obchodní výsledky. Team
   Leader jej kontroluje stejným review mechanismem jako reálný hovor; nevzniká
   druhý paralelní systém hodnocení.
4. **Compliance vyhodnocovat odděleně od chování zákazníka.** První závažné
   zakázané tvrzení se okamžitě uloží do výsledku, ale AI zákazník běžně
   pokračuje přirozeně. Teprve opakované nebo zvlášť závažné jednání může
   důvěryhodně změnit jeho reakci. Závažná chyba neumožní označit cvičení za
   splněné, ani kdyby zákazník simulovanou nabídku přijal. Výsledek musí uvést
   přesnou větu, důvod a bezpečnější formulaci; lidský verdikt Team Leadera
   zůstává oddělený od automatického pravidlového nálezu.
5. **MVP neobsahuje nahrávku.** Zdroj důkazu je úplný chronologický přepis a
   snapshot skriptu. Audio recording, retence a playback jsou samostatný
   pozdější projekt a nesmějí se vydávat za součást tohoto pilotu.
6. **Odstranit herní a technický šum.** Operátor nemá řídit fáze klikáním,
   sledovat náladoměr/trpělivost ani řešit poskytovatele AI. Obrazovka ukáže
   pouze účel cvičení, skript, přirozený průběh hovoru a po skončení konkrétní
   zpětnou vazbu. Automatické pravidlo, AI odpověď a pozdější lidské hodnocení
   budou vždy pravdivě rozlišené.
7. **Před implementací vytvořit samostatný návrh a důkazní plán.** Musí
   popsat hranici mezi tréninkovým a ostrým hovorem, idempotentní zápis,
   autorizaci operátora/Team Leadera, fallback při nedostupné AI nebo mikrofonu
   a kontrolní scénáře včetně compliance porušení.

8. **Provést speech-to-text validační spike v AI trenažéru.** Trénink slouží
   jako první bezpečné prostředí pro ověření, že mluvený vstup operátora lze
   převést na ověřitelný text a zobrazit v tréninkové timeline. Přepis zůstává
   označený jako `training` a ukládá se do tréninkových session/turnů, nikdy
   přímo do ostrého `calls` bez skutečného telephony source.
   - **Browserová UX část je implementovaná:** `src/lib/speechRecognition.ts`
     používá `SpeechRecognition`/`webkitSpeechRecognition`, trénink má explicitní
     stavy `listening`, `processing`, `ready`, `error` a `unsupported`, přepis
     lze před odesláním upravit a ukládá se zdroj `browser_speech` s confidence.
   - Audio se v tomto spiku neukládá. Jde o browserový recognition kontrakt,
     nikoli o serverové nahrávání nebo Gemini transcription.
   - Zbývá autentizovaný browserový smoke test s mikrofonem na podporovaném
     prohlížeči: známý krátký skript, diakritika, pauzy, námitky, odmítnutí
     oprávnění a opakování po chybě. Akceptace musí rozlišit skutečný text od
     mezistavu či nedostupnosti; systém nesmí text domýšlet.
   - Je nutné rozlišit browserové speech recognition od serverového přepisu
     stejného audio formátu přes schválený AI provider. První nyní ověřuje UX,
     druhé bude teprve ověřovat transcription pipeline.
    - Tento spike ověří transcription vrstvu a její UI, ale **nenahradí důkaz
      telefonie**: po napojení Telnyx/SIP se musí stejný kontrakt zopakovat nad
      nahrávkou obsahující skutečný zvuk obou stran, včetně retention, vazby na
      `telephony_call_sessions` a read-backu do Call Review.
    - **Částečný smoke 17. 9. 2026 v linked sandboxu:** podporovaná cesta,
      průběžný i finální přepis a přenos `source=browser_speech` + confidence
      jsou ověřené. Důkaz, zjištěné vady a neověřené scénáře jsou v
      `docs/superpowers/reports/2026-09-17-speech-to-text-browser-smoke.md`.
    - **Zjištění k podobě rozhovoru:** spike je textová pipeline
      (mikrofon → přepis → text → LLM → browser TTS), nikoli přímý poslech
      audia, a chová se jako diktování (klik na každou promluvu, během poslechu
      nelze odeslat). Tři varianty řešení jsou popsané v reportu.
    - **Rozhodnutí 17. 9. 2026:** směr (realtime voice API vs. vylepšená
      browserová pipeline vs. Telnyx) se vědomě odkládá; nic se neimplementuje.

P1.5 implementace je nyní na `main` a prošla autentizovaným Playwright smoke
testem. Produktově uzavřená bude až tehdy, když nováček bezpečně dokončí jeden
cvičný P2 hovor, v Call Logu
vznikne jen správně označený tréninkový záznam bez obchodního side effectu,
Team Leader otevře stejný důkazní podklad pro review a zásadní compliance
chyba je přesně dohledatelná i v případě úspěšného konce simulace. Speech-to-text
spike je samostatný ověřovací krok; jeho úspěch se nesmí vydávat za dokončenou
telefonní transkripci.

### P2 — skutečné týmy a oddělení

Toto je produktový a bezpečnostní základ, ne kosmetický filtr. Foundation týmů,
členství, `team_id`, queue routing a historické snapshoty jsou nyní zapnuté pouze
v Sandboxu. Production se před dalšími důkazy nemění. Týmové přehledy smějí ukazovat
jen skutečně doložený scope; workflow, produkty a Wallet zůstávají workspace-global,
dokud pro ně neschválíme vlastní model vlastnictví.

1. [x] Rozhodnout první podporovaný model členství, aktivní týmy a vlastnictví
   Team Leaderem.
2. [x] Navrhnout a v Sandboxu zavést `teams`, členství, historii vlastnictví,
   FK, indexy, auditní stopu a bezpečnou migraci workspace členů.
3. [x] Přidat administrátorskou správu členství, rolí, týmů a přiřazení operátorů.
4. [x] Zavést team scope do serverové datové vrstvy, RPC a RLS. UUID ani klientský
   filtr nejsou autorizační hranicí.
5. [x] Převést workspace agregace podle schváleného významu: historické hovory,
   objednávky, review, Exception Queue, Daily Brief a Analytics jsou ověřené.
   Team Leader analytika dostává pouze povolené týmy a serverový dotaz filtruje
   týmové řádky před výpočtem; Administrátor dostává celý workspace. U objednávek
   a review je ověřený i rozdíl mezi týmovým seznamem a přímým detailem; vlastní
   naplánovaný callback operátora je viditelný v kalendáři a týmová fronta ukazuje
   čekající/prošlé callbacky bez zavádění samostatného systému suplování.
   Daily Brief nyní explicitně označuje `Týmová data` pro Team Leadera a
   `Celý workspace` pro Administrátora. Celofiremní Wallet není vydávána za týmovou
   metriku. `/team` zobrazuje povolené týmy a read-only presence.
6. [ ] Teprve poté navrhnout operátorské `Results` a férové srovnání se skutečným
   týmem.

P2 je hotové, až administrátor tým spravuje, Team Leader vidí jen povolený scope,
operátor patří do definovaného týmu, cross-team pokusy selžou na serveru/RLS a
migrační i autentizované testy prokážou pozitivní i negativní scénáře.

### Budoucí plán — praktická přestavba Exception Queue

Stávající Exception Queue je bezpečný technický základ, ale její další verze musí
být pracovní nástroj pro každodenní rozhodování Team Leadera, ne seznam interních
technických stavů. Přestavba se začne až po produktovém rozhovoru nad reálnými
situacemi, které má Team Leader řešit.

#### Zjištění z produktového rozhovoru — 16. 9. 2026

První potvrzený účel Team Leadera je péče o jeden nebo více svěřených týmů.
Jeho každodenní práce se týká především:

- nastavení a kontroly směn; směnový kalendář je stále neimplementovaná otevřená
  P3 položka a musí zůstat mezi dalšími úkoly k vytvoření,
- kontroly objednávek vlastního týmu a poznámek u objednávek,
- kontroly poznámek u neúspěšných hovorů (failů),
- kontroly předání neúspěšného leadu z P1 do fronty P4; poznámka musí obsahovat
  důležité informace, které P4 potřebuje pro další práci,
- poslechu a hodnocení hovorů vlastního týmu, prodejních i neprodejních.

Pro žádosti o asistenci platí odlišné pravidlo než pro běžné řízení týmu:
každý Team Leader může přijmout žádost od libovolného operátora ve workspace a
přímo za ním přijít, i když operátor není v jeho svěřeném týmu. Tato asistenční
pravomoc mu ale automaticky nedává přístup k cizím týmovým objednávkám, směnám,
Walletu nebo výsledkům. Pro první verzi stačí zobrazit operátora, jeho tým, stav
přiřazení nebo hovoru, čas čekání, naléhavost a krátkou poznámku. Operátor může
žádost odeslat kdykoli, když má aktivně přiřazeného leadu — před hovorem, během
hovoru i při dokončování výsledku. Žádost bez přiřazeného leadu zatím není
podporovaná, aby Team Leader vždy věděl, za kterým operátorem má jít.

Z toho plyne, že Team Leader Exception Queue musí být týmová pracovní fronta
pro konkrétní práci nad lidmi, leady, hovory, poznámkami a objednávkami. Technické
problémy celého workspace, například selhání workflow nebo chybějící produktový
skript, nemají být úkolem Team Leadera a mají zůstat v administrátorském rozsahu.
Při návrhu je potřeba odlišit týmové úkoly a kontroly od technických výjimek
workspace; zatím tím nepředjímáme, zda půjde o jednu obrazovku s oddíly, nebo
více navazujících pracovních front.

Team Leader si musí moci kontrolní pohled nastavit vlastními filtry. První
potvrzené příklady filtrů jsou krátká poznámka, krátká délka hovoru, konkrétní
důvod neúspěchu (např. obecný neúspěch nebo zdravotní riziko) a úspěšný hovor
nebo objednávka s podezřením na nesprávnou či neúplnou poznámku. Filtry musí
fungovat i nad úspěšnými výsledky; kontrola kvality se netýká pouze Failů.

Minimální obsah kvalitní poznámky je:

- problémy a potřeby klienta spolu s ověřenými informacemi z hovoru,
- cíl nebo očekávání klienta,
- všechny nabídnuté varianty a ceny a reakce klienta na každou z nich,
- konečný výsledek, důvod rozhodnutí a případně další krok nebo předání.

Poznámka má být dostatečně konkrétní, aby další tým nebo operátor dokázal
pokračovat bez opakovaného zjišťování základních informací. Zjištěné zdravotní
informace jsou citlivé; smějí být dostupné pouze v již povoleném týmovém rozsahu,
s jasným odkazem na zdrojový hovor/objednávku a auditní stopou. Automatické
vyhodnocení krátké nebo neúplné poznámky může být pouze signál pro kontrolu,
ne samostatný lidský verdikt. Team Leader nemusí poznámku vracet operátorovi
k doplnění ani vést nový workflow; podle upozornění si sám zapamatuje konkrétní
chybu a vyřeší ji běžnou zpětnou vazbou. AI tedy pouze vytipuje podezřelé případy
v pozadí a zobrazí důvod kontroly, bez automatického zásahu do výsledku hovoru,
objednávky nebo fronty. Kontrola se spouští u všech uložených reálných hovorů,
bez ohledu na to, zda byly úspěšné nebo neúspěšné a zda byly prodejní nebo
neprodejní. Team Leaderovy filtry určují pouze následné zobrazení výsledků,
ne rozsah samotného AI hodnocení. Tréninkové hovory jsou z této kontroly
vyloučené; mají vlastní hodnocení a nesmějí ovlivňovat týmové obchodní výsledky
ani frontu kontroly reálných hovorů.

Schválený směr je jedna přehledná týmová pracovní plocha s přepínatelnými
pohledy, nikoli dlouhý seznam všech typů problémů najednou. Finální název
obrazovky je `Team Workspace`; `Team Checkpoint` zůstává označením výchozího
pracovního pohledu.
První navržené pohledy jsou:

- Daily Checkpoint,
- Kontrola kvality hovorů,
- Objednávky,
- Aktivní operátoři,
- Callbacky a týmová fronta,
- odkaz na samostatné Plánování směn.

Daily Checkpoint má zobrazovat především nové objednávky, prošlé callbacky a
aktuální výsledky týmu. Výchozím obdobím je dnešek s možností přepnout na týden
nebo vlastní období. Aktuální výsledky mají být tabulka po jednotlivých
operátorech, minimálně s konverzí, celkovým Talk Time, počtem vytočených hovorů
a počtem hovorů spojených s klientem; další statistiky se doplní podle
schváleného významu a časového období. Produktově zadaná konverze je počet
prodejů dělený počtem Failů. Talk Time znamená celkový čas operátora strávený
v hovorech za dané období; započítává se i průběh vytáčení a vyzvánění u hovoru,
který klient nepřijal. K absolutnímu času se zobrazí také procento využití směny:
celkový Talk Time dělený délkou konkrétní naplánované směny operátora. Délka
směny není pevně daná na osm hodin a může být například osm nebo dvanáct hodin.
Při chybějícím nebo neověřeném směnovém plánu se procento zobrazí jako
nedostupné, nikoli jako vymyšlená nula. Při nulovém počtu Failů se konverze také
nezobrazí jako nula nebo sto procent, ale jako nevypočitatelná hodnota.

Plánování směn není součástí této malé týmové tabulky. Půjde o samostatný
rozsáhlý systém pro plánování, obsazení, dostupnost a další směnová pravidla.
Team Workspace na něj může odkazovat nebo zobrazit pouze stručný stav, ale nesmí
z něj vzniknout zjednodušená náhrada plánovacího kalendáře.

Každý pohled má vlastní účel, filtry a prázdný stav. Výsledky AI kontroly patří
do pohledu Kontrola kvality hovorů. Technické workspace-global problémy zůstávají
mimo tuto týmovou plochu a patří administrátorovi.

#### Refinement Team Workspace — 17. 9. 2026

- [x] Převést schválené rozvržení do existujícího Countdown designového systému:
  neutrální karty, omezené barevné zvýraznění, kontextový pruh a hlavní tabulka
  výsledků bez falešných dat.
- [x] Zachovat výchozí pořadí práce: asistence, KPI přehled, objednávky a
  callbacky, aktuální výsledky.
- [x] Přidat pravdivé lokální filtry pro objednávky podle zdroje, stavu a
  operátora; pro kontrolu kvality podle AI signálu, výsledku, důvodu Failu a
  vyhledávání; pro operátory podle jména/stavu; pro frontu podle stavu a
  přiřazeného operátora.
- [x] Přidat zrušení filtrů a prázdný stav pro výsledek bez shody.
- [ ] Přidat skutečné přepínání období a týmů až po rozšíření serverového
  read modelu; současný kontext `Dnes` a `Povolené týmy` není falešně interaktivní.

1. [x] Zmapovat skutečné provozní situace: co se stalo, jak rychle je nutné
   reagovat, kdo má jednat, kam má Team Leader kliknout a kdy je problém
   vyřešený. Základní produktový rozhovor proběhl 16. 9. 2026.
2. [ ] Rozdělit důležité případy podle dopadu a naléhavosti; odstranit nebo skrýt
   technické šumy, které nevedou k žádnému rozhodnutí. Základní hranice je jasná,
   ale konkrétní priorita a pracovní karta ještě čekají na návrh.
3. [ ] Navrhnout pro každý případ srozumitelnou kartu: co se stalo, koho se týká,
   proč to vidíme, doporučený další krok, odpovědná osoba a termín.
4. [x] Zachovat týmový rozsah: Team Leader vidí pouze případy svých týmů;
   workspace-global problémy zůstávají administrátorovi. Tato hranice je
   ověřená v týmových migracích, RLS a `/team` datové vrstvě.
5. [ ] Zachovat auditní stopu, možnost převzetí/eskalace, odložení s důvodem a
   dohledatelné vyřešení. Přímé odkazy musí vést na konkrétní lead, hovor,
   objednávku nebo týmovou frontu. Stávající technický základ audit má; návrh
   nové pracovní karty a jejího životního cyklu ještě není schválený.
6. [ ] Před implementací schválit samostatný návrh, akceptační scénáře a důkazní
   plán pro Team Leadera i administrátora.

### Bezprostřední pořadí po checkpointu 16. 9. 2026

1. **Schválený praktický Team Checkpoint** (19. 9. 2026): konečná předloha
   vznikla v Macaly a schválil ji produkt. Obsahuje přehled dne, panel
   pozornosti (žádosti o pomoc s 5minutovou čekací hranicí), výsledky
   operátorů s čestným „—" u konverzí a Talk %, detail operátora, ukončení
   směny, chybový/načítací stav i mobilní podobu. Odkaz:
   `https://uuuj6frnpq3ue9pw1y86ky0c.macaly.app`. Předloha je čisté rozvržení;
   barvy a písmo se při implementaci zasadí do stávajícího designu aplikace.
   Technické workspace-global problémy zůstanou administrátorovi.
   **Implementováno na `main` (19. 9. 2026):** checkpoint tab používá 5minutovou
   hranici s řazením podle naléhavosti, klikací řádky výsledků otevírají detail
   operátora pouze z existujícího read modelu (bez vymyšlené historie hovorů) a
   Konec směny je read-only předání bez falešného dokončovacího workflow.
   Asistence zůstává záměrně první, před KPI. Ověřeno 145 souborů / 678 testů,
   lint, typecheck, build.
   **Follow-up na `main` (19. 9. 2026):** detail operátora ukazuje skutečnou
   historii hovorů z team-scoped read modelu (`recentCallsByOperator`, max 10,
   s odkazem do Call Review) a checkpoint hlásí i naplánované callbacky
   v období (`upcomingCallbacks`). Ověřeno 147 souborů / 687 testů, lint,
   typecheck, build, plus plný sandbox průchod v
   `docs/superpowers/reports/2026-09-19-team-checkpoint-verification.md`
   (tři role, cross-team denial, overdue odznak, claim → resolve s auditem).
   **Macaly layout na `main` (20. 9. 2026):** checkpoint tab drží pořadí
   Asistence → KPI → Výsledky → Konec směny → Callbacky + Kvalita; řádky
   výsledků otevírají detail; taby Checkpoint / Kvalita / Objednávky /
   Operátoři / Fronta. Ověřeno 12/12 browser smoke + DB read-back v
   `docs/superpowers/reports/2026-09-20-team-checkpoint-layout-verification.md`.
2. **Dokončen ověřovací průchod `/team` v Sandboxu** (19. 9. 2026): autentizovaný
   Team Leader, administrátor a operátor, včetně přímé URL, cross-team odmítnutí,
   reloadu, prázdných stavů a AI panelu. Dočasné účty byly smazány; důkaz je
   v `docs/superpowers/reports/2026-09-18-team-workspace-verification.md`.
   Team Workspace vlna je tím bezpečně uzavřena.
3. **Hotové uložené kontrolní pohledy** (19. 9. 2026): Team Leader si může uložit
   vlastní kombinaci filtrů pod jménem, jedním kliknutím ji aktivovat i smazat;
   uložené pohledy nikdy nerozšiřují týmový rozsah a jsou dostupné jen rolím
   `team_leader` a `administrator`. Ověřeno v Sandboxu a nasazené na `main`.
4. **Zahájit samostatné plánování směn:** nejde o malou tabulku v `/team`. Musí
   pokrýt směny, dostupnost, absence, přesčasy a zdroj pro Talk Time procento.
   Do té doby se procento zobrazuje jako nedostupné.
5. **Dopilovat onboarding trenér pro operátory:** základní implementace je na
   `main`; další práce patří do samostatné P1.5 follow-up vlny. Trénink zůstane
   oddělený od ostrých hovorů, objednávek, Walletu a týmových výsledků.
6. **Telnyx řešit až po získání správného telefonního čísla:** potom ověřit
   konfiguraci, živý outbound, webhooky a read-back. Do té doby zůstává telefonie
   simulovaná a Production se nemění.

### P3 — role-aware pracovní den

1. Napojit existující `operator_presence` na stav v sidebaru a pravdivou
   dostupnost; odstranit lokální stav, který se pouze tváří jako provozní.
2. Rozšířit jediný směnový kalendář o směny, plánovanou dostupnost, absence a
   přesčasy v návaznosti na týmový model. Nevytvářet druhou konfiguraci pracovních
   dnů a hodin v Settings.
3. Zprovoznit Live Monitor z reálné presence/fronty, nebo jej do té doby vůbec
   nenabízet jako aktivní nástroj.
4. Rozdělit Settings podle rolí a odpovědnosti; administrátorské identity a
   oprávnění držet v `Users & Permissions`.

### P4 — kvalita obsluhy a udržovatelnost

1. Přidat pouze schválené objection cards/FAQ pro citlivé produktové situace.
2. Rozšířit Product Scripts o diff, autora, účinnost, preview a bezpečný rollback.
3. Přesunout saved views z browserového stavu na server podle uživatele/workspace.
4. Rozšířit auditní kontext tam, kde dnes akce nejde bezpečně vysvětlit.
5. Dokončit cílený responsive a locale/currency průchod.
6. Po dokončení P1 Klientského profilu a focus režimu dále rozdělit přetíženou
   stránku Workspace (aktuálně přes 1 100 řádků) a další kritické soubory podle
   odpovědností; refaktor nesmí měnit chování bez testu.

## Externě blokované

### Telnyx outbound pilot

- dokončit refundaci/pořízení správného čísla pro cílový region,
- nakonfigurovat provider účet a bezpečné serverové credentials,
- ověřit živý outbound hovor, webhook podpis a read-back call/event persistence,
- provést autentizovaný browser test mute, hold, DTMF, hangup a recovery.

Fallback softphone a Docker/Asterisk laboratoř nejsou živý Telnyx důkaz. Dokud
provider vstup chybí, ostatní neblokované body pokračují podle priorit výše.

### Až po stabilní telefonii

- audio recording a retention politika,
- transcription s přesným stavem dostupnosti,
- Gemini pro audio/transcription scénáře pouze jako serverový, člověkem
  upravitelný návrh verdiktu nebo poznámky; nikdy ne jako automaticky vydávaný
  medicínský či právní závěr.

Samostatná Gemini kontrola úplnosti textových poznámek u reálných hovorů je již
ověřená v Sandboxu a není blokovaná nákupem telefonního čísla.

## Zmrazené do po-pilotního rozhodnutí

- custom objects a blueprints,
- rozšiřování Deals pipeline a obecného Dashboardu,
- Wallet payout/commission engine nad současný read-only pilotní scope,
- inbound telefonie a široké omnichannel integrace.

Zmrazení neznamená smazání. Znamená, že na těchto plochách nevzniká nový feature
scope, dokud P0–P3 nedrží hlavní denní smyčku.

## Kontrolní checkpointy

- Po každé prioritní vrstvě znovu projít tři role, databázovou hranici, runtime
  pravdivost a dokumentaci.
- Po P2 zvlášť zkontrolovat, že žádná „team“ obrazovka nepoužívá celý workspace
  jako tichou náhradu týmu.
- Před interním pilotem zopakovat celý checkpoint včetně linked advisorů,
  schema diffu, autentizovaného browser průchodu a rollback/cleanup postupu.

## Desatero vývoje

1. Za hotové označujeme jen chování podložené odpovídajícím důkazem.
2. Workspace, role a tým vynucuje server a databáze, ne skryté tlačítko.
3. Operátorův hlavní úkol je klient na telefonu; nové UI musí zkracovat hledání,
   psaní nebo rozhodování.
4. Citlivý jazyk je schválený a dohledatelný; systém nediagnostikuje ani neslibuje
   léčbu.
5. Simulaci, fallback a externě blokovanou integraci vždy viditelně pojmenujeme.
6. Kritický zápis je idempotentní nebo má jasnou ochranu proti opakování a
   concurrency.
7. Audit zachovává autora, čas a skutečný previous/new stav; historii nepřepisuje.
8. Před předáním spouštíme testy, lint, typecheck, build, databázové ověření a
   kontrolu diffu.
9. Chybu opravujeme v příčině; nemažeme test ani bezpečnostní pravidlo jen kvůli
   zelenému běhu.
10. Dokumentace rozlišuje repo, lokální runtime, linked sandbox a živého externího
    providera a udržuje právě jedno pořadí backlogu.

## Podmínky interního pilotu

- P0 je uzavřené nebo má výslovně přijaté riziko s vlastníkem a termínem.
- P1 hlavní smyčka projde souvislým autentizovaným browser smoke testem.
- Testy, lint, typecheck, build, pgTAP, linked migration parity a schema diff mají
  známý a zaznamenaný výsledek.
- Externě neověřené funkce jsou vypnuté nebo přesně označené.
- Existuje rollback/cleanup postup a nejsou zveřejněná tajemství ani testovací
  identity.
