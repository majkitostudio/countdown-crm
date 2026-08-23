# Countdown CRM — Next-Gen AI-Native Tele-Sales & CRM Platform

> **Vision**: Vytvořit novou generaci **AI-native CRM platformy** konkurující světovým nástrojům jako **Attio**, s přímým zaměřením na automatizaci tele-sales, reálnou hlasovou asistenci, pokročilý tréninkový simulátor a enterprise bezpečnost.

**Countdown CRM** je pilotní workspace pro operátory, obchodní týmy a manažery. Jádro tvoří workspace-scoped CRM data, serverová autorizace, fronta leadů, objednávkové workflow a explicitně označené pilotní/simulované telephony části.

> **Aktuální stav (23. 8. 2026):** Projekt je ve stabilizaci před interním pilotem, ne v obecné produkční připravenosti. Autoritativní snapshot, otevřená rizika a závazné desatero jsou v [docs/AKTUALNI_STAV_A_DESATERO.md](docs/AKTUALNI_STAV_A_DESATERO.md).

![Next.js 16](https://img.shields.io/badge/Next.js-16.3.2-black?style=flat-square&logo=next.js)
![React 19](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Database_%26_Auth-3ECF8E?style=flat-square&logo=supabase)

---

## 🚀 Klíčové Pilíře Platformy

### 1. ⚡ Lineární Operator Console Workflow (`/workspace`)
- **Přímočará práce s kontaktem**: Serverem řízené přiřazení leadu, aktuální customer context a akce pro start, cancel, dokončení a callback.
- **Pilotní telephony**: Softphone a příchozí hovor jsou simulace v prohlížeči; živá ústředna ani realtime audio stream nejsou součástí aktuálního pilotu.
- **Rychlé výstupy hovoru na jedno kliknutí**:
  - 📞 **`Call Later`** (Zavolat později / Nezvedá)
  - 📅 **`Schedule Call`** (Naplánovat callback)
  - ❌ **`Fail`** (Odmítnuto)
  - 🛍️ **`Success / Order`** (Vytvořit objednávku)

### 2. 📖 Product Scripts & Battlecards
- **Product Script panel**: Aktuálně statické schválené bloky s guardrails; persistentní draft/publish verze jsou připravené jako samostatný navazující slice.
- **Objection Battlecards**: Workspace-scoped námitkové karty navázané na produktový katalog.
- **Cross-Sell Recommendations**: Deterministické doporučení z katalogu, bez tvrzení o live AI detekci.

### 3. 🌐 Workspace Timeline & Re-Order Estimates
- **Workspace timeline**: Zobrazuje workspace-scoped hovory, objednávky a rychlé poznámky.
- **External dispatch**: E-mail, WhatsApp a SMS pay-link zůstávají viditelně nedostupné bez schválené integrace.
- **Re-Order Estimates**: Odhady doplnění jsou deterministický výpočet z historie objednávek a kategorií produktů.

### 4. 🎓 Live Call Agent Simulator & Gamifikace (`/training`)
- **Konfigurátor živého agenta**: Vlastní nastavení osobnosti, nálady (vč. Nedůvěřivý / Skeptik), typu produktu a cílů hovoru.
- **Ukazatel trpělivosti (Patience Gauge)**: Dynamický výpočet nálady zákazníka s rizikem předčasného zavěšení (Hang Up).
- **Gamifikace**: Odemykání skrytých motivací, XP body, odznaky a žebříček nejlepších operátorů.

### 5. 🛡️ Enterprise Security Audit Log (`/audit`) & Multi-Format Exporter
- **Bezpečnostní auditní log**: Sledování všech akcí operátorů s filtrováním závažnosti (Low / Medium / High / Critical).
- **Multi-Format Report Generator**: Exporty do CSV, XLSX Excelu a tiskového PDF protokolu s živým náhledem.
- **Call Transcripts Hub (`/calls`)**: Ukládání přepisů hovorů a export konverzačních dat pro fine-tuning LLM modelů.

### 6. 🎨 Attio-Grade Design System & Dynamic EAV Architecture
- **Monochromatický styl**: Ultra-čistá paleta zinku (`zinc-950`, `zinc-900`), typografická kázeň (`font-mono`) pro metriky.
- **Dynamic EAV Engine**: Libovolné vlastní objekty a vlastnosti (Custom Objects Builder).
- **Visual Workflow Builder**: Návrhář pravidiel automatizace s HTTP Webhook uzly (Zapier / Make).

---

## 🛠️ Technologický Stos

- **Framework**: Next.js 16.3.2 (Turbopack) & React 19
- **AI LLM Engine**: Google Gemini 2.5 Flash API (`@google/genai`)
- **Optional training AI**: Google Gemini/OpenAI providers pro explicitně pilotní tréninkový simulátor (`@google/genai`, OpenAI SDK)
- **Styling**: Tailwind CSS v4 & Lucide React ikony
- **Databáze & Auth**: Supabase PostgreSQL & `@supabase/ssr`
- **Hlasové API**: Native Browser WebSpeech API, Syntetizátor Web Audio API & VAD Engine

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
GEMINI_API_KEY=your-google-gemini-api-key # volitelné; training provider

# 4. Spuštění vývojového serveru
npm run dev
```

Aplikace bude dostupná na adrese `http://localhost:3000`.

---

## 📜 Architektura & Dokumentace

- **Aktuální stav a nové desatero pro Codex**: [`docs/AKTUALNI_STAV_A_DESATERO.md`](docs/AKTUALNI_STAV_A_DESATERO.md)
- **Podrobný produktový status a auditní historie**: [`docs/PRODUCT_STATUS.md`](docs/PRODUCT_STATUS.md)
- **Roadmapa a historický katalog commitů**: [`docs/roadmap.md`](docs/roadmap.md), [`docs/commits.md`](docs/commits.md)
- [Architektura Systému](docs/architecture.md)
- [Roadmapa Vývoje](docs/roadmap.md)
- [Historie Commitů](docs/commits.md)
- [Plán Fází & Commitů](docs/commits_roadmap.md)
- [Banka Nápadů](docs/ideas.md)
- [Vize Projektu](docs/vision.md)
