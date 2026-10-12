User: Ahoj. Poslední dobou pracuji na svém projektu Countdown CRM v Antigravity. Proveď analýzu projektu, přečti si kód, dokumentaci, snaž se porozumět o čem to je, o co se snažíme - pochop vizi projektu, cíl naší práce. 

Pokud najdeš nějáké mezery v projektu, prostor pro zlepšení, nebo chyby, prosím vytvoř ohledně toho záznam a doporučenou akci.
Poslední chat v Antigravity. Aktuální práce, kterou jsme dělali:

Yessir, zde jsou odpověďi:

1. Ano určitě.
2. Ano, určitě.
3. Ukážeš mi, jak by to zhruba vypadalo? Moc si to neumím představit.
4. V MVP projektu to není potřeba
5. Až po pročištění a smazání nepotřebného obsahu

Nejdřív se aLe pojďme věnovat právě tomu pročištění, abychom trošku zredukovali tu velikost projektu

Hotovo! **První fáze – velké pročištění – je kompletní a nahrána na GitHubu.**

  Smazali jsme celkem **1 375 řádků mrtvého kódu**:

  
- ❌ Smazány neexistující obrazovky: `/objects/[slug]`, `/monitor`, `/audio-preview`.
- ❌ Smazán složitý `ObjectBuilderModal` (vytváření vlastních tabulek a databázových entit v nastavení, což v call centru nikdo nepotřebuje).
- 🧹 Vyčištěna navigace a nastavení.
- ✅ Všech **822 automatických testů** prošlo bez jediné chyby, TypeScript i kód jsou 100% čisté a změny jsou pushnuté na `main`.

  
---

  Nyní k tvé otázce: **„Ukážeš mi, jak by to zhruba vypadalo? Moc si to neumím představit.“**

  Pojďme si po lopatě ukázat, jak by vypadaly 3 klíčové části systému v modernějším UI/UX pojetí:

  
---

  
### **1. Objednávky jako Kanban Board (místo nudné tabulky)**

  **Proč to dává smysl:**

  Klasická tabulka objednávek je jen hromada řádků pod sebou. Manažer nebo vedoucí v ní na první pohled nevidí, kde se balíčky zasekávají.

  V **Kanbanu** vidíš sloupce přesně podle životního cyklu balíčku. Kartu můžeš myší přetáhnout nebo na ni kliknout:

  
```
text┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐│  OBJEDNÁVKY (Fulfillment Pipeline)                               [ Hledat klienta / číslo zásilky ]  │├──────────────────┬──────────────────┬──────────────────┬─────────────────────────┬────────────────────┤│ 1. K EXPEDICI    │ 2. ODESLÁNO      │ 3. NA VÝDEJNĚ    │ 4. PŘEVZATO / DORUČENO  │ 5. VRATKY / PROBLÉM││   (14 balíčků)   │   (48 balíčků)   │   (12 balíčků)   │   (180 balíčků)         │   (4 balíčky)      │├──────────────────┼──────────────────┼──────────────────┼─────────────────────────┼────────────────────┤│ ┌──────────────┐ │ ┌──────────────┐ │ ┌──────────────┐ │ ┌─────────────────────┐ │ ┌────────────────┐ ││ │ #1042        │ │ │ #1039        │ │ │ #1024        │ │ │ #1002               │ │ │ #1015          │ ││ │ Jan Novák    │ │ │ Petr Svoboda │ │ │ Pavel Kříž   │ │ │ Marie Bílá          │ │ │ Josef Černý    │ ││ │ 1 490 Kč     │ │ │ 2 890 Kč     │ │ │ 1 190 Kč     │ │ │ 3 400 Kč            │ │ │ 1 200 Kč       │ ││ │ GLS          │ │ │ Zásilkovna   │ │ │ Zásilkovna   │ │ │ Doručeno: před 2 dny│ │ │ ⚠️ Nevyzvednuto│ ││ └──────────────┘ │ └──────────────┘ │ │ 🚨 LEŽÍ 4 DNY! │ │ [⏳ Za 19 dní do P3]  │ │ [ Přesun do P4 ] │ ││                  │                  │ └──────────────┘ │ └─────────────────────┘ │ └────────────────┘ ││ ┌──────────────┐ │                  │                  │                         │                    ││ │ #1043        │ │                  │ ┌──────────────┐ │                         │                    ││ │ Alena Malá   │ │                  │ │ #1028        │ │                         │                    ││ │ 890 Kč       │ │                  │ │ 890 Kč       │ │                         │                    ││ └──────────────┘ │                  │ │ Leží 1 den   │ │                         │                    ││                  │                  │ └──────────────┘ │                         │                    │└──────────────────┴──────────────────┴──────────────────┴─────────────────────────┴────────────────────┘
```

  **Co je na tom geniální:**

  
1. **Okamžitý alarm u sloupce „Na výdejně“:** Pokud balíček leží na výdejně déle než 3 dny, karta zčervená (`🚨 LEŽÍ 4 DNY!`) – vedoucí nebo automat to hned vidí a může jednat.
2. **Přehled pro retenci (P3):** U doručeného balíčku vidíš, kolik dní zbývá do momentu, než automat pošle zákazníka do retenčního oddělení P3 (po 21 dnech od převzetí).
3. **Záchrana vratek (P4):** U vráceného balíčku je rovnou tlačítko na vytvoření záchranného hovoru / Re-shipu.

  *(Poznámka: Pro ty, kteří mají rádi data v řádcích, nahoře zůstane jednoduchý přepínač `[ Kanban ]` / `[ Tabulka ]`.)*

  
---

  
### **2. Leady: Hybridní přehled s odděleními (P1 – P4)**

  **Proč to dává smysl:**

  U leadů není Kanban ideální, protože leadů jsou denně stovky až tisíce a ve sloupcích by se ztratil přehled.

  Místo toho použijeme **hybridní pohled**: nahoře 4 velké aktivní dlaždice reprezentující jednotlivá oddělení, a dole blesková tabulka.

  
