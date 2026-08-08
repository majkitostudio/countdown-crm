# Countdown CRM — Plán commitů a Vývoje

Tento dokument slouží jako živý průvodce vývojem. Každý commit reprezentuje ucelenou, otestovatelnou část funkcionalit.
Před každou implementací se shodujeme na plánu. Po dokončení je commit označen jako hotový.

---

## Pravidla pro commity

- **Konvence**: `<typ>: <popis v angličtině>` (např. `feat: add operator workspace layout`)
- **Typy**: `feat` (nová funkce), `chore` (konfigurace), `fix` (oprava), `style` (UI), `docs` (dokumentace), `refactor`
- **Velikost**: Každý commit = jedna logická, funkční, otestovatelná část
- **Schválení**: Před každou implementací odsouhlasíme plán (co, proč, jak, výsledek)
- **Push**: Po každém commitu → okamžitý push na GitHub → automatický deploy na Vercel

---

## FÁZE 1 — Základ & Design System

> **Priorita: KRITICKÁ** — Vše ostatní staví na tomto základu. Bez solidního UI skeletu a navigace nelze stavět nic dalšího.

### ✅ HOTOVO: COMMIT-00 — Projekt inicializace
```
chore: add core dependencies (@google/genai, lucide-react, tailwind-merge) and update gitignore
```
- Přidány závislosti: `@google/genai`, `lucide-react`, `tailwind-merge`, `clsx`
- Nastavena větev `main` a remote origin na GitHub

---

### ✅ HOTOVO: COMMIT-01 — Design System & globální layout
```
style: implement design system, global layout and navigation shell
```
**Co**: Základní vizuální identita celé aplikace — paleta barev (Sync UI minimalist neutral dark), typografie (Poppins), anglické rozhraní, sidebar navigace, hlavní layout.

**Proč**: Veškeré další komponenty musí mít jednotný designový základ. Bez tohoto kroku by každá feature vypadala jinak a refaktoring by byl drahý.

**Jak**:
- `globals.css` → CSS proměnné, Google Fonts (Poppins), neutral dark palette (`zinc`), custom scrollbar
- `layout.tsx` → shell s postranní navigací (Sidebar), záhlavím (Header) a hlavním content area
- Sidebar komponenta s navigačními položkami v angličtině (Dashboard, Operator Console, Leads & Contacts, Product Catalog, Call Logs, Settings)
- Responzivní layout (Desktop first s collapsible sidebarem a přepínačem statusu operátora)

**Výsledek**: Aplikace má konzistentní, profesionální tmavý design v angličtině inspirovaný Sync UI.

---

### ✅ HOTOVO: COMMIT-02 — Dashboard (přehledová stránka)
```
feat: add main dashboard with KPI cards and activity feed
```
**Co**: Úvodní stránka po přihlášení s KPI kartičkami, hodinovým grafem aktivit, živým feedem hovorů a žebříčkem operátorů.

**Proč**: Dashboard dává rychlý přehled o stavu call centra v ultra-čistém monochromatickém designu a anglickém rozhraní.

**Jak**:
- `KpiCards.tsx` → 4 KPI karty (Hovory, Konverze %, Tržby, Aktivní operátoři)
- `CallActivityChart.tsx` → Hodinový graf hovorů a konverzí s přepínačem období (*Today / Week / Month*)
- `TopPerformers.tsx` → Žebříček nejlepších operátorů podle tržeb
- `RecentActivityFeed.tsx` → Živý stream hovorů s AI indikací sentimentu a kritickým zvýrazněním
- Střídmé použití barev (barva vyhrazena pouze pro vysoce kritické statusy jako *Order Placed* nebo *Price Objection Alert*)

**Výsledek**: Živý, vizuálně působivý dashboard s realistickými daty v ultra-čistém provedení.

---

## FÁZE 2 — Správa Dat (Leady & Produkty)

> **Priorita: VYSOKÁ** — Data jsou srdcem CRM. Bez leadů a produktů nemá AI copilot s čím pracovat.

### ✅ HOTOVO: COMMIT-03 — Integrace Supabase (databáze & auth)
```
chore: integrate supabase client, auth and database schema
```
**Co**: Databázové schéma Supabase (`schema.sql`), TypeScript klienty, přihlašovací rozhraní a RLS politiky.

