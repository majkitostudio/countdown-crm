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

### ⏳ COMMIT-06 — Agent Workspace layout
```
feat: add agent workspace base layout with customer info panel
```
**Co**: Layout hlavní pracovní plochy operátora při hovoru — panel zákazníka, panel produktů, panel AI.

**Proč**: Workspace musí být navržen tak, aby operátor nemusel hledat žádnou informaci déle než 1 sekundu.

**Jak**:
- 3-panelový layout (zákazník | AI copilot | produkty + objednávka)
- Panel zákazníka: jméno, telefon, AI skóre, nákupní historie, poznámky
- Rychlé akce: Vytvořit objednávku, Přidat poznámku, Naplánovat opakování
- Stavový bar operátora: Dostupný / Volá / Po-hovorová práce / Pauza

**Výsledek**: Operátor má profesionální přehlednou plochu. Layout hotový, zatím s mock daty.

---

### ⏳ COMMIT-07 — Telefonní simulátor (Virtual Call)
```
feat: add virtual call simulator with call controls and timer
```
**Co**: Simulátor příchozího/odchozího hovoru přímo v prohlížeči bez potřeby reálné ústředny.

**Proč**: Projekt je navržen pro 0 Kč provozní náklady. Simulátor umožní testování AI copilota bez real VoIP.

**Jak**:
- "Zavolat" tlačítko → simulace spojování (zvukový efekt)
- Odpočet doby hovoru (MM:SS timer)
- Tlačítka: Ztlumit, Podržet, Zavěsit
- Simulace příchozího hovoru (pop-up notifikace)
- Napojení na vybraný lead ze seznamu

**Výsledek**: Operátor může simulovat celý průběh hovoru bez VoIP.

---

### ⏳ COMMIT-08 — Web Speech API (živý přepis řeči)
```
feat: add real-time speech transcription via Web Speech API
```
**Co**: Živý přepis řeči přímo v prohlížeči (bez externího API, zdarma) zobrazovaný v panelu transkriptu.

**Proč**: Přepis řeči je vstupní data pro AI copilota. Bez přepisu nemůže AI detekovat námitky ani nabídnout argumenty.

**Jak**:
- Integrace `window.SpeechRecognition` / `webkitSpeechRecognition`
- Kontinuální přepis během hovoru (intermediate + final results)
- Panel transkriptu s rolujícím textem a časovými razítky
- Fallback: manuální textové pole pro testování
- Přepínač jazyka (CZ / SK / EN)

**Výsledek**: Slova operátora i zákazníka se zobrazují živě na obrazovce.

---

## FÁZE 4 — AI Copilot (Mozek systému)

> **Priorita: VYSOKÁ** — Toto je klíčová differenciace od klasických CRM. AI copilot v reálném čase.

### ⏳ COMMIT-09 — Google Gemini API integrace
```
feat: add gemini api integration with streaming server action
```
**Co**: Napojení na Google Gemini Flash API přes Next.js Server Action se streamováním odpovědí.

**Proč**: Gemini Flash je extrémně rychlý a zdarma do limitu. Server Action zajistí bezpečnost API klíče.

**Jak**:
- Server Action `analyzeTranscript()` → volání Gemini API
- Streamování odpovědí (pro pocit okamžitosti)
- System prompt s kontextem: profil zákazníka + produktový katalog + přepis hovoru
- Rate limiting a error handling
- Uložení API klíče do Vercel Environment Variables

**Výsledek**: Backend schopný přijímat přepis a vracet AI doporučení ve streamované podobě.

---

### ⏳ COMMIT-10 — Objection Handling Engine
```
feat: add real-time objection detection and argument suggestion panel
```
**Co**: AI panel, který detekuje námitky zákazníka z přepisu a okamžitě navrhuje 3 protiargumenty.

**Proč**: Toto je "killer feature" — asistent který pomáhá operátorovi překonat nejčastější překážky prodeje v reálném čase.

**Jak**:
- Analýza přepisu každých 5 sekund / při detekci klíčových slov
- Rozpoznání vzorců: cena, nedůvěra, nepotřebnost, "musím se poradit"
- Zobrazení 3 argumentů jako karet (klik = přidání do poznámek)
- Animovaný "AI přemýšlí..." indikátor
- Historie zobrazených doporučení v daném hovoru

