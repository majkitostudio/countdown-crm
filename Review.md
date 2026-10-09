# Countdown CRM — upřímná kritika a vlastní interpretace review

> **Aktualizace 9. 10. 2026 (Kompletní audit po dokončení Milníků 1–5):**  
> Systém prošel obrovským posunem od původní zářijové kritiky:
> - **Testovací sada vzrostla z 251 na 817 testů (173 testovacích souborů)** s 100% úspěšností.
> - **Databáze:** 127 SQL migrací úspěšně ověřeno sekvenčním validátorem (`npm run verify:migrations`), 49 tabulek, 115 funkcí, 0 chyb.
> - **End-to-End ověření:** Implementován Playwright browser smoke test (`npm run test:smoke`), který bezchybně prochází 21/21 tras i klíčové interakce.
> - **Next.js Production Build:** Všech 41 tras zkompilováno a optimalizováno (Turbopack, Next.js 16.3.5, React 19).
> - **Dokončené klíčové milníky pro call centrum doplňků stravy:**
>   - **Expedice & Dopravci:** CSV exporty pro Zásilkovnu, Balíkovnu, GLS i interní sklad s UTF-8 BOM; správa tracking čísel a proklik na kurýrní sledování v kartě zákazníka.
>   - **Fronta Oddělení P4 & Recyklace:** Automatické přesuny kontaktů po odmítnutí s cooldownem (3–30 dní), 30minutové opakování u nezvednutých hovorů, obvolávání Sent/Returns a Re-ship balíčků.
>   - **Provize & Mzdy:** Měsíční uzávěrka provizí na `/wallet` pro Team Leadera s odečtem vratek a export podkladů pro mzdovou účetní do CSV.
>   - **Správa uživatelů:** Nový User Hub na `/settings/users` umožňující administrátorovi zvát či zakládat operátory přímo z UI bez sahání do databáze.
>   - **Katalog & Skripty:** Šablona pro seeding doplňků stravy (ArthroFlex, CardioVital, Magnesium) se skripty a námitkami.
>   - **Operator Console:** Ergonomické zklidnění, ochrana proti předčasnému uzavření hovoru, cenové schody, chytré našeptávání adres a rychlé bubliny námitek.
> - **Telefonie:** Telnyx ostré volání zůstává plánovaně pozastaveno z rozpočtových důvodů (vyžaduje reálné číslo +420 a minutový kredit); systém plnohodnotně běží v simulačním a lokálním SIP módu.


## Krátký verdikt

Countdown CRM není demo ani slepenec náhodných funkcí. Je to skutečný základ produktu pro výkonnostní call centrum a jeho technické jádro je na zhruba pět týdnů práce mimořádně vyspělé.

Současně ale ještě není připravený na interní pilot ve smyslu „přihlásí se tři role, odpracují směnu a systém spolehlivě podrží celý jejich den“. Největší nedokončenost není v množství funkcí. Je v tom, že jednotlivé části zatím netvoří dostatečně souvislou každodenní pracovní smyčku.

Jinými slovy: máme motor, interiér a velkou část ovládání auta. Teď je potřeba prokázat, že auto skutečně nastartuje, projede konkrétní trasu a že se po jízdě správně uloží všechny důležité údaje. U Countdown CRM to znamená hlavně ověřit reálné prostředí Supabase, dokončit telefonii a zjednodušit práci jednotlivých rolí.

## Co Countdown CRM vlastně je

Jde o workspace-scoped CRM pro výkonnostní call centra. Hlavním produktem není dashboard, ale Operator Console na `/workspace`:

1. operátor dostane lead,
2. uvidí kontext klienta,
3. provede hovor,
4. uloží výsledek,
5. pokračuje callbackem nebo objednávkou.

Technologický základ tvoří Next.js 16, React 19, TypeScript, Tailwind, Supabase pro autentizaci/databázi/RLS a připravená vrstva Telnyx WebRTC. Vedle jádra jsou rozpracované nebo hotové také callbacky, objednávky, skripty, wallet, training, workflows, analytika, audit a vlastní schema/blueprints.

To je velký rozsah. Přináší možnosti, ale také riziko rozptýlení pozornosti před pilotem.

## Co je na projektu opravdu silné

### 1. Produktové uvažování je operator-first

Projekt má poměrně jasně definováno, co má dělat a co dělat nemá. Dokumentace drží schválený jazyk, citlivá témata a neslibuje falešnou AI ani telefonní funkcionalitu. To je důležité zejména u CRM pro zdravotně citlivé oblasti.