**Proč**: Databázová infrastruktura a přihlašovací vrstva pro uchovávání leadů, produktů, hovorů a objednávek.

**Jak**:
- Instalace `@supabase/supabase-js` a `@supabase/ssr`
- `supabase/schema.sql` → Kompletní DDL SQL skript (6 tabulek `profiles`, `leads`, `products`, `calls`, `orders`, `objections` s RLS politikami)
- `src/lib/supabase/` → Browser client, Server client a TypeScript typové definice databáze
- `src/app/login/page.tsx` → Přihlašovací formulář v Sync UI dark stylu
- `src/proxy.ts` → Auth proxy a obnova relací podle Next.js 16 konvencí

**Výsledek**: Kompletní databázová architektura a autentizační rozhraní připravené pro správy dat.

---

### ✅ HOTOVO: COMMIT-04 — Modul Leady (správa kontaktů)
```
feat: add leads management module with list, detail and import
```
**Co**: Správa databáze zákazníků/leadů — seznam, detail zákazníka, import z CSV.

**Proč**: Leady jsou primárním datovým vstupem call centra. Operátor musí vidět zákazníka ještě před zahájením hovoru.

**Jak**:
- Tabulka leadů (filtrování, řazení, vyhledávání, paginace)
- Detail leadu: kontaktní údaje, AI skóre, poznámky, historie hovorů
- Import CSV (drag & drop nebo výběr souboru s mapováním sloupců)
- AI skórování leadů při importu (score 0–100 podle dostupných dat)

**Výsledek**: Plně funkční správa kontaktů s importem databáze.

---

### ✅ HOTOVO: COMMIT-05 — Modul Produkty (katalog)
```
feat: add product catalog with multi-category support and objection templates
```
**Co**: Správa produktového katalogu pro 3 kategorie (doplňky stravy, kosmetika, elektro) + databáze námitek a prodejních argumentů.

**Proč**: Produkty jsou tím, co se prodává. AI copilot musí znát jejich vlastnosti, aby mohl doporučovat správné argumenty.

**Jak**:
- CRUD produktů (název, kategorie, cena, popis, obrázek, skladová zásoba)
- Tagging a kategorizace (doplňky / kosmetika / elektro)
- Šablony námitek propojené s produkty (Battle-cards: Cena příliš vysoká → 3 argumenty)
- Cross-sell matice (doporučené související produkty)

**Výsledek**: Katalog produktů s prodejními materiály a námitkovými kartami dostupný AI copilotovi.

---

## FÁZE 3 — Operátorský Pult (Srdce systému)

> **Priorita: VYSOKÁ** — Toto je hlavní "obrazovka práce" operátora. Musí být co nejrychlejší a nejintuitivnější.

### ✅ HOTOVO: COMMIT-06 — Agent Workspace layout
```
feat: add agent workspace base layout with customer info panel
```
**Co**: Layout hlavní pracovní plochy operátora při hovoru — panel zákazníka, panel produktů, panel AI.

**Proč**: Workspace musí být navržen tak, aby operátor nemusel hledat žádnou informaci déle než 1 sekundu.

**Jak**:
- 3-panelový layout (Zákazník | AI Copilot | Produkty & Objednávka)
- Panel zákazníka: Jméno, telefon, AI skóre, nákupní historie, poznámky (`CustomerPanel.tsx`)
- AI Copilot panel: Živý přepis hovoru, detekce sentimentu a prodejní námitky (`AiCopilotPanel.tsx`)
- Produkty & Objednávka: Rychlé vytvoření objednávky a zapsání poznámky po hovoru (`ProductOrderPanel.tsx`)
- Stavový bar operátora s časovačem hovoru (`CallStatusBar.tsx`)

**Výsledek**: Operátor má profesionální přehlednou plochu připravenou pro reálnou práci.

---

### ✅ HOTOVO: COMMIT-07 — Telefonní simulátor (Virtual Call)
```
feat: add virtual call simulator with call controls and timer
```
**Co**: Simulátor příchozího/odchozího hovoru přímo v prohlížeči bez potřeby reálné ústředny.

**Proč**: Projekt je navržen pro 0 Kč provozní náklady. Simulátor umožní testování AI copilota bez real VoIP.