**Výsledek**: AI panel živě radí operátorovi, jak odpovědět na zákazníkovy námitky.

---

### ⏳ COMMIT-11 — Cross-sell & Up-sell doporučení
```
feat: add ai-powered cross-sell and upsell product recommendations
```
**Co**: AI doporučuje produkty na základě kontextu hovoru a profilu zákazníka.

**Proč**: Cross-sell a up-sell je klíčový pro zvyšování průměrné hodnoty objednávky (AOV).

**Jak**:
- Analýza zákaznického profilu + aktuálního hovoru → doporučení produktů
- Karty doporučených produktů s CTA "Přidat do košíku"
- Logika cross-category (doplněk stravy + kosmetika + elektro balíček)
- Zobrazení potenciálního bonusu operátora z cross-sellu

**Výsledek**: Operátor dostane konkrétní tipy "co ještě nabídnout" přímo během hovoru.

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

### ⏳ COMMIT-14 — Plánovač opakovaných hovorů
```
feat: add follow-up call scheduler and reminder system
```
**Co**: Operátor naplánuje opakovaný hovor ("zavolat za 3 dny") a systém mu automaticky připomene.

**Jak**:
- Výběr data a důvodu plánování
- Zobrazení v kalendáři / frontě dnešních hovorů
- Notifikace (Supabase Realtime nebo browser notification)

**Výsledek**: Žádný zákazník nezůstane zapomenutý.

---

## FÁZE 6 — Manažerský Dashboard & Analytika

> **Priorita: NÍZKÁ pro MVP** — Důležité pro prodej systému managementu, ale operátoři mohou pracovat bez toho.

### ⏳ COMMIT-15 — Manažerský dashboard
```
feat: add manager dashboard with team performance and conversion analytics
```
**Co**: Přehled výkonu celého call centra pro manažera/supervisora.

**Jak**:
- Grafy: konverze %, tržby podle kategorií, úspěšnost námitek
- Tabulka výkonu operátorů (hovory, konverze, průměrná délka hovoru)
- Živý přehled aktivních hovorů (Supabase Realtime)
- Export dat (CSV)

---

### ⏳ COMMIT-16 — AI Roleplay trenažér
```
feat: add ai roleplay training simulator for new operators
```
**Co**: Tréninkový režim kde AI hraje zákazníka a nováček se učí prodejní techniky.

**Jak**:
- Výběr typu zákazníka (cholerický, cenově citlivý, nerozhodný...)
- Gemini hraje zákazníka v reálném čase textově/hlasově
- Hodnocení výkonu nováčka po skončení simulace

---

## Přehled stavu

| Commit | Popis | Stav |
|--------|-------|------|
| COMMIT-00 | Inicializace projektu a závislosti | ✅ Hotovo |
| COMMIT-01 | Design System & globální layout | ⏳ Příště |
| COMMIT-02 | Dashboard s KPI kartami | ⏳ Čeká |
| COMMIT-03 | Supabase integrace | ⏳ Čeká |
| COMMIT-04 | Modul Leady | ⏳ Čeká |
| COMMIT-05 | Modul Produkty | ⏳ Čeká |
| COMMIT-06 | Agent Workspace layout | ⏳ Čeká |
| COMMIT-07 | Telefonní simulátor | ⏳ Čeká |
| COMMIT-08 | Web Speech API přepis | ⏳ Čeká |
| COMMIT-09 | Gemini API integrace | ⏳ Čeká |
| COMMIT-10 | Objection Handling Engine | ⏳ Čeká |
| COMMIT-11 | Cross-sell doporučení | ⏳ Čeká |
| COMMIT-12 | AI sumarizace & sentiment | ⏳ Čeká |
| COMMIT-13 | Rychlá tvorba objednávky | ⏳ Čeká |
| COMMIT-14 | Plánovač hovorů | ⏳ Čeká |
| COMMIT-15 | Manažerský dashboard | ⏳ Čeká |
| COMMIT-16 | AI Roleplay trenažér | ⏳ Čeká |
