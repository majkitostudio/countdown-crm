# Countdown CRM — Next-Gen AI-Native Tele-Sales & CRM Platform

> **Vision**: Vytvořit novou generaci **AI-native CRM platformy** konkurující světovým nástrojům jako **Attio**, s přímým zaměřením na automatizaci tele-sales, reálnou hlasovou asistenci a špičkové operátorské zkušenosti.

**Countdown CRM** je moderní, vysoce výkonná webová platforma navržená pro operátory, obchodní týmy a manažery. Systém v reálném čase analyzuje živé hovory pomocí **Google Gemini 2.5 Flash API**, vyhodnocuje náladu zákazníka, detekuje prodejní námitky, doporučuje protiargumenty a automatizuje výstupy z hovorů.

![Next.js 16](https://img.shields.io/badge/Next.js-16.2.12-black?style=flat-square&logo=next.js)
![React 19](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?style=flat-square&logo=google)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Database_%26_Auth-3ECF8E?style=flat-square&logo=supabase)

---

## 🚀 Klíčové Pilíře Platformy

### 1. ⚡ Lineární Operator Console Workflow (`/workspace`)
- Načtení zákazníka s přímou akcí **`Call Client` (Vytočit)**.
- **Rychlé výstupy hovoru na jedno kliknutí**:
  - 📞 **`Call Later`** (Zavolat později / Nezvedá)
  - 📅 **`Schedule Call`** (Naplánovat callback)
  - ❌ **`Fail`** (Odmítnuto)
  - 🛍️ **`Success / Order`** (Vytvořit objednávku)
- **Automatický posun ve frontě**: Systém po dokončení výstupu automaticky načte dalšího zákazníka bez manuálního hledání.

### 2. 🧠 Google Gemini 2.5 Flash AI Copilot
- **Live Sentiment & Objection Handling**: Reálná detekce námitek na cenu, konkurenty či kvalitu.
- **Objection Matcher Engine**: Automatické vyhledání nejlepších prodejních protiargumenty.
- **AI Cross-Sell & Up-Sell**: Automatické generování doplňkových balíčků se slevou 15 %.

### 3. 🎓 AI Call Roleplay Simulator & Gamifikace (`/training`)
- Simulované tréninkové hovory s AI boty různých zákaznických typů.
- Automatické hodnocení námitkového rozhovoru, XP body a zvyšování úrovně operátora (Level / XP).

### 4. 🎨 Minimalistický Skleněný Design System (Attio-Grade Aesthetics)
- Monochromatická neutrální paleta zinku (`zinc-950`, `zinc-900`, `zinc-800`).
- Skleněné karty se subgardientními odlesky (`border-t border-white/5`), `backdrop-blur-xl` a velkorysou vzdušností (Whitespace Airiness).

### 5. 📡 Manažerský Live Monitor (`/monitor`) & BI Analytics (`/analytics`)
- Živý dohled nad operátory v týmu v reálném čase.
- Prediktivní 30-denní revenue forecast a exporty v CSV.

---

## 🛠️ Technologický Stos

- **Framework**: Next.js 16.2.12 (Turbopack) & React 19
- **AI Integrace**: `@google/genai` (Google Gemini 2.5 Flash API)
- **Styling**: Tailwind CSS v4 & Lucide React ikony
- **Databáze & Auth**: Supabase PostgreSQL & `@supabase/ssr`
- **Hlasové API**: Native Browser WebSpeech API & Syntetizátor Web Audio API

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

## 📜 Architektura & Dokumentace

- [Prezentovaný Walkthrough](walkthrough.md)
- [Implementační Plán](implementation_plan.md)