**Jak**:
- "Zavolat" tlačítko → simulace spojování (vytáčení, časovač hovoru, audio syntetizér `audio.ts`)
- Pop-up modal pro simulaci příchozího hovoru (`IncomingCallModal.tsx`) s tlačítky Přijmout / Odmítnout
- Audio efekty přes Web Audio API (vyzvánění, vytáčecí tón, ukončení hovoru) bez externích závislostí
- Napojení na vybraný lead ze seznamu

**Výsledek**: Operátor může simulovat celý průběh hovoru v reálném čase.

---

### ✅ HOTOVO: COMMIT-08 — Web Speech API (živý přepis řeči)
```
feat: add real-time speech transcription via Web Speech API
```
**Co**: Živý přepis řeči přímo v prohlížeči (bez externího API, zdarma) zobrazovaný v panelu transkriptu.

**Proč**: Přepis řeči je vstupní data pro AI copilota. Bez přepisu nemůže AI detekovat námitky ani nabídnout argumenty.

**Jak**:
- Integrace `window.SpeechRecognition` / `webkitSpeechRecognition` v custom React hooku (`useSpeechRecognition.ts`)
- Kontinuální přepis během hovoru (interim + final results)
- Panel transkriptu s rolujícím textem a časovými razítky v `AiCopilotPanel.tsx`
- Přepínač jazyka (CZ `cs-CZ` / SK `sk-SK` / EN `en-US`)
- Fallback simulátor pro prohlížeče bez Web Speech API

**Výsledek**: Slova operátora i zákazníka se zobrazují živě na obrazovce.

---

## FÁZE 4 — AI Copilot (Mozek systému)

> **Priorita: VYSOKÁ** — Toto je klíčová differenciace od klasických CRM. AI copilot v reálném čase.

### ✅ HOTOVO: COMMIT-09 — Google Gemini API integrace
```
feat: add gemini api integration with streaming server action
```
**Co**: Napojení na Google Gemini Flash API přes Next.js Server Action se streamováním odpovědí.

**Proč**: Gemini Flash je extrémně rychlý a zdarma do limitu. Server Action zajistí bezpečnost API klíče.

**Jak**:
- Server Action `analyzeCallTranscriptAction` (`src/app/actions/copilot.ts`) využívající rozhraní `@google/genai`
- Bezpečné uložení a předání `GEMINI_API_KEY` ze serveru
- Strukturovaný JSON výstup (Sentiment, detekce námitky, confidence score %, 3 prodejní argumenty, Next Best Action)
- Inteligentní fallback engine v `src/lib/gemini.ts` pro prostředí bez vloženého API klíče
- Tlačítko pro spuštění AI analýzy a zobrazení živých doporučení v `AiCopilotPanel.tsx`

**Výsledek**: Operátor dostává živá doporučení od Google Gemini Flash během hovoru.

---

### ✅ HOTOVO: COMMIT-10 — Detekce námitek & Protiargumenty (Objection Handling)
```
feat: add real-time objection detection and rebuttal suggestion engine
```
**Co**: Reálná detekce zákaznických námitek v přepisu hovoru a jejich automatické spárování s námitkovou databází produktů z COMMIT-05.

**Proč**: Klíčová funkce pro operátory. Zrychluje reakční dobu a zvyšuje konverzní poměr hovoru.

**Jak**:
- Engine pro spárování námitek `matchObjectionToProduct()` (`src/lib/objections.ts`)
- Spárování detekované námitky z Gemini AI s produktovou databází námitkových karet
- Vizuální zobrazení **Live Objection Battle-Card** s hodnocením shody (Match Score %)
- 1-kliknutí pro vložení prodejní věty do poznámek po hovoru a tlačítko **Mark Resolved** pro označení vyřešené námitky

**Výsledek**: AI panel živě radí operátorovi, jak odpovědět na zákazníkovy námitky.

---

### ✅ HOTOVO: COMMIT-11 — Cross-sell & Up-sell doporučení
```
feat: add ai-powered cross-sell and upsell product recommendations
```
**Co**: Inteligentní doporučování doplňkových produktů (cross-sell / up-sell) v reálném čase pro zvýšení průměrné hodnoty objednávky (AOV).

**Proč**: Klíčový nástroj pro zvyšování tržeb call centra během probíhajícího hovoru.

