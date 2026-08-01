# Countdown CRM — Next-Gen AI Copilot Call Center Platform

**Countdown CRM** je moderní, vysoce výkonná webová platforma navržená pro telefonní operátory, telemarkety a obchodní týmy. Systém v reálném čase analyzuje živé hovory pomocí **Google Gemini 2.5 Flash API**, vyhodnocuje náladu zákazníka, detekuje prodejní námitky a nabízí operátorovi přesné protiargumenty a inteligentní **Cross-Sell / Up-Sell balíčky**.

![Next.js 16](https://img.shields.io/badge/Next.js-16.2.12-black?style=flat-square&logo=next.js)
![React 19](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?style=flat-square&logo=google)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Database_%26_Auth-3ECF8E?style=flat-square&logo=supabase)

---

## 🚀 Hlavní Funkcionality

### 1. 🎙️ Real-Time Voice Transcription (WebSpeech API)
- Automatický živý přepis hovoru přímo v prohlížeči.
- Podpora pro **Češtinu (`cs-CZ`)**, **Slovenštinu (`sk-SK`)** a **Angličtinu (`en-US`)**.

### 2. 🧠 Google Gemini 2.5 Flash AI Copilot
- **Live Sentiment & Objection Handling**: Detekuje námitky na cenu, kvalitu či konkurenty.
- **Objection Matcher Engine**: Automaticky vyhledá protiargumenty v databázi námitkových karet produktů.
- **Next Best Action**: Poskytuje operátorovi okamžité prodejní doporučení pro uzavření obchodu.

### 3. 🛍️ AI Cross-Sell & Up-Sell Engine
- Automatické generování doplňkových balíčků se slevou **15 % (Bundle Discount)**.
- 1-klikové vložení doplňkového zboží přímo do košíku objednávky.

### 4. 📞 Telefonní Simulátor (Web Audio API)
- Přehrávání věrných vyzváněcích tónů, obsazovacího tónu a ukončení hovoru v čistém prohlížeči (zero-cost).
- Notifikační modál příchozího hovoru s AI vyhodnocením skóre potenciálu zákazníka (Propensity Score).

### 5. 📊 Manažerský Přehled & Call Logs (`/calls`)
- Auditní logy všech uskutečněných hovorů.
- Metriky **Average Handling Time (AHT)**, **Conversion Rate %** a **Celkové Tržby**.
- Přehrávač zvukového záznamu hovoru s kompletním časovaným přepisem rozhovoru.

---

## 🛠️ Technologický Stos

- **Framework**: Next.js 16.2.12 (Turbopack) & React 19
- **AI Integrace**: `@google/genai` (Google Gemini 2.5 Flash model)
- **Styling**: Tailwind CSS v4 & Lucide React ikony
- **Databáze & Auth**: Supabase PostgreSQL & `@supabase/ssr` (Next.js 16 proxy auth handler)
- **Hlasové API**: Native Browser WebSpeech API & Web Audio API synthesizer

---

## 🚦 Rychlé Spuštění Pro Vývojáře

```bash
# 1. Klonování repozitáře
git clone https://github.com/majkitostudio/countdown-crm.git
cd countdown-crm

# 2. Instalace závislostí
npm install

# 3. Nastavení Environment proměnných (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-google-gemini-api-key

# 4. Spuštění vývojového serveru
npm run dev
```

Aplikace bude dostupná na adrese `http://localhost:3000`.

---

## 📜 Architektura Projektu & Commity

Všechny fáze vývoje byly realizovány podle strukturovaného vývojového plánu:
- [Kompletní přehled commitů a architektury](docs/commits.md)
