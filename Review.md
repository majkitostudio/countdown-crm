# Countdown CRM — upřímná kritika a vlastní interpretace review

> **Aktualizace 5. 9. 2026:** Supabase CLI `2.116.0` je v projektu připnuté,
> linked sandbox má s repozitářem srovnanou migration history i veřejné schema,
> schema diff je nulový a `db push --dry-run` nehlásí čekající migrace. Wallet
> funkce i RLS politika odpovídají hranici manager/admin a lokální databázové
> testy prošly 58/58. Celá aplikační sada nyní prochází 187 testy ve 49 souborech.
> Autentizovaný fallback call → outcome → reload → SQL read-back proti cílovému
> workspace nyní prošel přes Team Leadera a operátora; testovací účty byly
> odstraněny. Otevřenými P1 body zůstávají ověření `/calendar` a `/wallet` a
> privilegovaný vzdálený test runner. Živý Telnyx pilot je samostatně externě
> blokovaný.

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

Při rychlé kontrole vycházelo:

- testy: 187/187,
- lint: v pořádku,
- typecheck: v pořádku,
- production build: v pořádku,
- 28 rout,
- čistý working tree.

To ale neznamená, že je hotový pilot. Zelený build potvrzuje technickou konzistenci, ne to, že člověk může bezpečně odpracovat celou směnu.

### Není dokončené nebo prokázané

- Telnyx live pilot je blokovaný externě číslem a regionem/refundací.
- Gemini a post-call AI jsou plánované, nikoli implementované.
- Conversation Brief chybí.
- Team Leader Exception Queue chybí.
- `/calendar` a `/wallet` potřebují ověření v linked prostředí.
- Autentizovaný persistence důkaz je nyní ověřený na fallback softphonu: call → `no_answer` outcome → reload → SQL read-back. Nejde o důkaz živého Telnyx provideru.
- Chybí integrační a Playwright E2E testy proti reálnému prostředí Supabase.
- Pilot-ready kritéria z dokumentace tedy ještě nejsou splněná.

To není selhání. Je to pouze důležitá hranice mezi „kód vypadá dobře“ a „produkt je ověřený v reálném provozním scénáři“.

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

Co mu ještě komplikuje práci:

- před hovorem chybí jeden Conversation Brief: problém, poslední kontakt, slíbený krok a bezpečný další postup;
- po hovoru chybí jeden krátký wrap-up, který skončí jasnou odpovědí „co teď“;
- fronta dává dalšího člověka, ale méně vysvětluje, proč je tento lead právě teď důležitý;
- Ready/Break je lokální přepínač místo spolehlivého stavu směny;
- skript by se neměl měnit v těžkopádný klikací Run mode;
- Training nemá působit jako coaching živého hovoru.

### Team leader

Team leader nepotřebuje další BI obrazovku. Potřebuje rychle poznat výjimky a zasáhnout tam, kde se práce zasekla.

Chybí mu zejména:

- Exception Queue pro overdue callbacky, stuck recovery, neuzavřené outcomy, příliš dlouhé lease nebo chybějící skript;
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
- Team Leader Exception Queue,
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
4. Team Leader Exception Queue.
5. Role-aware plochy, Workspace Readiness, Team Leader Review a auditní kontext.
6. Telnyx pilot, až po externím ověření čísla.
7. Gemini transcription a AI návrhy.

Toto pořadí dává smysl: nejdříve se musí stabilizovat skutečný runtime a databázová historie, potom se dokončí hlavní pracovní smyčka operátora a team leadera. Teprve až bude tento základ spolehlivý a Telnyx bude externě připravený, má smysl ověřovat telefonní pilot. Gemini a AI návrhy patří až za důkaz, že je kvalitně vyřešený samotný proces hovoru a jeho uložení.

## Celkové hodnocení

Původní review uděluje projektu celkové skóre **7,9/10**, tedy přibližně B+ až A-. V kontextu solo/small týmu, Codexu, pěti týdnů práce a cíle interního pilotu je to velmi dobrý výsledek.

Orientanční rozpad:

| Oblast | Skóre | Výklad |
|---|---:|---|
| Produktová vize a scope | 9/10 | Jasný operator-first směr a dobré hranice |
| Architektura | 8/10 | DAL, RLS, serverové guardy a atomic RPC |
| Kvalita kódu | 7,5/10 | Konzistentní TypeScript, ale příliš velké komponenty |
| Testování | 8/10 | Silné kontrakty, chybí E2E proti reálnému prostředí |
| Bezpečnost | 8,5/10 | Workspace, role a RLS jsou řešené zodpovědně |
| Dokumentace | 9/10 | Aktuální, upřímná a bez falešných slibů |
| UI pro operátora | 7,5/10 | Solidní základ, chybí Brief a kratší wrap-up |
| Pilotní úplnost | 6/10 | Jádro je silné, ale zbývají externí a runtime blockery |
| Vývojová vyspělost | 7,5/10 | Dobré příkazy a historie, ještě je potřeba migration sync |

## Závěr vlastními slovy

Projekt má mnohem lepší základy, než by odpovídalo dojmu „ještě tomu něco chybí“. Chybějící část není další velká feature. Chybí hlavně propojit existující části do jednoho pravdivého pracovního dne:

- operátor ví, koho řeší, proč ho řeší a co má udělat dál;
- team leader vidí výjimky a může zasáhnout;
- administrátor ví, zda je workspace připravený k provozu;
- systém po každém důležitém kroku prokazatelně uloží data.

Pokud se teď podaří udržet disciplínu, dokončit pilotní důkazy, vyřešit Telnyx blocker a zjednodušit navigaci podle rolí, Countdown CRM se může posunout z velmi dobrého technického základu k produktu, který se dá skutečně používat ve směně.