**Jak**:
- Doporučovací engine `getCrossSellRecommendations()` (`src/lib/recommendations.ts`)
- Automatické generování výhodných balíčků (15% Bundle Discount) a prodejního zdůvodnění pro operátory
- Kartička **AI Recommended Cross-Sell Bundle** v `ProductOrderPanel.tsx`
- Tlačítko **+ Add Bundle** pro 1-klikové vložení balíčkového produktu do košíku

**Výsledek**: Operátor může 1 kliknutím nabídnout doplňkový produkt se slevou a zvýšit tržbu z hovoru.

---

## FÁZE 5 — Po-hovorová Automatizace

> **Priorita: STŘEDNÍ** — Výrazně šetří čas operátora po každém hovoru.

### ⏳ COMMIT-12 — AI sumarizace hovoru & sentiment
```
feat: add post-call ai summary, sentiment analysis and call outcome
```
**Co**: Po zavěšení AI automaticky vygeneruje shrnutí hovoru, sentiment zákazníka a navrhne výsledek.

**Jak**:
- Po zavěšení → Gemini zpracuje celý přepis
- Výstup: Klíčové body | Sentiment (Pozitivní/Neutrální/Negativní) | Doporučený výsledek
- Operátor jedním klikem potvrdí nebo upraví
- Uložení do Supabase (`calls` tabulka)

**Výsledek**: Operátor ušetří 2–3 minuty administrativa po každém hovoru.

---

### ⏳ COMMIT-13 — Rychlé vytvoření objednávky
```
feat: add one-click order creation from call context
```
**Co**: Operátor jedním klikem přidá produkt do košíku a vytvoří objednávku.

**Jak**:
- Panel košíku v Agent Workspace (přidat/odebrat produkt, množství)
- Výběr z cross-sell doporučení AI nebo z katalogu
- Potvrzení objednávky → uložení do Supabase
- Generování jednoduchého potvrzení (číslo objednávky, souhrn)

**Výsledek**: Objednávka vytvořena ještě před zavěšením hovoru, žádná duplicitní práce.

---

### ✅ HOTOVO: COMMIT-14 — Nastavení a profil operátora (`/settings`)
```
feat: add operator settings page and preferences management
```
**Co**: Stránka `/settings` pro nastavení profilu operátora, jazykových preferencí pro WebSpeech (CS, SK, EN), automatické Gemini analýzy a zvukových efektů.

**Proč**: Operátor potřebuje přizpůsobit chování AI asistenta a zvukových tónů své práci.

**Jak**:
- Datová služba `src/lib/settings.ts` ukládající preference do `localStorage`
- Stránka `/settings` s kartami Profilu, Hlasové rekognice & Gemini Flash a Zvukových tónů hovorů
- Tlačítko **Test Ringtone Sound** pro otestování vyzváněcího tónu přes Web Audio API

**Výsledek**: Operátor si může plně přizpůsobit profil, jazyk rozhraní a hlasitost vyzvánění.

---

## FÁZE 6 — Manažerský Dashboard & Analytika

> **Priorita: NÍZKÁ pro MVP** — Důležité pro prodej systému managementu, ale operátoři mohou pracovat bez toho.

### ✅ HOTOVO: COMMIT-13 — Call logs & přehled hovorů (`/calls`)
```
feat: add call logs history page with audio playback and full transcript viewer
```
**Co**: Dedikovaná stránka `/calls` pro zobrazení výpisu všech hovorů, filtrů a přehrávání zvukové stopy s přepisovacím protokolem.

**Proč**: Supervizoři a manažeři potřebují auditovat hovory operátorů a vyhodnocovat AHT i prodejní konverze.

**Jak**:
- Datová vrstva `src/lib/calls.ts`
- Stránka `/calls` s KPI kartami (Total Calls, AHT, Revenue Volume, Conversion Rate %)
- Slide-over drawer `CallDetailDrawer.tsx` s časovým přepisovacím protokolem rozhovoru a zvukovou vizualizací

### ✅ HOTOVO: COMMIT-15 — Finální vizuální doladění, UI Glow & Dokončení projektu
```
feat: complete project with UI animations, polish and final release documentation
```
**Co**: Závěrečný commit projektu pro doladění skleněných efektů (Glassmorphism), mikro-animací, svítivých září (Glow Effects) a kompletní dokumentaci v `README.md`.