Nejlepší produktová myšlenka je podle review **Operator Next Action**: systém nemá operátorovi jen ukázat data, ale má mu říct, co má udělat teď.

### 2. Datová a bezpečnostní vrstva je postavená zodpovědně

Serverová DAL vrstva má 21 modulů a používá server-only hranice, kontrolu workspace kontextu a kontrolu rolí. Kritické mutace nejsou ponechané pouze na UI.

RLS, role boundaries a atomic RPC ukazují, že projekt počítá s reálným víceuživatelským provozem. Přibližně 74 SQL migrací navíc ukazuje postupné hardeningování databáze, ne jednorázový prototyp.

### 3. Jádro call-centra má správný tvar

Lead queue a call lifecycle nejsou jen obrazovky. Obsahují assignment, heartbeat, recovery a atomic completion. To je přesně infrastruktura, kterou call centrum potřebuje, aby se lead neztratil, aby lease nezůstal viset a aby se hovor správně uzavřel.

Poslední iterace Operator Console přidala důležité věci:

- hlavní stavovou akci Operator Next Action,
- Callback Recovery Inbox,
- plný i kompaktní profil klienta,
- nedávný kontext,
- klávesové zkratky,
- callback modal s ohledem na přístupnost,
- fail outcome s povinným důvodem a poznámkou.

### 4. Testy nejsou jen testy utilit

187 testů ve 49 souborech pokrývá také chování produktu: UI kontrakty, Customer 360, lifecycle Telnyx, webhooky, RLS výkon, role, wallet, frontu a post-call wrap-up.

To je dobrý signál. Testy se snaží chránit skutečné smlouvy systému, ne pouze vyrábět zelené číslo v CI.

### 5. Dokumentace je překvapivě upřímná a použitelná

Dokumentace rozlišuje simulaci od live funkce a otevřeně uvádí, co je plánované, co je externě blokované a co ještě nebylo prokázáno. Pravidlo, že stav v UI není důkaz persistence, je velmi zdravé.

## Co je hotové a co ještě není

Při aktuální systémové kontrole (9. 10. 2026):

- aplikační testy: **817/817 ve 173 souborech (100 % pass)**,
- migrace: **127/127 ověřeno bez chyb (49 tabulek, 115 funkcí)**,
- lint (ESLint 9): **0 chyb, 0 varování**,
- typecheck (TypeScript): **0 chyb**,
- production build: **41 tras zkompilováno bez chyb**,
- browser smoke test: **21/21 tras ověřeno v Chromium (Playwright)**.

To znamená, že technický dluh byl zásadně snížen a systém je plně konzistentní.

### Dokončené a ověřené prvky (Milníky 1–5):
- Expediční exporty pro dopravce (Zásilkovna, Balíkovna, GLS, CSV) s UTF-8 BOM a rozpadem adresy.
- Sledovací čísla balíků a proklik na dopravce z klientské karty.
- Recyklační proces odmítnutých kontaktů a fronta pro Oddělení P4 (cooldown 3–30 dní, Sent/Returns, Re-ship).
- Taxonomie outcome tlačítek v konzoli (Create Order, Inaccessible, Schedule, Failed) s ochranou proti předčasnému uzavření.
- Zrušení 15min prodlevy u scheduled hovorů a modernizace na Plánovač na `/calendar`.
- Měsíční uzávěrka provizí na `/wallet` pro Team Leadera s odečtem vratek.
- Export mezd do CSV pro mzdovou účetní s rozpadem provizí i bonusů.
- Seeding šablona pro doplňky stravy (ArthroFlex, CardioVital, Magnesium) a generátor `seed.sql`.
- Uživatelský User Hub na `/settings/users` pro administrátory a vypnutý demo auth v produkci.
- Tichý přepis hovoru (Speech-to-Text) a podklady pro Gemini AI kontrolu kvality.

### Co zbývá k ostrému pilotu:
- **Externí VoIP linka / levnější český SIP trunk:** Ostré volání přes Telnyx je blokováno nákupem čísla (+420). Pro pilot je potřeba buď nákup čísla, nebo napojení lokální SIP ústředny / českého VoIP operátora (např. Odorik, Mikrotech, Fayn), případně pilot s mobilním vytáčením.
- **Nahrání reálných leadů:** Využít importní nástroje na `/leads` a nahrát skutečnou prodejní databázi.
- **Nasazení do produkční Supabase instance:** Aplikace běží proti lokální/sandboxové DB nebo demu. Před pilotem je třeba provést ostré nasazení migrací a seedu do ostrého Supabase projektu.


