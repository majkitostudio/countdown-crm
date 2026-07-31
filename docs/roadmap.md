# AI-Native Call Center CRM — Roadmapa Vývoje

Roadmapa rozděluje vývoj prototypu do 5 logických fází. Každá fáze staví na předchozí a přináší plně funkční a otestovatelný modul.

---

## 🚀 Fáze 1: Základní Infrastruktura & Katalog Produktů (Sprint 1)
* **Cíl**: Zprovoznění vývojového prostředí, databáze Supabase a správy produktů pro 3 různé niku (doplňky stravy, kosmetika, elektro).
* **Klíčové úkoly**:
  - [ ] Inicializace Next.js 14/15 projektu s TypeScriptem, Tailwind CSS a Shadcn UI.
  - [ ] Nastavení Supabase projektu (PostgreSQL databáze, Auth schéma, Row Level Security).
  - [ ] Vytvoření produktového katalogu (CRUD pro doplňky stravy, kosmetiku, elektrospotřebiče).
  - [ ] Databázový import a správa databáze kontaktů/leadů.
* **Výstup**: Plně funkční webová aplikace s přihlašováním a správou produktů a leadů.

---

## 🎙️ Fáze 2: Operátorský Pult & Telefonní Simulátor (Sprint 2)
* **Cíl**: Vytvoření moderního rozhraní operátora (Agent Workspace) se simulátorem volání a živým přepisem řeči.
* **Klíčové úkoly**:
  - [ ] Návrh Agent Workspace (informace o zákazníkovi, produktová karta, ovládací prvky hovoru).
  - [ ] Vývoj **Virtual Call Simulátoru** (simulace odchozího/příchozího hovoru s hlasovým testovacím vstupem).
  - [ ] Integrace **Web Speech API** pro okamžitý přepis řeči operátora i simulovaného zákazníka.
  - [ ] Supabase Realtime propojení pro okamžitou změnu stavu operátora (Volá, Přestávka, Po-hovorová práca).
* **Výstup**: Operátor může zahájit simulovaný hovor a sledovat živý přepis řeči na obrazovce.

---

## 🧠 Fáze 3: AI Copilot & Objection Handling (Sprint 3)
* **Cíl**: Zprovoznění AI mozku (Google Gemini Flash API zdarma), který živě radí operátorovi při prodeji a řešení námitek.
* **Klíčové úkoly**:
  - [ ] Integrace Google Gemini Flash 1.5/2.0 API serverless rozhraní.
  - [ ] Vývoj **Objection Handling Engine**: Detekce zákaznických námitek z přepisu hovoru (např. cena, nedůvěra, zbytečnost).
  - [ ] **Live Pitch Generator**: Generování prodejního skriptu na míru zákazníkovi podle typu produktu.
  - [ ] **Cross-sell / Up-sell Recommender**: AI návrh doporučených produktů z jiných kategorií v reálném čase.
* **Výstup**: AI v reálném čase reaguje na přepis hovoru a nabízí operátorovi konkrétní odpovědi a produktové balíčky.

---

## 📝 Fáze 4: Po-hovorová Automatizace & Objednávky (Sprint 4)
* **Cíl**: Automatické dokončení hovoru bez zbytečného papírování operátora.
* **Klíčové úkoly**:
  - [ ] **AI Auto-Summarization**: Automatický zápis klíčových bodů z hovoru po zavěšení.
  - [ ] **Sentiment Analysis**: Vyhodnocení nálady zákazníka a jeho nákupního záměru.
  - [ ] **Rychlé vytvoření objednávky**: Jednoklikový předvyplněný nákupní košík a generování faktury/potvrzení.
  - [ ] Plánovač opakováných volání (Zavolat později / Připomínky).
* **Výstup**: Operátor po zavěšení zkontroluje AI zápis, jedním klikem potvrdí objednávku a může volat dalšímu zákazníkovi.

---

## 📈 Fáze 5: Analytický Manažerský Dashboard & Školení (Sprint 5)
* **Cíl**: Manažerský přehled o výkonu call centra a nástroje pro trénink nových operátorů.
* **Klíčové úkoly**:
  - [ ] Manažerský dashboard s přehledem konverzí, tržeb podle produktových kategorií a úspěšnosti námitek.
  - [ ] **AI Roleplay Simulator**: Režim simulace hovoru, kde AI hraje náročného zákazníka pro trénink nových operátorů.
  - [ ] Exporty reportů a statistik.
* **Výstup**: Kompletní end-to-end systém CRM připravený k prezentaci nebo nasazení do reálného testování.