**Proč**: Zaručuje okamžitý WOW efekt moderního dark-mode rozhraní pro operátory i supervizory.

**Jak**:
- Doplnění CSS utilit `.glow-emerald`, `.glow-cyan`, `.glow-amber`, `.glass-card` v `src/app/globals.css`
- Závěrečný audit všech 10 Next.js 16 aplikativních tras a 100% čisté statické generování
- Vytvoření souhrnného `README.md` s architekturou a příručkou spuštění

**Výsledek**: 100% dokončený, otestovaný a nasazený projekt Countdown CRM pro call centra s AI copilotem!

---

## Přehled stavu projektu

| Commit | Popis | Stav |
|--------|-------|------|
| COMMIT-01 | Design System & globální layout | ✅ Hotovo |
| COMMIT-02 | Dashboard s KPI kartami & grafy | ✅ Hotovo |
| COMMIT-03 | Supabase integrace & proxy auth | ✅ Hotovo |
| COMMIT-04 | Modul Leady & CSV Import | ✅ Hotovo |
| COMMIT-05 | Modul Produkty & Objection Cards | ✅ Hotovo |
| COMMIT-06 | Agent Workspace 3-sloupcový layout | ✅ Hotovo |
| COMMIT-07 | Telefonní simulátor & Web Audio API | ✅ Hotovo |
| COMMIT-08 | Web Speech API přepis v reálném čase | ✅ Hotovo |
| COMMIT-09 | Google Gemini 2.5 Flash API integrace | ✅ Hotovo |
| COMMIT-10 | Objection Handling Engine & Rebuttal Matcher | ✅ Hotovo |
| COMMIT-11 | AI Cross-sell & Up-sell doporučení | ✅ Hotovo |
| COMMIT-12 | Vytvoření a správa objednávek (Sales Checkout) | ✅ Hotovo |
| COMMIT-13 | Call Logs & přehled hovorů (`/calls`) | ✅ Hotovo |
| COMMIT-14 | Nastavení a profil operátora (`/settings`) | ✅ Hotovo |
| COMMIT-15 | Finální UI Glow & Release Dokumentace | ✅ Hotovo |
| COMMIT-16 | Manažerský BI Dashboard & AI Revenue Forecast | ✅ Hotovo |
| COMMIT-17 | Manažerský Real-Time Team Monitor (`/monitor`) | ✅ Hotovo |
| COMMIT-18 | AI Voice Roleplay Simulator (`/training`) | ✅ Hotovo |
| COMMIT-19 | Gamified Leaderboard, Operator XP & Badges System | ✅ Hotovo |
| COMMIT-20 | Predictive Re-Order Engine Widget (Dashboard) | ✅ Hotovo |
| COMMIT-21 | 1-Click Pay-Link & SMS Order Confirmation Dispatcher | ✅ Hotovo |
| COMMIT-22 | Omnichannel Customer Activity Timeline & Messaging Hub | ✅ Hotovo |
| COMMIT-23 | AI Email & WhatsApp Follow-up Generator | ✅ Hotovo |
| COMMIT-24 | Custom Objection Script Builder & Battlecard Editor | ✅ Hotovo |
| COMMIT-25 | AI Training Phase 1: Real-Time Voice Synthesis & Audio Dialogue Engine | ✅ Hotovo |
| COMMIT-26 | AI Training Phase 2: Dynamic Customer Psychology & Mood/Patience Gauge | ✅ Hotovo |
| COMMIT-27 | AI Training Phase 3: Live In-Call Phone Simulator & Speech Rate Coach | ✅ Hotovo |
| COMMIT-28 | Visual UI/UX Refactoring (Attio & Linear Monochrome Design) | ✅ Hotovo |
| COMMIT-29 | Security Audit Log & Operator Activity Tracker (`/audit`) | ✅ Hotovo |
| COMMIT-30 | Multi-Format CSV / Excel / PDF Report Generator | ✅ Hotovo |

---

### ✅ HOTOVO: COMMIT-29 — Security Audit Log & Operator Activity Tracker (`/audit`)
```
feat: add security audit log and operator activity tracker page with csv export
```
**Co**: Bezpečnostní modul `/audit` pro sledování akcí operátorů, úprav dat, příkazů a legislativních varování v Attio monochromatickém rozhraní.