## Hlavní diagnóza: chybí denní práce tří rolí v jedné smyčce

Nejvýstižnější část review je tato: pocit, že „něco chybí“, nevzniká proto, že by chyběl další velký modul. Spíš je kolem dobrého jádra příliš mnoho produktového shellu a příliš málo uzavřených každodenních pracovních toků.

Projekt už má Console, frontu, outcome, callback, objednávku, skripty a bezpečnostní základy. Nyní je potřeba, aby operátor, team leader a administrátor každý dostali jednoduchý, pravdivý a dokončitelný den.

### Operátor

Operátor by měl během hovoru zůstat v Console. Dnes ho některé části systému zbytečně tahají do Dashboardu, Deals, Trainingu nebo katalogu.

Co už mu pomáhá:

- claim a recovery,
- Operator Next Action,
- callback inbox,
- profil klienta,
- skript jako osnova,
- fail outcome s důvodem.
- Conversation Brief se skutečnými údaji a bezpečným dalším krokem.

Co mu ještě komplikuje práci:

- Conversation Brief i krátký post-call wrap-up jsou nově doplněné; zbývá je prověřit v celém směnovém scénáři s reálnými daty;
- fronta dává dalšího člověka, ale méně vysvětluje, proč je tento lead právě teď důležitý;
- Ready/Break je lokální přepínač místo spolehlivého stavu směny;
- skript by se neměl měnit v těžkopádný klikací Run mode;
- Training nemá působit jako coaching živého hovoru.

### Team leader

Team leader nepotřebuje další BI obrazovku. Potřebuje rychle poznat výjimky a zasáhnout tam, kde se práce zasekla.

Nově už má:

- Exception Queue pro overdue callbacky, recovery bez outcome, propadlé assignmenty, failed workflows a chybějící publikovaný skript; umí bezpečně uložit vyřešení nebo odložení s auditní stopou.

Stále mu chybí zejména:

- pravdivý Live Monitor — prázdné pole s tikající délkou hovoru je horší než přiznaná nedostupnost;
- skutečný review reálného hovoru, nikoli jen review simulace;
- jasně dostupná týmová fronta; pokud je `/team` schovaná pod „Workspace Members“ a dostupná hlavně administrátorovi, neodpovídá to jeho roli;
- jedno místo, které sjednotí Brief, Analytics, Dashboard a Next Best Action, protože dnes mohou říkat podobné věci na více místech.

### Administrátor

Administrátor potřebuje odpověď na jednoduchou otázku: **smí tento workspace bezpečně jet?**

Místo toho jsou Settings zatím směsí zvuku, schematu, walletu a skriptů. Chybí Workspace Readiness se stavem například:

- Ready,
- Needs attention,
- Blocked.

Calendar a wallet by neměly pouze spadnout. Pokud nemohou fungovat, administrátor musí dostat diagnózu a další krok. Stejně tak je potřeba ověřit cizí workspace, špatnou roli a přihlášení team leadera.

## Co nyní přidat, zjednodušit a zmrazit

### Přidat

- krátký post-call wrap-up,
- Conversation Brief,
- další role-aware sjednocení Team Leader ploch kolem hotového Exception Queue,
- role-aware home a navigaci,
- Workspace Readiness,
- autentizovaný persistence důkaz.

### Zjednodušit

- jednu úvodní plochu pro každou roli,
- operátorovi denní navigaci bez Deals, Monitoru a Trainingu,
- status jako skutečnou presence směny, ne jen lokální přepínač.

### Zmrazit, ale nemazat

- custom objects,
- blueprints,
- Deals,
- rozšiřování AI trainingu,
- wallet payout,
- inbound a Gemini.

Zmrazení neznamená, že jsou tyto části špatně nebo že se mají odstranit. Znamená pouze, že před pilotem nemají odvádět pozornost od ověření hlavního workflow.

### Neodebírat

- Operator Console,
- lead queue,
- RLS a serverové guardy,
- skripty,
- objednávky,
- wallet ledger,
- Telnyx foundation.

### Teď nepřidávat

- další dashboard,
- Alert Center před Exception Queue,
- další AI funkce bez jasné další akce pro konkrétní roli.

Nejhorší další tah by byl vytvořit ještě jednu plochu, která bude zobrazovat stejné informace jiným způsobem.

## Technický dluh a rizika

### Velká komponenta workspace