```
text┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐│  LEADY A KONTAKTY                                                                                     ││                                                                                                       ││  [ P1: Senior Sales ]   [ P2: Standard ]        [ P3: Retence ]        [ P4: Poslední záchrana ]      ││    🔥 34 leadů            📞 420 leadů            🔄 68 zákazníků         🛟 21 leadů                 ││    Hot leads, web košíky  Masové kampaně, import  21 dní po doručení     Včerejší faily, vratky       ││    (AKTIVNÍ VÝBĚR)                                                                                    │├───────────────────────────────────────────────────────────────────────────────────────────────────────┤│  Zobrazeno: Oddělení P1 (Senior Sales)                                 [ 🔍 Rychlé vyhledávání... ]   ││                                                                                                       ││  Jméno klienta     Telefon         Zdroj / Kampaň     Stav             Přiděleno        Akce          ││  ───────────────────────────────────────────────────────────────────────────────────────────────────  ││  Karel Dvořák      +420 777...     Web - Nedokončeno  Čeká na hovor    Senior Tým A     [ Detail ]    ││  Eva Králová       +420 602...     VIP Landing Page   Zavolat v 14:00  Ondřej (Senior)  [ Detail ]    ││  Martin Horák      +420 721...     Infolinka Upsell   Nový             Nepřiřazeno      [ Přiřadit ]  │└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

  **Jak to funguje v praxi:**

  
- Klikneš na dlaždici **P1** ➔ tabulka dole okamžitě ukáže jen prioritní leady.
- Klikneš na dlaždici **P3** ➔ vidíš přesně ty zákazníky, kteří před 21 dny převzali balíček a je čas na upsell / spokojenost.
- Klikneš na **P4** ➔ vidíš včerejší neúspěšné hovory (faily) a vratky, které potřebují záchranu.

  
---

  
### **3. Sjednocení položek v levém menu do jednoho hubu „Admin“**

  Dnes máš v levém bočním panelu roztahaných **18 položek** (Analytics, Workflows, Controls, Settings, Users, Scripts, Audit log, Exceptions...). Pro uživatele je to džungle.

  **Návrh nového čistého menu:**

  
- 📊 **Dashboard** (Přehled pro manažera / TL)
- 🎧 **Operátorská linka** (Prodejní obrazovka)
- 👥 **Leady & Kampaně** (P1–P4)
- 📦 **Objednávky** (Kanban / expedice)
- 💰 **Peněženka & Provize**
- 🛡️ **Výjimky & Eskalace**
- ⚙️ **Správa systému (Admin Hub)** — *Jedno kliknutí, kde má admin pod sebou záložky: Uživatelé a týmy | Pravidla a automatizace (Workflows) | Produkty a skripty | Audit & Bezpečnost*.

  
---

  
### **Otázka pro tebe jako PM:**

  
1. **Dává ti tato vizualizace Kanbanu u Objednávek a dlaždic P1–P4 u Leadů smysl?**
2. **Kterou věcí se chceš zabývat teď nejdřív:**
  
  
- **A)** Upravit obrazovku **Objednávek** na Kanban board?
- **B)** Zavést do obrazovky **Leadů** dlaždice a logiku oddělení P1–P4?
- **C)** Nejdříve zredukovat a sjednotit levé menu a vytvořit centrální **Admin Hub**?

Všechny testy i kontrola kódu již úspěšně proběhly na 100 % a změny jsou bezpečně uloženy na GitHubu.

  Až budeš mít chvilku, projdi si výše uvedené návrhy a dej mi vědět, jakým směrem (A, B nebo C) se pustíme dál.

Copilot: Nejdřív si zmapuji aktuální stav repozitáře, hlavní dokumentaci a strukturu aplikace; zvlášť ověřím, zda popis „vyčištění dokončeno“ odpovídá skutečnému kódu. Pak sepíšu konkrétní mezery a doporučené další kroky do projektu.

Find files matching `**/*.{md,json,mdx,yml,yaml}`

Search for `ObjectBuilderModal|audio-preview|/monitor|/objects/\[slug\]|P1|P2|P3|P4`

Ran terminal command: git status --short; git branch --show-current; git log -1 --oneline; Get-ChildItem -Force | Select-Object Mode,Name

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\README.md"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\PROJECT.md"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\START_HERE.md"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\PRODUCT_VISION.md"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\AI_PROJECT_UNDERSTANDING.md"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\Review.md"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\PROJECT_GUIDE.md"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\GEMINI_AUDIT.md"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\HISTORY_COMPACT.md"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\package.json"
}

Dokumentace ukazuje jasnou vizi (call-centrovaný systém pro role a oddělení P1–P4), ale nalezl jsem i důležitý nesoulad: výpis projektu stále uvádí telefonní integraci jako současnou součást, zatímco pravidla říkají, že telefonie je odložená. Teď ověřím konkrétní obrazovky, automatizační logiku a ověřitelnost údajů, abych odlišil skutečné produktové mezery od zastaralého textu.

Search for `TODO|FIXME|mock|placeholder|not implemented|coming soon|demo|simulate|stub`

Ran terminal command: git --no-pager log -8 --oneline --decorate; git status --short --ignored=no

Search for `^(#|##|###) |telefon|Telnyx|MVP|TODO|FIXME|hotfix|demo|audit|P3|P4`

Ran terminal command: Get-ChildItem supabase\migrations -File | Measure-Object | Select-Object Count; Get-ChildItem tests -Recurse -File | Measure-Object | Select-Object Count; (Get-ChildItem tests -Recurse -File | Select-String -Pattern '\bit\s*\(|\btest\s*\(').Count; Get-ChildItem src\app -Directory | Select-Object -ExpandProperty Name

Ran terminal command: Get-ChildItem -Path src\app -Recurse -File | ForEach-Object { $_.FullName.Substring((Get-Location).Path.Length + 1) }

Search for `navigation|navItems|Sidebar|href:|telephony|controls|settings|objects|audio-p...`

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\src\\components\\orders\\OrderKanban.tsx"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\src\\app\\orders\\page.tsx"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\src\\proxy.ts"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\src\\app\\leads\\page.tsx"
}

Search for `P3|P4|21|24|recycl|delivered_at|deliveredAt|queue`

Search for `^## |^### |MVP|roadmap|telephon|Telnyx|TODO|FIXME|cleanup|zruš|aktuáln|stav`

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\src\\components\\orders\\OrderPipeline.tsx"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\scripts\\verify-all-migrations.mjs"
}

Read [](), lines 1 to 130
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\HISTORY_COMPACT.md",
  "view_range": [
    1,
    130
  ]
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\src\\components\\layout\\navigation.ts"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\src\\components\\layout\\Sidebar.tsx"
}

Read [](), lines 1 to 180
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\src\\lib\\dal\\activity.ts",
  "view_range": [
    1,
    180
  ]
}

Read [](), lines 1 to 120
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\src\\app\\leads\\page.tsx",
  "view_range": [
    1,
    120
  ]
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\supabase\\migrations\\20261009120000_p4_next_day_and_p3_retention.sql"
}

Read [](), lines 1 to 140
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\src\\components\\orders\\OrderPipeline.tsx",
  "view_range": [
    1,
    140
  ]
}

Ran terminal command: $files = Get-ChildItem supabase\migrations -File -Filter '*.sql' | ForEach-Object { [PSCustomObject]@{Name=$_.Name; Version=($_.BaseName -split '_')[0]} }; $files | Group-Object Version | Where-Object Count -gt 1 | ForEach-Object { $_.Group | Select-Object Name,Version }; Write-Output "Migration files: $($files.Count)"; Write-Output "Duplicate version prefixes: $(($files | Group-Object Version | Where-Object Count -gt 1).Count)"

Search for `department|campaign|P1|P2|P3|P4|CSV|Import|Create Lead|CsvImportModal|OrderPi...`

Search for `20261007140000|migration|128|127|823|822|clean|pročištění|Kanban|P1.*P4|oddělení`

Ran terminal command: npm run verify:migrations

Ran terminal command: npm test -- --reporter=dot

Potvrdil jsem, že testy skutečně procházejí (823/823) a obrazovka objednávek už má Kanban i tabulku; tato část tedy není jen návrh, ale hotová implementace. Našel jsem zároveň konkrétní provozní rozpory: ruční CSV import leadů proti cíli automatického příjmu, chybějící viditelné členění P1–P4, zbylou telefonní vrstvu a dvojí identifikátor migrace, který současná kontrola přehlíží. Sepíšu je jako prioritizovaný audit s ověřenými fakty a doporučeným pořadím řešení.

Search for `^export async function listWorkspaceOrders|\.limit\(|range\(|select\(`

Search for `^## |^### |MVP|TODO|FIXME|gap|risk|recommend|Telnyx|telephon|import|P1|P4|migrat`

Search for `CREATE.*FUNCTION|delivered_at|delivered|cron|schedule|interval|queue|recycl`

Read [](), lines 1 to 90
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\GEMINI_AUDIT.md",
  "view_range": [
    1,
    90
  ]
}

Search for `^([0-9]+\.|## |### )|database|Supabase|migrat|live schema|RLS|ověř|gap|risk|r...`

Read [](), lines 115 to 235
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\src\\app\\leads\\page.tsx",
  "view_range": [
    115,
    235
  ]
}

Edit [](), []()
Completed with input: "*** Begin Patch\n*** Add File: docs/PROJECT_ASSESSMENT_2026-10-10.md\n+# Countdown CRM — analýza projektu\n+\n+**Datum:** 10. 10. 2026  \n+**Rozsah:** produktová vize, hlavní dokumentace, navigace a obrazovky, práce s leady a objednávkami, P1–P4, migrace a automatické testy.  \n+**Typ záznamu:** průběžná analýza repozitáře; nenahrazuje kontrolu živé databáze ani provozní pilot.\n+\n+## Shrnutí pro PM\n+\n+Countdown CRM má srozumitelnou a hodnotnou vizi: propojit každodenní práci operátora, Team Leadera a administrátora do jednoho provozního systému pro call centrum. Hlavní řetězec je **lead → řízená práce a kontakt → výsledek hovoru → objednávka nebo další krok → týmový dohled a vyhodnocení**. Největší hodnotou není počet obrazovek, ale to, že systém bezpečně a bez ručního přepisování posouvá práci dál.\n+\n+Projekt má už pevné části této kostry: oddělení P1–P4 v databázové logice, objednávkový proces, historii změn, řízení přístupů, týmové nástroje a automatické testy. Nedávné vyčištění mrtvých cest je v kódu vidět a `/orders` už nabízí Kanban i tabulku.\n+\n+**Hlavní mezera pro použitelné MVP není další obrazovka. Je to důvěryhodný automatický přísun a směrování leadů, ověřená databázová cesta pro nasazení a jasně dokončený pracovní tok pro každou roli.** Kanban objednávek proto není další nejbližší úkol; je již implementovaný.\n+\n+## Co je ověřeno v repozitáři\n+\n+- Testy při této analýze: **823 úspěšných / 823**, ve **173 souborech**.\n+- Migrace: **128 souborů**. Vlastní `npm run verify:migrations` skončil bez staticky nalezených chyb, ale neprovádí skutečný čistý reset PostgreSQL.\n+- Dvě migrace mají shodný prefix verze `20261007140000`; současná kontrola tuto kolizi nehlásí a její výstup stále říká „ALL 127 MIGRATIONS“.\n+- Obrazovka objednávek má ve výchozím stavu Kanban a nabízí přepnutí na tabulku.\n+- Obrazovka `/leads` zobrazuje obecný seznam/tabuli a filtry; nabízí ruční vytvoření leadu i import CSV. Operátoři v tomto adresáři přístup nemají.\n+- Navigace v kódu obsahuje **17 položek**, zčásti skrytých podle role.\n+- Telnyx/SIP kód a balíčky stále existují, přestože telefonie je podle aktuálních projektových pravidel odložená.\n+\n+Testy jsou dobrým důkazem těch scénářů, které pokrývají; samy o sobě nepotvrzují čisté nasazení migrací, napojení živých dat ani připravenost call centra na pilot.\n+\n+## Záznam zjištění a doporučené akce\n+\n+### 1. Kolize verzí migrací a příliš optimistický výsledek kontroly — vysoká priorita\n+\n+**Zjištění:** `20261007140000_p4_queue_recycling.sql` a `20261007140000_shipment_timeline_and_courier_webhook.sql` sdílejí stejnou verzi. Skript `verify-all-migrations.mjs` migrace pouze staticky prochází; nekontroluje jedinečnost verzí ani nespouští SQL v čisté databázi. Jeho úspěšný výsledek proto není důkazem, že Supabase migrace umí správně aplikovat.\n+\n+**Riziko:** nasazení/reset může narazit na nejednoznačnou migrační historii; současné hlášení navíc přehání rozsah ověření.\n+\n+**Doporučená akce:** před dalším databázovým nasazením zjistit, zda už byly obě migrace někde aplikovány. Potom zvolit bezpečnou opravu historie, doplnit kontrolu duplicitních verzí a ověřit celý řetězec na čisté PostgreSQL/Supabase databázi. Již aplikovanou migraci nepřejmenovávat bez ověření stavu databází.\n+\n+### 2. Ruční import leadů versus cíl plně automatického příjmu — vysoká priorita pro MVP\n+\n+**Zjištění:** `/leads` stále nabízí „Create Lead“ a „Import CSV“. To je v rozporu s projektovým pravidlem, že leady mají přicházet automaticky přes API/webhooky a nikdo je nenahrává ručně. Rozhraní samo také uvádí, že automatické přidělování bude dostupné až po připojení skutečného příjmu nebo fronty.\n+\n+**Riziko:** systém může působit jako CRM připravené k provozu, ale základní přísun a rozdělení práce zůstává ruční nebo nedokončené. Chybí tím ověřený začátek hlavního pracovního řetězce.\n+\n+**Doporučená akce:** určit jeden obecný integrační kontrakt pro příjem leadů (ověření, deduplikace, workspace, zdroj, zařazení do kampaně, audit a opakování při chybě) a navázat na něj automatické směrování. Ruční import/vytvoření ponechat jen pokud má prokazatelný účel v testovacím/demo prostředí; jinak jej před MVP odstranit nebo jasně skrýt.\n+\n+### 3. P1–P4 existují v logice, ale nejsou zřetelným pracovním přehledem — vysoká priorita UX\n+\n+**Zjištění:** databázové změny implementují například recyklaci P4 a plánování retence P3. Adresář `/leads` ale zůstává obecným seznamem/tabulí; nenabízí přehled čtyř oddělení s jejich frontami a počty.\n+\n+**Riziko:** Team Leader nemusí rychle poznat, co čeká na které oddělení, a operátor nemusí v UI rozumět tomu, proč lead právě obsluhuje.\n+\n+**Doporučená akce:** nejprve ověřit pracovní tok na `/workspace` a `/team`, ne přidávat dlaždice bez datového zdroje. Pokud vedoucí potřebuje řídit objem front, doporučuji v `/team` přehled P1–P4 s počty, stářím a stavem; operátorovi ponechat jeho přidělenou frontu a jasný kontext kampaně. Pořadí a obsah ověřit s konkrétními rolemi.\n+\n+### 4. Neuzavřená informační architektura — střední priorita\n+\n+**Zjištění:** navigace stále publikuje 17 cílů. Práva jsou částečně zohledněná, ale správa zůstává rozdělená mezi více samostatných ploch (např. uživatelé, skripty, workflows, audit a technické nastavení). Starší audit v `GEMINI_AUDIT.md` vznikl 26. 9. a obsahuje návrhy i obrazovky, které mezitím změnily stav nebo byly odstraněny.\n+\n+**Doporučená akce:** neodstraňovat položky jen kvůli jejich počtu. Udělat krátkou inventuru podle role a četnosti použití a rozhodnout u každé: ponechat, sloučit, skrýt nebo odstranit. Admin Hub je vhodný kandidát na sjednocení administrativních odkazů; Team Leaderovi může lépe sloužit týmový cockpit s frontou a výjimkami. Zachovat přímé cesty k často používaným operacím.\n+\n+### 5. Telefonie je odložená, ale její implementace zůstává v projektu — střední priorita / bez nových nákladů\n+\n+**Zjištění:** README popisuje Telnyx jako budoucího produkčního providera a repozitář stále obsahuje telefonní stránky, API cesty i Telnyx/SIP závislosti.\n+\n+**Riziko:** starší dokumentace může vést k neplánovanému nastavování nebo výdajům; nevyužívané větve navyšují údržbu a velikost projektu.\n+\n+**Doporučená akce:** sjednotit dokumentaci s aktuálním rozhodnutím „telefonie odložena“. Zmapovat, které části jsou potřebné pro simulovaný workflow, a které jsou čistě provider-specific. Nepřipojovat ani neplatit externího providera. Odstranění závislostí provést až po ověření importů a zachování funkčního demo hovoru.\n+\n+### 6. Neověřená parita živé databáze — předpoklad k potvrzení\n+\n+**Zjištění:** projektový průvodce i starší AI analýza upozorňují, že samotné soubory migrací nepotvrzují stav vývojové/produkční databáze. Tato kontrola neměla přístup k živé databázi a její stav tedy nepotvrzuje.\n+\n+**Doporučená akce:** před pilotem porovnat migrační historii a schéma cílového Supabase prostředí, zkontrolovat RLS a provést scénáře napříč rolemi na syntetických datech. Výsledek zaznamenat zvlášť od statických testů.\n+\n+## Rozhodnutí podle typu plochy\n+\n+| Plocha | Kdo a jak často | Rozhodnutí | Doporučený koncept |\n+|---|---|---|---|\n+| Operator Console `/workspace` | Operátor, každodenně a opakovaně | Ponechat; hlavní operátorská plocha | Jedna soustředěná pracovní fronta s kontextem konkrétní kampaně; operátor si nemá vybírat leady z neřízeného adresáře. |\n+| Team Workspace `/team` a Exception Queue | Team Leader, průběžně během směny | Ponechat a zvážit sjednocení | Cockpit týmu s frontou, výjimkami a asistencí; neodstraňovat výjimky, dokud není jasné, kde TL dokončí stejný úkol. |\n+| Leads `/leads` | Team Leader / Admin podle současných oprávnění | Ponechat jako správcovský adresář; změnit vstup leadů | Tabulka zůstává vhodná pro vyhledávání a správu. P1–P4 je vhodnější provozní přehled front než další obecný kanban tisíců leadů. |\n+| Orders `/orders` | Team Leader / Admin a podle oprávnění operátor | Ponechat; Kanban už existuje | Kanban pro rychlý přehled expedice, tabulku pro hledání/export. Před rozšiřováním ověřit výkon při větším objemu. |\n+| Administration | Administrátor, méně často, ale s vysokou důležitostí | Sjednotit navigaci, ne zahazovat schopnosti | Admin Hub se sekcemi uživatelé/týmy, pravidla, katalog/skripty, audit a technické nastavení. |\n+\n+## Doporučené pořadí práce\n+\n+1. **Ověřit migrační historii a opravit kontrolu migrací** — zabráníme tomu, aby úspěch statického skriptu zamaskoval problém při nasazení.\n+2. **Dokončit kontrakt automatického příjmu a směrování leadů** — bez toho nelze věrohodně ověřit P1/P2 ani celý MVP tok.\n+3. **Projít P1–P4 s operátorem a Team Leaderem** — určit, co kdo potřebuje vidět a dělat v `/workspace` a `/team`.\n+4. **Teprve poté sjednotit navigaci/Admin Hub** podle reálné četnosti úkolů.\n+5. **Připravit malý pilot** se syntetickými/řízenými daty, měřitelným dokončením úkolů a jasným postupem při selhání integrace.\n+\n+**Moje doporučení:** jako nejbližší technickou akci zvolit bod 1; jako nejbližší produktovou prioritu bod 2. Kanban objednávek už není čekající návrh, ale hotová obrazovka, kterou je třeba ověřit v provozním scénáři.\n+\n+## Hranice této analýzy\n+\n+Provedená byla kontrola dokumentace, vybraných cest a obrazovek, testovací sady a statické kontroly migrací. Nebyl proveden přihlášený browserový audit všech rolí, běh migrací na čistém PostgreSQL, audit živého Supabase/RLS ani pilot se skutečnými pracovníky. Záznam proto popisuje ověřené mezery a doporučené další ověření, ne potvrzení produkční připravenosti.\n*** Update File: START_HERE.md\n@@\n Aktuální zdroje:\n \n - [START_HERE.md](START_HERE.md) — co je důležité právě teď;\n - [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md) — produktová identita a oblasti;\n - [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md) — pracovní a technická pravidla;\n - [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md) — zkrácená historie.\n+- [docs/PROJECT_ASSESSMENT_2026-10-10.md](docs/PROJECT_ASSESSMENT_2026-10-10.md) — aktuální analýza mezer a doporučených akcí.\n*** End Patch"
Tool execution failed: Error: Failed to find expected lines in c:\Users\mikes\.projects\countdown-crm\START_HERE.md:
Aktuální zdroje:

- [START_HERE.md](START_HERE.md) — co je důležité právě teď;
- [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md) — produktová identita a oblasti;
- [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md) — pracovní a technická pravidla;
- [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md) — zkrácená historie.

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\START_HERE.md"
}

Edit []()

Ran terminal command: git diff --check; git status --short; git diff --stat; git diff -- START_HERE.md; git diff --no-index -- NUL docs\PROJECT_ASSESSMENT_2026-10-10.md

Read [](), lines 20 to 90
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\START_HERE.md",
  "view_range": [
    20,
    90
  ]
}

Read [](), lines 1 to 120
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\PROJECT_ASSESSMENT_2026-10-10.md",
  "view_range": [
    1,
    120
  ]
}

Ran terminal command: git diff --check; if ($?) { git status --short; git diff --stat; git diff -- START_HERE.md }

Search for `^## |^### |823|20261007140000|Doporučené pořadí|Hranice této analýzy`

Read [](), lines 70 to 110
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\PROJECT_ASSESSMENT_2026-10-10.md",
  "view_range": [
    70,
    110
  ]
}

Ahoj — prošel jsem hlavní dokumentaci, části aplikace a P1–P4 logiku. **Countdown chápu jako provozní CRM pro call centrum**, jehož hlavním cílem je dovést lead od automatického přijetí přes řízenou práci operátora až k objednávce nebo dalšímu kroku a dát Team Leaderovi přehled nad týmem.

Analýzu jsem uložil do [PROJECT_ASSESSMENT_2026-10-10.md]() a aktualizoval přehled aktuálního stavu a roadmapy v [START_HERE.md]().

**Nejdůležitější zjištění:**
- **Příjem leadů je zásadní mezera pro MVP:** stránka `/leads` stále nabízí ruční vytvoření a CSV import, přestože projekt počítá s automatickým příjmem přes API/webhooky.
- **Migrace vyžadují ověření před nasazením:** dvě migrace mají stejný verzovací prefix `20261007140000`. Současná kontrola proběhne, ale pouze staticky; skutečné spuštění na čisté databázi neověřuje.
- **P1–P4 jsou částečně v logice, ale v `/leads` chybí přehled front podle oddělení.** Doporučuji ověřit, jak vedoucí potřebuje sledovat fronty, a neukazovat operátorům neřízený seznam leadů.
- **Kanban objednávek už je hotový** — `/orders` nabízí Kanban i tabulku, takže to není další čekající směr.
- Navigace má 17 cílů; sjednocení administrace do Admin Hubu dává smysl, ale nejdřív je třeba ověřit četnost použití podle rolí.
- Telefonie je podle pravidel odložená, ale její implementace i závislosti v projektu zůstávají. Nedoporučuji žádné nové výdaje; nejdřív sladit dokumentaci a rozhodnout, co je potřeba pro simulovaný režim.

**Moje doporučení:** nejdřív bezpečně vyřešit migrační kolizi a ověřit skutečnou aplikaci migrací; jako hlavní produktovou prioritu potom dokončit automatický příjem a směrování leadů.

Ověření: **823/823 testů prošlo**; statická kontrola migrací skončila bez nalezených chyb, ale její výstup stále hlásí „127 migrations“ a neověřuje čistý databázový reset. Kontrola změn `git diff --check` prošla.

User: Dobře. Částečně s tebou souhlasím. 

1. Okej, to je dobrý nápad
2. Okej, ale teď tohle není prioritou. Jen pro pochopení, nesnažíme se za každou cenu projekt dostat do MVP projektu, ale snažíme se stabilizovat, iterovat, vylepšovat stav systému. Dolazuji design, upravuji působnost systému, estetiku, UI/UX a stále vymýšlíme nové úpravy. Nechci tlačit na dokončení polorozpracovaného projektu, když sám nevěřím tomu, že bych to teď dokázal někomu prodat...
3. Nechápu, zkus to vysvětlit víc po lopatě. Já zdroj leadů nemám, děláme tady kostru, která bude čekat, až ten zdroj leadů bude připojen. Ale tohle taky není priorita.
4. Ok, prosím tě, co se týče dokumentace, Gemini auditu, logu, sjednoť dokumentaci, udělej shrnutí a postav to do jasných pár dokumentů, aby nás neustále nemátla stará a obrovská dokumentace. Telefonie pro mě teď opravdu taky není prioritou, když projektu chybí XY funkcí. 

A jen pro objasnění, takhle nějak vypadá představa, pro lepší pochopení:

                     ┌────────────────────────────────────────────────────────┐
                     │                     NOVÉ LEADY                         │
                     └──────────────────────────┬─────────────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
     ┌────────────────────────┐                                   ┌────────────────────────┐
     │      ODDĚLENÍ P1       │                                   │      ODDĚLENÍ P2       │
     │   (Elitní / Senior)    │                                   │  (Klasická odchozí)    │
     │ • Hot leads z webu     │                                   │ • Běžné odchozí leady  │
     │ • Vzorečky zdarma      │                                   │ • Novější / standardní │
     │ • Náročné custom akce  │                                   │   operátoři            │
     └───────────┬────────────┘                                   └───────────┬────────────┘
                 │                                                             │
                 ├──────────────────────────────┬──────────────────────────────┤
                 │                              │                              │
                 ▼ (Úspěšný prodej)             ▼ (Námitka: cena, nedůvěra...) ▼ (Odmítnutí)
         ┌───────────────┐              ┌────────────────────────┐      ┌─────────────┐
         │  DORUČENÍ     │              │      ODDĚLENÍ P4       │      │   UZAVŘENO  │
         │  (Balíček)    │              │ (Retargeting & Záchrana)│      │ (No interest│
         └───────┬───────┘              │ • Faily (cooldown 24h) │      │  nebo vadný)│
                 │                      │ • Vratky (Re-ship)     │      └─────────────┘
                 │                      │ • Balíčky na výdejně   │
                 │                        (> 3 dny bez hovoru)   │
                 ▼ (po 3 týdnech / 21 dnech)                     │
     ┌────────────────────────┐                                  │
     │      ODDĚLENÍ P3       │                                  │
     │       (Retence)        │◄─────────────────────────────────┘ (při úspěšné
     │ • Spokojenost po 3 týd.│                                     záchraně/objednávce)
     │ • Pokračovací kůra     │
     │ • Upsell / Cross-sell  │
     └────────────────────────┘

Copilot: Rozumím — cílem je průběžně zlepšovat systém, ne tlačit na „hotové MVP“. A k bodu P1–P4: zdroj leadů dodávat nemusíš; jde o to, aby kostra uměla po připojení zdroje správně zařadit nový lead a aby lidé poznali, v jaké frontě pracují. Teď se zaměřím na sjednocení dokumentace a současně oddělím platnou vizi od historických návrhů, které už mohou mást.

Search for `GEMINI_AUDIT|GEMINI_LOG|AI_PROJECT_UNDERSTANDING|PROJECT_ASSESSMENT|countdown...`

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\AGENTS.md"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\PROJECT_GUIDE.md"
}

Ran terminal command: Get-ChildItem docs -Recurse -File | Sort-Object Length -Descending | Select-Object Length,FullName; Get-ChildItem -File -Filter '*.md' | Sort-Object Length -Descending | Select-Object Length,Name

Search for `^#|^##|^###|^\*\*Datum|^\*\*Date|P1|P2|P3|P4|MVP|telefon|Telnyx|To-Do|Priorit...`

Ran terminal command: Get-ChildItem -File -Filter 'countdown-crm-project-bundle-sanitized*.md' | Select-Object Name,Length,LastWriteTime; git status --short;

Read [](), lines 1 to 35
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\countdown-crm-project-bundle-sanitized.md",
  "view_range": [
    1,
    35
  ]
}

Search for `^#|^##|^###`

Search for `^#|^##|^###`

Read [](), lines 1 to 120
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\GEMINI_LOG.md",
  "view_range": [
    1,
    120
  ]
}

Read [](), lines 1 to 160
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\AI_PROJECT_UNDERSTANDING.md",
  "view_range": [
    1,
    160
  ]
}

Našel jsem ještě šest exportních „bundle“ souborů v kořeni repozitáře; dohromady mají zhruba 12,5 MB a jsou to zmrazené kopie stovek souborů z NotebookLM, ne aktuální dokumentace. Zatím je nemažu, protože mohou být stále vaším zdrojem pro NotebookLM. Zatím sloučím Gemini audit/log a zastaralý AI přehled do krátkých, jasných zdrojů pravdy a aktualizuji odkazy i současný směr práce.

Search for `\bGEMINI_AUDIT|\bGEMINI_LOG|AI_PROJECT_UNDERSTANDING|AI_WORKLOG|AI_STUDIO_BAS...`

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\ai\\AI_WORKLOG.md"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\ai\\AI_STUDIO_BASE_PROMPT.md"
}

Read [](), lines 55 to 110
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\HISTORY_COMPACT.md",
  "view_range": [
    55,
    110
  ]
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\PROJECT.md"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\README.md"
}

Edit [](), [](), [](), [](), [](), []()
Completed with input: "*** Begin Patch\n*** Update File: START_HERE.md\n@@\n-## Kde je projekt nyní (stav k 10. 10. 2026)\n+## Kde je projekt nyní (stav k 10. 10. 2026)\n \n-Projekt má postavenou pevnou, modulární kostru dat a byznys logiky:\n+Projekt má rozsáhlou modulární kostru, kterou průběžně stabilizujeme a vylepšujeme. Nejde o tlak na rychlé dokončení nebo prodej MVP:\n - **Testy:** Při poslední kontrole prošlo 823 testů ve 173 souborech.\n - **Kostru kampaní P1–P4:** Implementované jsou pravidla 24h cooldownu pro faily, retence P3 po 21 dnech a záchrany zásilek v P4; provozní nasazení je potřeba ověřit samostatně.\n - **Migrace:** V repozitáři je 128 souborů. Statická kontrola prochází, ale dvě migrace sdílejí verzi `20261007140000`; čistý běh na databázi zatím touto kontrolou není potvrzen.\n@@\n - **Pročištění:** Odstraněné slepé routy a generický Object Builder jsou pryč.\n - **Objednávky:** `/orders` už nabízí Kanban i tabulku; Kanban není čekající návrh.\n \n-## Aktuální roadmapa k reálnému MVP\n+## Jak chápat P1–P4\n \n-Pro další krok je důležitější ověřit provozní základ než přidávat další obrazovky:\n-1. **Ověřit migrační historii:** Vyřešit duplicitní verzi a ověřit aplikaci na čisté databázi.\n-2. **Dokončit automatický příjem leadů:** Navrhnout obecné API/webhook napojení, deduplikaci, přiřazení workspace/kampaně a bezpečné opakování při chybě.\n-3. **Ověřit P1–P4 v pracovních obrazovkách:** Jasně ukázat vedoucímu stav a objem front; operátorovi ponechat řízené přidělení leadů.\n-4. **Zmapovat navigaci podle role a četnosti:** Potom rozhodnout, které položky ponechat, sloučit do Team Workspace/Admin Hubu nebo odstranit.\n-5. **Připravit malý pilot:** Ověřit hlavní scénáře operátora, Team Leadera a administrátora na bezpečných datech.\n+Nemusíme teď mít skutečný zdroj leadů. Stavíme připravenou kostru, do které se budoucí zdroj napojí. Až data přijdou, systém je podle nastavených pravidel zařadí do správného oddělení a fronty:\n \n+- **P1 a P2** jsou dvě odchozí linky: P1 pro prioritní/komplexnější práci zkušených operátorů, P2 pro běžnou odchozí práci. Konkrétní produkty, akce ani zdroje se do logiky natvrdo nezapisují.\n+- **P4** zachraňuje vybrané nedokončené případy z P1/P2, vratky a rizikové zásilky. Ne každý neúspěšný hovor sem patří; trvale uzavřené důvody zůstávají uzavřené.\n+- **P3** oslovuje zákazníka znovu po doručení a uplynutí 21 dní.\n+- Operátor pracuje se svojí přidělenou frontou; Team Leader potřebuje přehled o provozu a výjimkách. Nejde o ruční výběr leadů ani o přidání dlaždic bez užitečných dat.\n \n-## Co právě nemáme dělat\n+Zjednodušeně:\n \n-- nepřidávat nové obrazovky jen proto, aby systém působil větší;\n-- nepřepisovat důležitou business logiku kvůli vzhledu;\n-- nepřipojovat demo k náhodné živé databázi;\n-- nespoléhat na AI Studio jako na hlavní pracovní kopii repozitáře;\n-- nepublikovat změny na GitHub bez kontroly rozdílu, testů a tajných hodnot;\n-- nehodnotit celý produkt pouze podle Operator Console.\n+```text\n+Nové leady ──► P1 nebo P2 ──┬──► prodej ──► doručení ──► po 21 dnech P3\n+                            ├──► vhodný neúspěch ──► P4\n+                            └──► nezájem / neplatný případ ──► uzavřeno\n+\n+Vratka nebo riziková zásilka ──► P4 ──► záchrana / případná nová objednávka\n+```\n+\n+Zdroj dat může být budoucí API nebo webhook; jeho připojení není podmínkou pro současnou práci na vzhledu a použitelnosti. Když mluvíme o „přehledu P1–P4“, jde o to, aby týmový vedoucí poznal, jak práce mezi odděleními proudí — ne o to, že PM musí dodat leady.\n+\n+## Současný způsob práce\n+\n+Projekt se iterativně stabilizuje a rozvíjí: ladíme působnost systému, vzhled, estetiku a každodenní použitelnost. Prioritu určujeme podle aktuální potřeby, ne podle tlaku na termín MVP. Další možné směry a zjištění jsou v [docs/PROJECT_ASSESSMENT_2026-10-10.md](docs/PROJECT_ASSESSMENT_2026-10-10.md); pořadí je orientační, ne závazný plán.\n+\n+## Co právě nemáme dělat\n+\n+- nepřidávat obrazovky jen proto, aby systém působil větší;\n+- neměnit business pravidla bez potvrzení jejich zamýšleného chování;\n+- nepřipojovat demo k náhodné živé databázi;\n+- nezaměňovat exportovaný snapshot nebo tvrzení z historického AI auditu za aktuální stav;\n+- nepublikovat změny bez kontroly diffu, testů a tajných hodnot;\n+- nehodnotit celý produkt pouze podle Operator Console;\n+- neinvestovat do VoIP/Telnyx, dokud uživatel telefonii znovu nezařadí mezi priority.\n@@\n-Podrobnější vize je v [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md), aktuální provozní pravidla v [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md), kompaktní historie v [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md) a analýza mezer s doporučenými akcemi v [docs/PROJECT_ASSESSMENT_2026-10-10.md](docs/PROJECT_ASSESSMENT_2026-10-10.md).\n+Podrobnější vize je v [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md), pracovní pravidla v [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md), stručná historie v [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md) a přehled zjištění v [docs/PROJECT_ASSESSMENT_2026-10-10.md](docs/PROJECT_ASSESSMENT_2026-10-10.md).\n*** Update File: README.md\n@@\n-Začněte v [START_HERE.md](START_HERE.md). Aktuální vize, pracovní pravidla a kompaktní historie jsou v [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md), [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md) a [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md).\n+Začněte v [START_HERE.md](START_HERE.md). Závazným kontextem jsou také [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md), [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md), [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md) a aktuální záznam zjištění [docs/PROJECT_ASSESSMENT_2026-10-10.md](docs/PROJECT_ASSESSMENT_2026-10-10.md). Starší AI audity a exportované bundle soubory nejsou zdrojem aktuálního stavu.\n@@\n-- Telefonní integrační vrstva s Telnyx jako budoucím produkčním providerem\n+- Simulovaný pracovní tok; produkční VoIP/Telnyx je odloženo a není aktuální priorita\n@@\n-| Hovory a telefonie | `/calls`, `/telephony` |\n+| Hovory a telefonní nastavení (telefonie odložena) | `/calls`, `/telephony` |\n*** Update File: PROJECT.md\n@@\n Aktuální zdroje:\n \n - [START_HERE.md](START_HERE.md) — co je důležité právě teď;\n - [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md) — produktová identita a oblasti;\n - [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md) — pracovní a technická pravidla;\n-- [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md) — zkrácená historie.\n+- [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md) — stručná historie rozhodnutí a vývoje;\n+- [docs/PROJECT_ASSESSMENT_2026-10-10.md](docs/PROJECT_ASSESSMENT_2026-10-10.md) — ověřená zjištění a možné další kroky.\n+\n+Projekt se průběžně stabilizuje a vylepšuje; není na něj kladen tlak dokončit nebo prodávat MVP. Pořadí práce se domlouvá průběžně podle potřeb PM.\n*** Update File: docs/PRODUCT_VISION.md\n@@\n-## Aktuální strategická priorita\n-\n-Nejdříve zvalidovat produktovou architekturu a použitelnost celku. Potom určit pořadí stabilizace a redesignu. Nová funkce má vzniknout až tehdy, když je jasné, do které produktové oblasti patří, komu slouží a jak se ověří její přínos.\n+## Jak se vize používá\n+\n+Countdown se vyvíjí iterativně. Cílem není za každou cenu dokončit ani prodávat MVP; cílem je postupně stabilizovat systém, zpřesňovat jeho působnost a zlepšovat design, estetiku a použitelnost. Produktová rozhodnutí a nové úpravy jsou očekávanou součástí práce.\n+\n+Při návrhu každé změny ujasníme, komu slouží, jaký pracovní problém řeší a jak poznáme, že je přínosná. To pomáhá držet systém srozumitelný, ale nebrání rozšiřovat jeho schopnosti podle vize. Reálný zdroj leadů ani produkční telefonie nejsou podmínkou pro iterování nad zbytkem systému.\n*** Update File: docs/PROJECT_GUIDE.md\n@@\n - Tento soubor definuje bezpečný pracovní postup.\n - Demo data nejsou produkční data.\n-- Starší historický záznam není automaticky platné zadání.\n+- Historické audity, exporty a starší stavové záznamy nejsou automaticky platné zadání.\n+- Aktuální priority průběžně určuje PM; roadmapa není závazek dokončit MVP.\n@@\n-## Aktuální pořadí práce\n+## Iterační způsob práce\n \n-1. Stabilizovat a ověřit lokální demo prostředí.\n-2. Zmapovat produktové oblasti, role, navigaci a hlavní workflow.\n-3. Provést UX audit celého produktu, ne pouze Operator Console.\n-4. Navrhnout novou informační architekturu.\n-5. Vybrat první workflow k funkčnímu zlepšení.\n-6. Teprve potom provádět cílený redesign a implementaci.\n+Projekt se průběžně stabilizuje, rozšiřuje a ladí. Před každou změnou stanovte její rozsah společně s PM; nedoplňujte automaticky další úkoly z historických roadmap.\n+\n+- Vzhled a použitelnost se mohou iterovat i tehdy, když jiné oblasti zůstávají rozpracované.\n+- Skutečný zdroj leadů ani produkční telefonie nejsou předpokladem pro vývoj obecné kostry či ostatních workflow.\n+- Nezobrazujte ani neimplementujte vstupní data, která PM nemá; rozhraní a datový model mají být připravené na budoucí integraci.\n+- Při úpravě obrazovky zvažte roli, četnost, rozhodnutí ponechat/sjednotit/smazat, důležitost a alternativní UI/UX.\n+- Historickou poznámku nebo výsledek auditu nejprve porovnejte s aktuálním kódem.\n*** Update File: docs/PROJECT_ASSESSMENT_2026-10-10.md\n@@\n-**Hlavní mezera pro použitelné MVP není další obrazovka. Je to důvěryhodný automatický přísun a směrování leadů, ověřená databázová cesta pro nasazení a jasně dokončený pracovní tok pro každou roli.** Kanban objednávek proto není další nejbližší úkol; je již implementovaný.\n+Tento záznam **není tlak na dokončení MVP ani závazné pořadí vývoje**. Jde o soubor ověřených nesouladů a námětů pro průběžnou stabilizaci a vylepšování. Budoucí automatický přísun leadů patří do obecné kostry, ale jeho integrace není nyní prioritou. Kanban objednávek je již implementovaný.\n@@\n-### 2. Ruční import leadů versus cíl plně automatického příjmu — vysoká priorita pro MVP\n+### 2. Ruční import leadů versus záměr automatického příjmu — budoucí integrace\n@@\n-**Riziko:** systém může působit jako CRM připravené k provozu, ale základní přísun a rozdělení práce zůstává ruční nebo nedokončené. Chybí tím ověřený začátek hlavního pracovního řetězce.\n+**Riziko:** současné rozhraní může působit, jako by ruční nahrávání bylo součástí zamýšleného běžného provozu.\n \n-**Doporučená akce:** určit jeden obecný integrační kontrakt pro příjem leadů (ověření, deduplikace, workspace, zdroj, zařazení do kampaně, audit a opakování při chybě) a navázat na něj automatické směrování. Ruční import/vytvoření ponechat jen pokud má prokazatelný účel v testovacím/demo prostředí; jinak jej před MVP odstranit nebo jasně skrýt.\n+**Doporučená akce:** ponechat napojení jako budoucí modulární schopnost. Až bude na řadě, navrhnout obecný kontrakt pro ověření, deduplikaci, workspace, zdroj, zařazení do kampaně, audit a opakování při chybě. Teď PM nemusí dodávat zdroj dat a toto téma není prioritou.\n@@\n-**Doporučená akce:** nejprve ověřit pracovní tok na `/workspace` a `/team`, ne přidávat dlaždice bez datového zdroje. Pokud vedoucí potřebuje řídit objem front, doporučuji v `/team` přehled P1–P4 s počty, stářím a stavem; operátorovi ponechat jeho přidělenou frontu a jasný kontext kampaně. Pořadí a obsah ověřit s konkrétními rolemi.\n+**Vysvětlení po lopatě:** nepotřebujeme skutečné leady, abychom navrhli správné přihrádky. „Přehled P1–P4“ znamená, že vedoucí může později vidět, kolik případů čeká v každém oddělení a proč do něj patří. Operátor pak dostane práci ze své určené fronty. Je to návrh, jak má kostra chování rozdělit, nikoli požadavek PM, aby sehnal data nebo teď objednal novou obrazovku.\n+\n+**Doporučená akce:** ponechat jako námět pro budoucí iteraci UI. Až se k němu vrátíme, nejdřív projít pracovní tok na `/workspace` a `/team` a určit informace užitečné pro každou roli; nepřidávat dlaždice bez praktického účelu.\n@@\n-## Doporučené pořadí práce\n+## Možné další kroky (ne závazná roadmapa)\n@@\n-**Moje doporučení:** jako nejbližší technickou akci zvolit bod 1; jako nejbližší produktovou prioritu bod 2. Kanban objednávek už není čekající návrh, ale hotová obrazovka, kterou je třeba ověřit v provozním scénáři.\n+PM může kdykoli zvolit jinou oblast podle aktuální práce na designu, estetice, rozsahu nebo UX. Kanban objednávek už není čekající návrh; je hotová obrazovka, kterou lze dále iterativně ladit.\n*** End Patch"
Tool execution failed: Failed to apply patch: Error: Failed to find expected lines in c:\Users\mikes\.projects\countdown-crm\START_HERE.md:
## Kde je projekt nyní (stav k 10. 10. 2026)

Projekt má postavenou pevnou, modulární kostru dat a byznys logiky:
- **Testy:** Při poslední kontrole prošlo 823 testů ve 173 souborech.
- **Kostru kampaní P1–P4:** Implementované jsou pravidla 24h cooldownu pro faily, retence P3 po 21 dnech a záchrany zásilek v P4; provozní nasazení je potřeba ověřit samostatně.
- **Migrace:** V repozitáři je 128 souborů. Statická kontrola prochází, ale dvě migrace sdílejí verzi `20261007140000`; čistý běh na databázi zatím touto kontrolou není potvrzen.

Read [](), lines 18 to 90
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\START_HERE.md",
  "view_range": [
    18,
    90
  ]
}

Edit []()
Completed with input: "*** Begin Patch\n*** Update File: START_HERE.md\n@@\n-Projekt má postavenou pevnou, modulární kostru dat a byznys logiky:\n+Projekt má rozsáhlou modulární kostru, kterou průběžně stabilizujeme a vylepšujeme. Nejde o tlak na rychlé dokončení nebo prodej MVP:\n@@\n-## Aktuální roadmapa k reálnému MVP\n-\n-Pro další krok je důležitější ověřit provozní základ než přidávat další obrazovky:\n-1. **Ověřit migrační historii:** Vyřešit duplicitní verzi a ověřit aplikaci na čisté databázi.\n-2. **Dokončit automatický příjem leadů:** Navrhnout obecné API/webhook napojení, deduplikaci, přiřazení workspace/kampaně a bezpečné opakování při chybě.\n-3. **Ověřit P1–P4 v pracovních obrazovkách:** Jasně ukázat vedoucímu stav a objem front; operátorovi ponechat řízené přidělení leadů.\n-4. **Zmapovat navigaci podle role a četnosti:** Potom rozhodnout, které položky ponechat, sloučit do Team Workspace/Admin Hubu nebo odstranit.\n-5. **Připravit malý pilot:** Ověřit hlavní scénáře operátora, Team Leadera a administrátora na bezpečných datech.\n+## Jak chápat P1–P4\n+\n+Nemusíme teď mít skutečný zdroj leadů. Stavíme připravenou kostru, do které se budoucí zdroj napojí. Až data přijdou, systém je podle nastavených pravidel zařadí do správného oddělení a fronty:\n+\n+- **P1 a P2** jsou dvě odchozí linky: P1 pro prioritní/komplexnější práci zkušených operátorů, P2 pro běžnou odchozí práci. Konkrétní produkty, akce ani zdroje se do logiky natvrdo nezapisují.\n+- **P4** zachraňuje vybrané nedokončené případy z P1/P2, vratky a rizikové zásilky. Ne každý neúspěšný hovor sem patří; trvale uzavřené důvody zůstávají uzavřené.\n+- **P3** oslovuje zákazníka znovu po doručení a uplynutí 21 dní.\n+- Operátor pracuje se svojí přidělenou frontou; Team Leader potřebuje přehled o provozu a výjimkách. Nejde o ruční výběr leadů ani o přidání dlaždic bez užitečných dat.\n+\n+Zjednodušeně:\n+\n+```text\n+Nové leady ──► P1 nebo P2 ──┬──► prodej ──► doručení ──► po 21 dnech P3\n+                            ├──► vhodný neúspěch ──► P4\n+                            └──► nezájem / neplatný případ ──► uzavřeno\n+\n+Vratka nebo riziková zásilka ──► P4 ──► záchrana / případná nová objednávka\n+```\n+\n+Zdroj dat může být budoucí API nebo webhook; jeho připojení není podmínkou pro současnou práci na vzhledu a použitelnosti. Přehled P1–P4 znamená, že vedoucí může později vidět, jak práce mezi odděleními proudí — ne že PM musí dodat leady.\n+\n+## Současný způsob práce\n+\n+Projekt se iterativně stabilizuje a rozvíjí: ladíme působnost systému, vzhled, estetiku a každodenní použitelnost. Prioritu určujeme podle aktuální potřeby, ne podle tlaku na termín MVP. Další možná zjištění jsou v [docs/PROJECT_ASSESSMENT_2026-10-10.md](docs/PROJECT_ASSESSMENT_2026-10-10.md); pořadí je orientační, ne závazný plán.\n@@\n-- nepřidávat nové obrazovky jen proto, aby systém působil větší;\n-- nepřepisovat důležitou business logiku kvůli vzhledu;\n+- nepřidávat obrazovky jen proto, aby systém působil větší;\n+- neměnit business pravidla bez potvrzení jejich zamýšleného chování;\n@@\n-- nespoléhat na AI Studio jako na hlavní pracovní kopii repozitáře;\n+- nezaměňovat exportovaný snapshot nebo tvrzení z historického AI auditu za aktuální stav;\n@@\n - nehodnotit celý produkt pouze podle Operator Console.\n+- neinvestovat do VoIP/Telnyx, dokud uživatel telefonii znovu nezařadí mezi priority.\n@@\n-Podrobnější vize je v [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md), aktuální provozní pravidla v [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md), kompaktní historie v [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md) a analýza mezer s doporučenými akcemi v [docs/PROJECT_ASSESSMENT_2026-10-10.md](docs/PROJECT_ASSESSMENT_2026-10-10.md).\n+Podrobnější vize je v [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md), pracovní pravidla v [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md), stručná historie v [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md) a přehled zjištění v [docs/PROJECT_ASSESSMENT_2026-10-10.md](docs/PROJECT_ASSESSMENT_2026-10-10.md).\n*** End Patch"
Tool execution failed: Failed to apply patch: Error: Failed to find expected lines in c:\Users\mikes\.projects\countdown-crm\START_HERE.md:
Podrobnější vize je v [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md), aktuální provozní pravidla v [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md), kompaktní historie v [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md) a analýza mezer s doporučenými akcemi v [docs/PROJECT_ASSESSMENT_2026-10-10.md](docs/PROJECT_ASSESSMENT_2026-10-10.md).

Search for `Podrobnější vize`

Edit []()

Edit [](), [](), [](), [](), []()

Edit []()

Edit []()

Edit [](), [](), [](), []()

Edit []()

Read [](), lines 1 to 105
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\PROJECT_ASSESSMENT_2026-10-10.md",
  "view_range": [
    1,
    105
  ]
}

Read [](), lines 20 to 110
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\START_HERE.md",
  "view_range": [
    20,
    110
  ]
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\PROJECT_GUIDE.md"
}

Read []()
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\README.md"
}

Search for `GEMINI_AUDIT|GEMINI_LOG|AI_PROJECT_UNDERSTANDING|AI_WORKLOG|HISTORY_COMPACT|P...`

Edit [](), [](), []()

Sjednocení dokumentace je hotové v hlavních směrových souborech: teď výslovně říkají, že projekt se vyvíjí po iteracích a že připojení lead zdroje ani VoIP nejsou aktuální předpoklady. Historický Gemini audit, jeho dlouhý log a zastaralý AI přehled jsem odstranil jako samostatné zdroje, jejich užitečný kontext je shrnutý v krátké historii a aktuálních zjištěních. Zbývá zkontrolovat odkazy a diff; velké exportované NotebookLM snapshoty jsem záměrně nechal nedotčené.

Search for `MVP|Telefon|Telnyx|P1–P4|P1.*P2`

Search for `GEMINI_AUDIT\.md|GEMINI_LOG\.md|AI_PROJECT_UNDERSTANDING\.md|AI_WORKLOG\.md|A...`

Ran terminal command: Get-ChildItem docs -Recurse -File | Sort-Object Length -Descending | Select-Object Length,FullName; Get-ChildItem -File -Filter 'countdown-crm-project-bundle-sanitized*.md' | Measure-Object -Property Length -Sum | Select-Object Count,Sum

Ran terminal command: git diff --check; git status --short; git diff --stat; git diff --numstat

Edit [](), []()
Completed with input: "*** Begin Patch\n*** Update File: docs/PROJECT_ASSESSMENT_2026-10-10.md\n@@\n-**Zjištění:** README popisuje Telnyx jako budoucího produkčního providera a repozitář stále obsahuje telefonní stránky, API cesty i Telnyx/SIP závislosti.\n+**Zjištění:** před touto konsolidací README popisovalo Telnyx jako budoucího produkčního providera. Dokumentace je nyní opravena; repozitář ale stále obsahuje telefonní stránky, API cesty i Telnyx/SIP závislosti.\n@@\n-1. **Ověřit migrační historii a opravit kontrolu migrací** — zabráníme tomu, aby úspěch statického skriptu zamaskoval problém při nasazení.\n-2. **Dokončit kontrakt automatického příjmu a směrování leadů** — bez toho nelze věrohodně ověřit P1/P2 ani celý MVP tok.\n-3. **Projít P1–P4 s operátorem a Team Leaderem** — určit, co kdo potřebuje vidět a dělat v `/workspace` a `/team`.\n-4. **Teprve poté sjednotit navigaci/Admin Hub** podle reálné četnosti úkolů.\n-5. **Připravit malý pilot** se syntetickými/řízenými daty, měřitelným dokončením úkolů a jasným postupem při selhání integrace.\n+1. **Ověřit migrační historii a opravit kontrolu migrací** — technický nesoulad stojí za bezpečné vyřešení před další prací s databázovou historií.\n+2. **Při budoucím plánování příjmu leadů** navrhnout obecný kontrakt a směrování; integrace zdroje nyní není prioritou.\n+3. **Při další iteraci P1–P4 obrazovek** určit, co operátor a Team Leader skutečně potřebují vidět v `/workspace` a `/team`.\n+4. **Pokud se ukáže, že navigace překáží**, zmapovat její položky podle role a četnosti a teprve pak zvážit Admin Hub.\n+5. **Pilot** je jedna z budoucích možností ověření, nikoli podmínka pro současné ladění systému.\n@@\n-Vratka nebo riziková zásilka ──► P4 ──► úspěšná záchrana/objednávka ──► P3\n+Vratka nebo riziková zásilka ──► P4 ──► záchrana/nová objednávka ──► doručení ──► po 21 dnech P3\n*** Update File: START_HERE.md\n@@\n-Vratka nebo riziková zásilka ──► P4 ──► úspěšná záchrana/objednávka ──► P3\n+Vratka nebo riziková zásilka ──► P4 ──► záchrana/nová objednávka ──► doručení ──► po 21 dnech P3\n*** End Patch"
Tool execution failed: Failed to apply patch: Error: Failed to find expected lines in c:\Users\mikes\.projects\countdown-crm\docs\PROJECT_ASSESSMENT_2026-10-10.md:
Vratka nebo riziková zásilka ──► P4 ──► úspěšná záchrana/objednávka ──► P3

Edit [](), []()

Search for `GEMINI_AUDIT\.md|GEMINI_LOG\.md|AI_PROJECT_UNDERSTANDING\.md|AI_WORKLOG\.md|r...`

Ran terminal command: git diff --check; if ($?) { git status --short; git diff --stat }

Ran terminal command: Get-ChildItem -File -Filter 'countdown-crm-project-bundle-sanitized*.md' | Measure-Object -Property Length -Sum | Select-Object Count,Sum; Get-ChildItem docs -File | Select-Object Name,Length

Zeptat se uživatele
Completed with input: {
  "question": "V kořeni zůstalo šest exportovaných NotebookLM snapshotů o celkové velikosti přibližně 12,5 MB. Jsou staré, mohou obsahovat zastaralé informace a už nejsou zdrojem pravdy; smazání ale může ovlivnit váš případný workflow s NotebookLM. Co s nimi mám udělat?",
  "choices": [
    "Ponechat je — občas je používám v NotebookLM",
    "Smazat všech šest starých exportů a nechat jen aktuální dokumentaci"
  ]
}

Rozumím, exporty NotebookLM už nepotřebuješ. Smažu těchto šest konkrétních starých snapshotů a pak ověřím, že zůstala jen sjednocená dokumentace a diff je čistý.

Edit [](), [](), [](), [](), [](), []()

Search for `GEMINI_AUDIT\.md|GEMINI_LOG\.md|AI_PROJECT_UNDERSTANDING\.md|AI_WORKLOG\.md|c...`

Ran terminal command: Get-ChildItem -File -Filter 'countdown-crm-project-bundle-sanitized*.md' -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum | Select-Object Count,Sum; Get-ChildItem docs -Recurse -File | Select-Object FullName,Length

Ran terminal command: git diff --check; if ($?) { git status --short; git diff --stat }

Rozumím: **Countdown není projekt, který je potřeba co nejrychleji dotlačit do MVP.** Je to systém, který chceš průběžně stabilizovat, rozšiřovat a ladit — včetně jeho působnosti, vzhledu a UX. Podle toho jsem upravil dokumentaci a odstranil formulace, které zněly jako závazná MVP roadmapa.

P1–P4 jednoduše: představ si je jako **přihrádky a pravidla pro to, kam práce putuje**, až budou někdy připojené leady. Zdroje teď mít nemusíš. P1 a P2 jsou běžné a prioritní odchozí linky; vhodné neúspěšné případy a vratky jdou do P4; po úspěšné záchraně, doručení a uplynutí 21 dní může navázat P3. Operátor dostane práci z přidělené fronty, vedoucí může sledovat provoz. Je to popis zamýšleného fungování, **ne požadavek teď stavět nové dlaždice nebo připojovat zdroj leadů**. Vysvětlení je i v [START_HERE.md]().

Dokumentaci jsem zjednodušil na jasné zdroje: [produktovou vizi](), [pracovní pravidla](), [stručnou historii]() a [záznam zjištění](). Aktualizoval jsem také [README](), [PROJECT.md]() a kontextový prompt pro AI Studio. Staré Gemini audity, dlouhý log a zastaralý AI přehled jsem odstranil; po tvém potvrzení jsem smazal i šest zastaralých exportů NotebookLM — dohromady asi **12,4 MB**.

Kolizi verzí databázových migrací jsem zatím **jen zaznamenal**: nepřejmenovával jsem migrační soubor, protože bezpečný postup závisí na tom, zda už byl použit v některé databázi. Kód aplikace jsem neměnil. Protože šlo o dokumentační změny, testy jsem znovu nespouštěl; `git diff --check` prošel a nezůstaly odkazy na odstraněné dokumenty.

User: Vidíš můj poslední prompt?

Copilot: Ano — vidím ho. Všimnul jsem si, že jsi napsal hlavní směr práce a kritické priority:

- nechat projekt stabilizovat a iterovat, ne tlačit do polorozpracovaného MVP
- neprioritizovat zdroj leadů ani telefonii
- soustředit se na to, aby systém byl srozumitelný, přehledný a „dýchal“ designem a UX
- sjednotit a zredukovat dokumentaci, aby nešuměla zastaralými AI exporty a dlouhými záznamy
- udržovat hlavní vizi projektu a současný směr práce v jasných, krátkých zdrojích

To, co jsem dnes upravil, je v souladu s tímto přístupem:
- [START_HERE.md]()
- [docs/PROJECT_GUIDE.md]()
- [docs/HISTORY_COMPACT.md]()
- [docs/PROJECT_ASSESSMENT_2026-10-10.md]()

Je to kratší a účelnější než stará AI dokumentace. Taky jsem vyřadil „mrtvé“ AI exporty a záznamy, které by mohly zaměňovat aktuální stav za zastaralý stav. S tímto přístupem souhlasím: dokumentace má být navigací pro práci, ne archiv historických chatů.

Co teď můžeme dělat jako další krok:
- buď se pustit do konkrétního UX/UI auditního záznamu pro jednou obrazovku / modul
- nebo přesunout k tomu, co je pro projekt nejvíc potřeba z hlediska použitelnosti a designu v aktuálním stavu

Jestli chceš, můžu teď pokračovat v tomhle směru:
1. zjednodušit a upravit UI/UX architekturu pro klíčové obrazovky
2. připravit krátký audit „co zachovat / sloučit / odstranit“ pro navigaci a role
3. vytvořit konkrétní plán, které obrazovky a moduly upravovat jako další iteraci

Pokud chceš, můžu to udělat hned jako stručný návrh „dále“.

User: Vytvoř plán, který budou prioritou v dalších fázi vývoje. Sestav v bodech roadmapu, podle které budeme dále pracovat. Rozděl body na malé bezpečné, ověřitelné části. Vem také v potaz mou poslední konverzaci s Gemini v Antigravity - začali jsme s pročišťováním systému, eliminací zbytečných funkcí.

Copilot: 

User: Vytvoř plán, který bude prioritou v dalších fázi vývoje. Sestav v bodech roadmapu, podle které budeme dále pracovat. Rozděl body na malé bezpečné, ověřitelné části. Vem také v potaz mou poslední konverzaci s Gemini v Antigravity - začali jsme s pročišťováním systému, eliminací zbytečných funkcí.

Copilot: Read [](), lines 1 to 220
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\START_HERE.md",
  "view_range": [
    1,
    220
  ]
}

Read [](), lines 1 to 220
Completed with input: {
  "path": "C:\\Users\\mikes\\.projects\\countdown-crm\\docs\\PROJECT_ASSESSMENT_2026-10-10.md",
  "view_range": [
    1,
    220
  ]
}

Jasně — plán budeme stavět tak, aby vycházel z toho, co už je hotové po pročištění a odstranění mrtvého kódu, a aby nešel do velkých a riskantních změn najednou.

Vyjdeme z toho, že projekt má být:
- čistý a srozumitelný
- stabilní, ne „MVP na sílu“
- postupně rozšiřovaný podle skutečné potřeby rolí
- veden podle zjednodušené a bezpečné architektury: role → fronty → workflow → zprávy / reporty

Základní směr schvaluji takto:
- nepracujeme na lead source
- nepracujeme na telefonii
- neplánujeme „velkou novou funkcionalitu“ bez ověření use case a role
- dále pokračujeme v pročišťování, pak v role-based UX, pak v provozních frontách a datových pravidlech

Níže je roadmap pro další fáze vývoje:

1. Fáze 0 — Stabilizační základ po pročištění
- Cíl:
  - upevnit to, co už bylo vyčištěno
  - zkontrolovat, že žádná odstraněná funkce neukazuje v systému na mrtvé odkazy nebo prázdné stavy
- Bezpečné dílčí kroky:
  - ověřit, že všechny odstraněné route, menu a moduly skutečně neexistují
  - zkontrolovat navigation tree a role-based access
  - odstranit zbylé nevyužívané komponenty / zbytečné API endpointy
  - ověřit build, lint, tests a případné chybějící importy
- Ověřitelné výstupy:
  - žádné prázdné nebo zkrácené navigační odkazy
  - 0 mrtvých cest v routing
  - build/test green
- Důvod:
  - toto je nejbezpečnější pokračování po předchozím cleanup v Antigravity

2. Fáze 1 — Sjednocení navigace a admin struktury
- Cíl:
  - zredukovat chaos v levém menu a admin sekci
  - vytvořit jasnou hierarchii, aniž by se projekt rozpadl do 20 “specialized screens”
- Bezpečné dílčí kroky:
  - seskupit položky podle role: Operator, Team Leader, Admin
  - vytvořit jeden “Admin Hub” s podkategorie:
    - users & teams
    - workflows & automation
    - campaigns & intake rules
    - audit & monitoring
  - přesunout technické a administrativní nastavení pod jednu logickou strukturu
  - skrýt/odstranit duplicitní nebo nevyužívané položky
- Ověřitelné výstupy:
  - maximálně 1 hlavní admin hub místo roztroušených položek
  - každá položka má vysvětlení: „kdo ji používá a proč“
  - uživatel po 3 kliknutích najde základní správu
- Důvod:
  - to je okamžitě cítit v produktivním používání a nevyžaduje lead source ani telefonii

3. Fáze 2 — Role-based UX pass (operátor, TL, admin)
- Cíl:
  - vyjasnit, co má která role v systému dělat
  - odfiltrovat nevyužité funkce a zjednodušit každou obrazovku
- Bezpečné dílčí kroky:
  - definovat 3 hlavní role a jejich primární pracovní plochy
  - každá plocha má:
    - 1 hlavní pohled
    - 1 úkolový pracovní tok
    - 1 přehled stavu
  - přepsat navigaci podle skutečné práce, ne podle “náhledů”
  - vyloučit obrazovky, které neodpovídají dnešní operaci
- Ověřitelné výstupy:
  - každá role má jasný dashboard nebo pracovní prostor
  - operátor nevidí admin nastavení
  - Team Leader vidí přehled týmů a výjimek
  - admin má správu systému v jednom místě
- Důvod:
  - to dává největší přínos bez nutnosti přidávat nové produkty nebo data

4. Fáze 3 — Objednávky: stabilizace aktuálního Kanban / workflow
- Cíl:
  - udržet objednávky jako fyzicky funkční provozní nástroj, ne pouze vizuální experiment
- Bezpečné dílčí kroky:
  - zkontrolovat flow od „vytvořeno → k expedici → odesláno → na výdejně → doručeno → retenční oddělení“
  - potvrdit statusy a jejich logiku
  - přidat/opravit jasné rozhraní pro výjimky a dlouhé stavy
  - doplnit filtraci, počítadla, a rozlišení „v klidu / riziko / alarm“
  - dořešit “3 dny na výdejně” a eventy na úrovni pravidel
- Ověřitelné výstupy:
  - každý status má definovaný trigger a způsob řešení
  - výjimka je vidět hned, ne až po prohlížení detailu
  - Team Leader může rychle rozpoznat rizikové zásilky
- Důvod:
  - objednávky jsou jeden z nejdůležitějších pracovníků systému a už jsou v projektu funkční

5. Fáze 4 — P1–P4 jako obecný provozní model, ne jako “falesný MVP”
- Cíl:
  - implementovat obecnou architekturu oddělení, aniž bychom tvrdili, že už máme real lead source
- Bezpečné dílčí kroky:
  - vytvořit abstraktní model:
    - lead source
    - campaign / department
    - team
    - status
    - queue
    - reason
    - outcome
  - připravit jednoduché fronty pro P1–P4 bez hardcodovaných produktů nebo konkrétních kampaní
  - definovat pravidla:
    - P1 / P2 = odchozí směry
    - P3 = retenční / upsell
    - P4 = rescue / returns / risk
  - vytvořit data model, který čeká na zdroj, ale nevyžaduje ho okamžitě
- Ověřitelné výstupy:
  - systém umí přiřadit lead do fronty podle pravidel, nikoli podle konkrétního zdroje
  - v UI je možné zobrazit P1–P4 jednotně bez skutečných dat
  - schéma umožňuje pozdější napojení na API/webhook bez přepisování logiky
- Důvod:
  - to je správná vize pro business operaci a ne „vizualizace pro prezentaci“

6. Fáze 5 — Data model a migrace: bezpečné tvrdé základy
- Cíl:
  - odstranit největší technické riziko, které je skryté za “všechno funguje”
- Bezpečné dílčí kroky:
  - ověřit migrace na čisté databázi
  - zkontrolovat duplicitní verze
  - zklidnit migrační historie
  - zajistit, že každá změna datového modelu má přezkoumaný dopad na fronty, statusy a role
  - přidat kontrolu “migration parity” před dalším větším rozvojem
- Ověřitelné výstupy:
  - žádné duplicitní verze
  - migrace lze spustit z čistého stavu
  - změny v modelu jsou mapované na role a workflow
- Důvod:
  - bezpečnost systému je dnes důležitější než další zvedání nových obrazovek

7. Fáze 6 — Team Leader dashboard a reporty
- Cíl:
  - dát vedoucímu přehled o provozu, bez přidávání zbytečných reportů
- Bezpečné dílčí kroky:
  - vytvořit základní dashboard:
    - kolik případů v kterém oddělení
    - kolik je v riziku
    - kolik je čekající / v prodlevě / v chybovém stavu
    - co je v P4 a proč
  - přidat jednoduché metriky pro Team Leadera
  - neřešit “nice to have analytics” dřív než základní provozní přehled
- Ověřitelné výstupy:
  - vedoucí dokáže rozhodnout, kam přesunout pracovní zatížení
  - pracovní fronty a rizika jsou vidět na první pohled
- Důvod:
  - to je užitečné a přiměřené k aktuálnímu stavu projektu

8. Fáze 7 — QA, regression a pevný release gate
- Cíl:
  - zabránit tomu, aby se “malé úpravy” rozpadly do chaosu
- Bezpečné dílčí kroky:
  - po každé fázi:
    - testy
    - smoke check
    - role check
    - status flow check
    - migration check
  - každý release musí mít:
    - ověřený základní workflow
    - ověřený admin scope
    - ověřená role-based access
- Ověřitelné výstupy:
  - žádné “funkční” změny bez validačního úkolu
  - každá změna má definovaný důkaz o správnosti
- Důvod:
  - to odpovídá práci, kterou už jsi začal s pročišťováním systému

Pokud to shrnu do jednoho logického pořadí, tak roadmap je:

1. dokončit a zafixovat cleanup
2. sjednotit navigaci a admin hub
3. zjednodušit role-based UX
4. stabilizovat objednávky
5. připravit obecný P1–P4 model
6. vyřešit migrace a data model
7. doplnit Team Leader dashboard
8. zavést QA gate pro každou další změnu

To je bezpečný a ověřitelný postup, který:
- respektuje tvůj přístup “nehnat projekt do MVP”
- používá výsledek minimálního pročištění jako základ
- neřeší telefonii ani lead source bez potřeby
- postupuje po malých krocích, které lze ověřit a přehledně schválit

Pokud chceš, můžu teď z toho udělat ještě konkrétnější verzi v podobě:
- roadmapy po měsících / sprintách
- checklistu pro každou fázi
- technického backlogu „co dělat jako první, co druhé, co až potom“
- a zároveň to upravím podle toho, jak budeš pracovat v Antigravity a v repozitáři.

User: Zkopíruješ mi náš chat do .md souboru? Potřebuji to exportovat a přetat dalšímu agentovi.

Copilot: Připravím export v češtině jako předávací soubor; starší část konverzace je v tomto chatu dostupná jen ve shrnuté podobě, takže to v souboru jasně označím.

Edit []()

Hotovo: [CHAT_EXPORT_2026-10-11.md]()

Soubor obsahuje předávací kontext, směr projektu a navrženou roadmapu. Starší část konverzace byla v tomto chatu dostupná jen jako shrnutí, takže je označena jako taková; roadmapa a aktuální požadavek jsou zachyceny.

User: C:\Users\mikes\.projects\countdown-crm\CHAT_EXPORT_2026-10-11.md

Copilot: 