**Proč**: Bezpečnostní pracovníci a management mají kompletní přehled a kontrolu nad auditní stopou systému.

**Jak**:
- Datové úložiště `src/lib/audit.ts` s filtrem podle závažnosti (`low`, `medium`, `high`, `critical`) a typu akce.
- Samostatná stránka `/audit` (`src/app/audit/page.tsx`) s KPI kartami, vyhledáváním a stahováním CSV protokolu.
- Přidán odkaz v navigaci `Sidebar.tsx`.

---

### ✅ HOTOVO: COMMIT-30 — Multi-Format CSV / Excel / PDF Report Generator
```
feat: add multi-format csv, excel and printable pdf report generator with live preview
```
**Co**: Manažerský generátor výkazů v CSV, Excel (.xls) a tiskovém PDF formátu s živým náhledem dat.

**Proč**: Management a supervizoři mohou 1-klikem vygenerovat a stáhnout strukturované výkazy tržeb, výkonnosti operátorů, stavu obchodního trychtýře a auditních záznamů.

**Jak**:
- Datová a exportní vrstva `src/lib/reports.ts` s generátory pro Sales, Operator Performance, Lead Pipeline a Audit Log.
- Attio modal komponenta `ReportGeneratorModal.tsx` v `/analytics` s živým náhledem dat (*Live Preview*) a volbou časového rozsahu.
- Tlačítko `Generovat Report (CSV / Excel / PDF)` v záhlaví analytického panelu.

---

### ✅ HOTOVO: COMMIT-27 — AI Training Phase 3: Live In-Call Phone Simulator & Speech Rate Coach
```
feat: add live in-call phone simulator, speech rate coach and 1-click order creation for ai training
```
**Co**: Rozhraní živé simulace telefonního hovoru s aktivním časovačem, koučem tempa řeči (WPM) a 1-klikovým dokončením objednávky přímo z hovoru.

**Proč**: Operátor trénuje v plně věrném prostředí simulované telefonní linky se sledováním tempa řeči.

**Jak**:
- Živý časovač hovoru (`Call Duration Timer`) a stavový pruh aktivního hovoru (`Linka 01 • Aktivní Hovor`).
- Kouč tempa řeči (`Speech Rate Coach`) měřící slova za minutu (WPM) s vizuálním štítkem (*Optimální 130-160 WPM / Pomalé / Rychlé*).
- Tlačítko `1-Click Objednávka` přímo v nástrojové liště hovoru pro přímé splnění prodejního cíle a přechod do scorecardu.

---

### ✅ HOTOVO: COMMIT-26 — AI Training Phase 2: Dynamic Customer Psychology & Mood/Patience Gauge
```
feat: add dynamic customer psychology, patience gauge and hidden motivations unlock for ai training simulator
```
**Co**: Dynamické vyhodnocování nálady a trpělivosti AI zákazníka s automatickým zavěšením (Hang Up) a odkrýváním skrytých nákupních motivací.

**Proč**: Operátor trénuje empatii a zvládání námitek pod tlakem s reálnou zpětnou vazbou nálady zákazníka.

**Jak**:
- Rozšíření datové vrstvy `src/lib/training.ts` a Server Action `src/app/actions/training.ts` o `customerMood`, `patienceGauge` a `patienceDelta`.
- Ukazatel trpělivosti (`0-100%`) a náladový odznak v hlavičce hovoru v `/training`.
- Animovaný vizualizér zvukové vlny (*Audio Waveform Visualizer*) během mluvení AI zákazníka.
- Panel skrytých nákupních motivací (*Hidden Motivations*), které se odemknou při trpělivosti >= 60 %.
- Událost předčasného zavěšení (*Hang Up*) při poklesu trpělivosti na 0 %.

---

### ✅ HOTOVO: COMMIT-25 — AI Training Phase 1: Real-Time Voice Synthesis & Audio Dialogue Engine
```
feat: add real-time voice synthesis and gemini audio dialogue engine for ai training simulator
```
**Co**: Hlasová syntéza (Text-to-Speech) a propojení s Google Gemini 2.5 Flash API pro AI trenažér (`/training`).

**Proč**: Operátor slyší AI zákazníka mluvit v češtině/slovensky přímo do sluchátek s dynamickým projevováním emoce a osobnosti.