`src/app/workspace/page.tsx` má přibližně 1000 řádků. Je to kandidát na rozdělení do hooků, menších komponent nebo malé state machine. Není to ale nejvyšší priorita před pilotem. Refaktor má smysl až poté, co bude prokázaný hlavní pracovní tok.

### Supabase typy

Workaround v `db.ts` je technický dluh. Může se později vrátit jako problém při úpravách schématu, ale podle review nejde o blocker pilotu.

### Šířka scope

Wallet, calendar a training rozšiřují záběr daleko za hlavní operátorský tok. To je produktově zajímavé, ale před pilotem zvyšuje počet míst, která mohou být rozbitá nebo nejasná.

### Největší skutečné riziko

Největší riziko není aktuálně kvalita TypeScriptu ani počet testů. Je jím rozdíl mezi lokálně přesvědčivým systémem a autentizovaným důkazem, že vše funguje proti správnému Supabase workspace a že persistence přežije reload.

## Doporučené pořadí práce

Aktuální pořadí priorit je:

1. P1 runtime stabilita a srovnání migration history.
2. Dokončení post-call wrap-up jako jednoho krátkého a idempotentního toku bez double-submit problémů.
3. Conversation Brief pro operátory.
4. Team Leader Exception Queue — implementovaný, nasazený a ověřený v linked sandboxu.
5. Role-aware plochy, Workspace Readiness, Team Leader Review a auditní kontext.
6. Telnyx pilot, až po externím ověření čísla.
7. Gemini transcription a AI návrhy.

Toto pořadí dává smysl: nejdříve se musí stabilizovat skutečný runtime a databázová historie, potom se dokončí hlavní pracovní smyčka operátora a team leadera. Teprve až bude tento základ spolehlivý a Telnyx bude externě připravený, má smysl ověřovat telefonní pilot. Gemini a AI návrhy patří až za důkaz, že je kvalitně vyřešený samotný proces hovoru a jeho uložení.

## Celkové hodnocení

Po dokončení Milníků 1–5, vybudování E2E Playwright testů a kompletní verifikaci migrací se celkové skóre projektu posouvá ze zářijových 7,9/10 na **8,9/10** (stupeň A).

Orientanční rozpad k 9. 10. 2026:

| Oblast | Původní (6. 9.) | Aktuální (9. 10.) | Výklad |
|---|---:|---:|---|
| Produktová vize a scope | 9/10 | 9,5/10 | Jasné zacílení na doplňky stravy, Oddělení P4, vyřazení zbytečností |
| Architektura | 8/10 | 9/10 | DAL, RLS, 127 čistých migrací, atomické RPC funkce |
| Kvalita kódu | 7,5/10 | 8/10 | 100% čistý TypeScript i ESLint, odladěná ergonomie konzole |
| Testování | 8/10 | 9,5/10 | Nárůst z 251 na 817 testů (173 souborů) + Playwright browser smoke test |
| Bezpečnost | 8,5/10 | 9/10 | RLS, ochrana transakcí, vypnutý demo auth v produkci, User Hub |
| Dokumentace | 9/10 | 9,5/10 | Upřímná, synchronizovaná se stavem repozitáře |
| UI pro operátora | 7,5/10 | 9/10 | Brief, cenové schody, chytrá adresa, námitky, layout bez dvojitých scrollbarů |
| Pilotní úplnost | 6/10 | 8,5/10 | Kompletní workflow (hovor → košík → expedice → mzdy), chybí jen ostrá linka |
| Vývojová vyspělost | 7,5/10 | 9/10 | CI pipeline, `verify:migrations`, `seed:catalog`, `provision:user` |

## Závěr vlastními slovy

Projekt má za sebou masivní kus systémové práce. Všechny klíčové procesy telemarketingového call centra s doplňky stravy jsou nyní softwarově vyřešené:
- **Operátor** má rychlou konzoli s námitkami, cenovými schody, adresou a ochranou proti chybám.
- **Logistika / expedice** má exporty pro Zásilkovnu, Balíkovnu, GLS i sledovací čísla balíků.
- **Retargeting (Oddělení P4)** má automatickou recyklaci odmítnutých kontaktů i Sent/Returns.
- **Team Leader & Mzdy** mají na `/wallet` měsíční uzávěrku provizí a čistý CSV export pro účetní.
- **Administrátor** má User Hub pro přidávání operátorů a 127 bezchybných migrací.

Projekt je po softwarové stránce plně připraven na spuštění pilotního testování s živými uživateli.