**Jak**:
- Modul syntézy řeči `src/lib/speechSynthesis.ts` (Web Speech API).
- Server Action `generateTrainingResponseAction` v `src/app/actions/training.ts` využívající Google Gemini Flash pro živé neskriptované odpovědi.
- Tlačítko přepínání hlasového výstupu `Hlas Zákazníka (TTS ON / OFF)` a vizuální indikátor *"AI mluví..."* v rozhraní hovoru.

---

### ✅ HOTOVO: COMMIT-24 — Custom Objection Script Builder & Battlecard Editor
```
feat: add custom objection script builder and battlecard editor with live preview
```
**Co**: Manažerský editor námitkových skriptů a prodejních reakcí s živým náhledem (Live Preview) v Attio monochromatickém designu.

**Proč**: Management a supervizoři mohou přímo v CRM spravovat reakce na námitky zákazníků a okamžitě je publikovat operátorům.

**Jak**:
- Datová vrstva `src/lib/objections.ts`.
- Modal komponenta `ObjectionEditorModal.tsx` s dynamickou správou prodejních argumentů a 2-sloupcovým živým náhledem pro Operator Console.
- Integrováno tlačítko `+ New Objection Script` v `/products`.


---

### ✅ HOTOVO: COMMIT-23 — AI Email & WhatsApp Follow-up Generator
```
feat: add ai email and whatsapp follow-up generator with timeline dispatching
```
**Co**: Generátor personalizovaných následných e-mailů a WhatsApp zpráv poháněný Google Gemini Flash API s automatickým zápisem na Omnichannel časovou osu.

**Proč**: Operátor může po zavěšení hovoru 1-klikem odeslat zákazníkovi naformátovaný e-mail nebo WhatsApp zprávu s 1-click Pay-Linkem nebo slevou.

**Jak**:
- Server Action `generateFollowupAction` v `src/app/actions/followup.ts`.
- Attio modal komponenta `AiFollowupModal.tsx` v `AiCopilotPanel.tsx`.
- Integrovaná tlačítka `Copy Content` a `Send / Dispatch` propojené na Omnichannel Timeline.


---

### ✅ HOTOVO: COMMIT-22 — Omnichannel Customer Activity Timeline & Messaging Hub
```
feat: add omnichannel customer activity timeline with filtering and quick note creation
```
**Co**: Interaktivní časová osa aktivit zákazníka v `CustomerPanel` zobrazující hovory, objednávky, SMS Pay-Linky, zapsané poznámky a úpravy stavů.

**Proč**: Operátor vidí 360° historii interakcí na jednom místě bez nutnosti přepínání záložek.

**Jak**:
- Datová architektura v `src/lib/timeline.ts`.
- Komponenta `CustomerTimelineCard.tsx` s filtry aktivit (All, Calls, Orders, SMS, Notes) a Quick Note formulářem.
- Attio monochromatický design (`zinc-950`, `zinc-900`, `font-mono`).


---

### ✅ HOTOVO: COMMIT-28 — Visual UI/UX Refactoring (Attio & Linear Monochrome Design)
```
style: visual ui/ux refactoring (attio & linear monochrome design system)
```
**Co**: Kompletní vizuální refaktoring celého rozhraní Countdown CRM do ultra-čistého, minimalistického monochromatického stylu po vzoru Attio CRM a Linear.app.

**Proč**: Zrušení přehnané barevnosti a duhových gradientů s cílem vytvořit přísně profesionální rozhraní, kde barva slouží výhradně jako signální stavový prvek.

**Jak**:
- Monochromatická paleta (95%+ zinc/slate) napříč všemi 12 stránkami a 25+ komponentami.
- Attio štítky (`bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono`) s jemnými stavovými tečkami.
- Typografická kázeň (`font-mono`) pro všechna čísla, ceny ($), procenta (%), trvání hovorů a AHT metriky.
- Kompaktnější padding pro vyšší datovou hustotu.

---

### ✅ HOTOVO: COMMIT-29 — Call Transcript Storage & JSON/CSV AI Learning Sync
```
feat: add call transcript storage and CSV/JSON sync modal for AI learning
```
**Co**: Úložiště přepisu hovorů v `/calls` s vyhodnocením sentimentu, detekovaných námitek a modalem pro export a synchronizaci JSON/CSV dat pro výuku AI.

**Proč**: Manažeři a vývojáři potřebují přistupovat k historickým přepisům hovorů a exportovat strukturovaná konverzační data pro fine-tuning LLM modelů.

**Jak**:
- Stránka `/calls` s interaktivním prohledáváním přepisů hovorů a kartou detailního dialogu.
- Modal synchronizace dat pro export v JSON/CSV formátu kompatibilním s trénovacími datasety Google Gemini.
- Vyhodnocování rychlosti řeči (WPM), úspěšnosti obcházení námitek a konečného výstupu.

---

### ✅ HOTOVO: COMMIT-30 — Dynamic Customer Psychology & Distrustful Persona Simulator
```
feat: add distrustful customer personality type and mood to ai training simulator
```
**Co**: Rozšíření AI trenažéru o náročný zákaznický typ "Nedůvěřivý / Skeptik" a interaktivní ukazatel nálady a trpělivosti (Patience Gauge).

**Proč**: Operátoři si musí vyzkoušet prodej v nejnáročnějších scénářích, kde zákazník aktivně zpochybňuje kvalitu a vyžaduje silné důkazy.

**Jak**:
- Nový osobnostní profil `distrustful` v `src/lib/training.ts`.
- Dynamický výpočet poklesu/nárůstu trpělivosti podle kvality reakce operátora s rizikem předčasného zavěšení (Hang Up).
- Odkrývání skrytých motivací nákupu při udržení vysoké spokojenosti zákazníka.

---

### ✅ HOTOVO: COMMIT-31 — Multi-Format CSV, Excel & Printable PDF Report Generator
```
feat: add multi-format csv, excel and printable pdf report generator with live preview
```
**Co**: Generátor profesionálních výkazů a reportů podporující okamžitý export do CSV, Excelu a tiskového PDF s živým náhledem (Live Preview).

**Proč**: Umožňuje managementu a supervizorům 1-klikem generovat tištěné nebo tabulkové výkazy tržeb, konverzí a výkonu operátorů.

**Jak**:
- Náhledový modal reportů s přepínáním formátů (PDF Print Preview / Excel XLSX / CSV).
- Generování stylizovaného PDF protokolu připraveného k okamžitému tisku přes systémový tiskový dialog.
- Export tabulkových dat s garancí čisté datové struktury a správného kódování UTF-8.

---

### ✅ HOTOVO: COMMIT-32 — Enterprise Security Audit Log & Operator Activity Tracker
```
feat: add security audit log and operator activity tracker page with csv export
```
**Co**: Bezpečnostní Audit Log a stránka sledování aktivit operátorů (`/audit`) s filtrováním událostí podle závažnosti a CSV exportem.

**Proč**: Zajištění enterprise bezpečnosti, plné auditovatelnosti systému a souladu s interními předpisy pro nakládání s klientskými daty.

**Jak**:
- Nová stránka `/audit` s přehledem bezpečnostních událostí (přihlášení, úpravy leadů, vytvoření objednávek, exporty dat).
- Klasifikace závažnosti událostí (*Low / Medium / High / Critical*) s barevnými stavovými indikátory.
- Datový modul `src/lib/audit.ts` a CSV exportér pro bezpečnostní auditory.

---

### ✅ HOTOVO: COMMIT-33 — Live Call Agent Simulator with Custom Configurator, VAD & Teleprompter
```
feat: add anytime accessible live call agent simulator with custom configurator, VAD hands-free dispatch and live teleprompter script reader
```
**Co**: Pokročilý živý simulátor agenty s vlastní konfigurací (osobnost, nálada, produkt), hlasovou detekcí aktivity (VAD) a živou čtečkou skriptu (Teleprompter Reader).

**Proč**: Operátor si může kdykoliv nastavit libovolný zákaznický scénář a trénovat hovor v režimu hands-free se zobrazovanou nápovědou prodejního skriptu.

**Jak**:
- Konfigurátor simulátoru v `/training` (výběr produktu, nálady, osobnosti a cílů hovoru).
- Integrovaná VAD (Voice Activity Detection) logika pro automatické odoslání repliky po dokončení mluvení bez nutnosti stisknutí tlačítka.
- Živá čtečka skriptu (Teleprompter) zvýrazňující aktuální fázi rozhovoru a doporučené věty.






