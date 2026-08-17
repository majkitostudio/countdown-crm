# AI-Native Call Center CRM — Roadmapa Vývoje

Roadmapa rozděluje vývoj platformy do logických fází. Všechny fáze jsou plně dokončené, otestované a nasazené v produkční kvalitě v monochromatickém Attio designu.

---

## 🚀 Fáze 1: Základní Infrastruktura & Katalog Produktů (Sprint 1)
* **Cíl**: Zprovoznění vývojového prostředí, databáze Supabase a správy produktů pro 3 různé niku (doplňky stravy, kosmetika, elektro).
* **Klíčové úkoly**:
  - [x] Inicializace Next.js 16 projektu s TypeScriptem, Tailwind CSS v4 a Lucide ikonami.
  - [x] Nastavení Supabase projektu (PostgreSQL databáze, Auth schéma, Row Level Security).
  - [x] Vytvoření produktového katalogu (CRUD pro doplňky stravy, kosmetiku, elektrospotřebiče).
  - [x] Databázový import a správa databáze kontaktů/leadů.
* **Výstup**: Plně funkční webová aplikace s přihlašováním a správou produktů a leadů.

---

## 🎙️ Fáze 2: Operátorský Pult & Telefonní Simulátor (Sprint 2)
* **Cíl**: Vytvoření moderního rozhraní operátora (Agent Workspace) se simulátorem volání a živým přepisem řeči.
* **Klíčové úkoly**:
  - [x] Návrh Agent Workspace (informace o zákazníkovi, produktová karta, ovládací prvky hovoru).
  - [x] Vývoj **Virtual Call Simulátoru** (simulace odchozího/příchozího hovoru s hlasovým testovacím vstupem).
  - [x] Integrace **Web Speech API** pro okamžitý přepis řeči operátora i simulovaného zákazníka.
  - [x] Supabase Realtime propojení pro okamžitou změnu stavu operátora (Volá, Přestávka, Po-hovorová práca).
* **Výstup**: Operátor může zahájit simulovaný hovor a sledovat živý přepis řeči na obrazovce.

---

## 🧠 Fáze 3: AI Copilot & Objection Handling (Sprint 3)
* **Cíl**: Zprovoznění AI mozku (Google Gemini 2.5 Flash API), který živě radí operátorovi při prodeji a řešení námitek.
* **Klíčové úkoly**:
  - [x] Integrace Google Gemini 2.5 Flash API serverless rozhraní.
  - [x] Vývoj **Objection Handling Engine**: Detekce zákaznických námitek z přepisu hovoru (cena, nedůvěra, zbytečnost).
  - [x] **Live Pitch Generator**: Generování prodejního skriptu na míru zákazníkovi podle typu produktu.
  - [x] **Cross-sell / Up-sell Recommender**: AI návrh doporučených produktů z jiných kategorií v reálném čase.
* **Výstup**: AI v reálném čase reaguje na přepis hovoru a nabízí operátorovi konkrétní odpovědi a produktové balíčky.

---

## 📝 Fáze 4: Po-hovorová Automatizace & Objednávky (Sprint 4)
* **Cíl**: Automatické dokončení hovoru bez zbytečného papírování operátora.
* **Klíčové úkoly**:
  - [x] **AI Auto-Summarization**: Automatický zápis klíčových bodů z hovoru po zavěšení.
  - [x] **Sentiment Analysis**: Vyhodnocení nálady zákazníka a jeho nákupního záměru.
  - [x] **Rychlé vytvoření objednávky**: Jednoklikový předvyplněný nákupní košík a generování faktury/potvrzení.
  - [x] Plánovač opakováných volání (Zavolat později / Připomínky).
* **Výstup**: Operátor po zavěšení zkontroluje AI zápis, jedním klikem potvrdí objednávku a může volat dalšímu zákazníkovi.

---

## 📈 Fáze 5: Analytický Manažerský Dashboard & Školení (Sprint 5)
* **Cíl**: Manažerský přehled o výkonu call centra a nástroje pro trénink nových operátorů.
* **Klíčové úkoly**:
  - [x] Manažerský dashboard s přehledem konverzí, tržeb podle produktových kategorií a úspěšnosti námitek.
  - [x] **AI Roleplay Simulator**: Režim simulace hovoru s hlasovou syntézou (TTS) a dynamickou psychologií zákazníka.
  - [x] Exporty reportů a statistik.
* **Výstup**: Kompletní end-to-end systém CRM s pokročilou analytikou a AI simulátorem.

---

## 🌐 Fáze 6: Omnichannel Timeline & AI Email/WhatsApp Generator (Sprint 6)
* **Cíl**: Integrovaná 360° časová osa aktivit zákazníka a automatické odesílání follow-up zpráv.
* **Klíčové úkoly**:
  - [x] **Omnichannel Activity Timeline**: Jednotný feed hovorů, objednávek, SMS Pay-Linků a poznámek.
  - [x] **AI Follow-up Dispatcher**: 1-klikové generování e-mailů a WhatsApp zpráv přes Gemini Flash API.
  - [x] **Predictive Re-Order Engine**: Algoritmus plánující opakovací volání spotřebních produktů.
* **Výstup**: Kompletní omnichannel historie zákazníka s okamžitým odesláním follow-upů.

---

## 🛡️ Fáze 7: Security Audit Log & Multi-Format Exporter (Sprint 7)
* **Cíl**: Enterprise bezpečnostní dohled a profesionální tiskové a tabulkové výkazy.
* **Klíčové úkoly**:
  - [x] **Security Audit Log (`/audit`)**: Auditní deník operátorských aktivit s filtrováním závažnosti událostí.
  - [x] **Multi-Format Report Generator**: Export do CSV, XLSX Excelu a stylizovaného PDF pro tisk.
  - [x] **Call Transcripts Hub (`/calls`)**: Úložiště přepisů hovorů a export konverzačních dat pro fine-tuning AI.
* **Výstup**: Bezpečnostně auditovaný systém s kompletními exportními možnostmi.

---

## 🤖 Fáze 8: Live Agent Simulator & VAD Hands-Free Dispatch (Sprint 8)
* **Cíl**: Pokročilý tréninkový simulátor živého agenta s konfigurátorem a hlasovou detekcí aktivity.
* **Klíčové úkoly**:
  - [x] **Agent Simulator Configurator**: Nastavení nálady, osobnosti, typu produktu a cílů hovoru.
  - [x] **Voice Activity Detection (VAD)**: Bezdotykové odesílání hlasu po dokončení mluvení.
  - [x] **Live Teleprompter Reader**: Vizuální nápověda prodejního skriptu se zvýrazňováním fází hovoru.
* **Výstup**: Plně hands-free simulátor se živou čtečkou skriptu pro špičkový trénink operátorů.

---

## ✅ Schválená změna: Samostatné vytvoření objednávky bez nového hovoru

**Status:** implementováno v commitu `4455fec`
**Priorita:** P1 — reálný call-center provoz
**Důvod:** Objednávka může vzniknout z předchozího hovoru, e-mailu, webového
formuláře nebo administrativního zadání. Operátor proto nesmí být nucen znovu
volat leadovi pouze proto, aby mohl objednávku zapsat do CRM.

### Produktový záměr

Zachovat dvě pravdivě oddělené cesty:

1. **Objednávka během hovoru** — stávající workflow:
   `Call Client → Connected → Order → call + order completion`.
2. **Samostatná manuální objednávka** — nová workflow cesta z lead/customer
   kontextu bez vytváření falešného hovoru:
   `Create Order → checkout modal → order-only persistence`.

### Požadovaný návrh

- Přidat akci **Create Order** do lead/customer kontextu.
- Použít stejný checkout modal jako u call-based objednávky.
- Přidat povinný `order_source`, například:
  - `previous_call`,
  - `email`,
  - `web_form`,
  - `manual`,
  - `other`.
- Umožnit krátkou poznámku k důvodu nebo zdroji objednávky.
- Vytvořit pouze order; nevytvářet falešný call a neměnit poslední call na
  `order_placed`.
- Zachovat `workspace_id`, autentizovaného `agent_id`, lead/product validaci,
  auditní událost a zobrazení v timeline/customer history.
- Po reloadu musí být manuální objednávka stále dohledatelná a správně
  přiřazená operátorovi.

### Ne-cíle

- Neodemknout stávající call outcome `Order` mimo aktivní call bez rozlišení
  typu objednávky.
- Nevytvářet objednávku pouze z lokálního UI stavu.
- Nevytvářet automaticky call jako náhradu chybějícího kontextu.
- Neměnit atomickou call + order completion cestu pro existující tele-sales
  workflow.

### Akceptační kritéria

- Operátor vytvoří objednávku bez vytáčení leadu.
- Objednávka má platný lead, product, workspace a `agent_id`.
- `order_source` je uložený a viditelný v detailu/timeline.
- Nevznikne žádný nový call ani falešný `order_placed` call outcome.
- Chyba při validaci leadu/productu/workspace je viditelná a nevznikne order.
- Objednávka přežije browser reload.
- Přímý SQL read-only check potvrdí vztahy, workspace a atribuci.
- Stávající call-based `Order` flow zůstane funkční a beze změny významu.

### Doporučená implementační hranice

- rozšířit datový kontrakt orderu o `order_source` a případně `source_note`,
- přidat samostatnou serverovou action/DAL cestu pro order-only vytvoření,
- znovu použít `ProductOrderPanel` jako modal bez kopírování checkout logiky,
- přidat audit event typu `ORDER_CREATED_MANUAL`,
- ověřit browser → reload → timeline → přímá databáze,
- implementovat jako samostatný reverzibilní slice bez současného call flow.

---

## 🔒 Stabilizační slice: Lead read/import server boundary

**Status:** implementováno v navazujícím stabilizačním commitu
**Priorita:** P1 — serverová workspace hranice

### Rozsah

- `getLeads()` nyní čte leady přes serverovou DAL a Server Action.
- CSV bulk import používá serverovou DAL s ověřeným workspace membership.
- Každý importovaný řádek prochází serverovou validací jména, telefonu,
  statusu, skóre a limitů polí.
- Přímý browser Supabase insert a klientský workspace resolver byly z této
  kritické cesty odstraněny.
- Starý nepoužívaný `leadsService` byl odstraněn po ověření, že nemá runtime
  použití.

### Ověření

- autentizovaný CSV import dvou řádků,
- reload stránky a dohledání obou leadů,
- přímý SQL check workspace vazby,
- `foreign_workspace_count = 0`,
- testovací řádky po ověření odstraněny,
- bez změny SQL schématu a bez změny lead UI.

---

## 🔒 Stabilizační slice: Product Catalog server boundary

**Status:** implementováno v navazujícím stabilizačním commitu
**Priorita:** P1 — serverová workspace a role hranice

### Rozsah

- Čtení produktů nyní používá serverovou DAL a Server Action s explicitním
  workspace filtrem a výběrem povolených polí.
- Vytvoření a úprava produktu probíhá pouze přes serverovou DAL s rolí
  `manager` nebo `admin`; běžný workspace member smí katalog číst.
- Produktové vstupy se validují na serveru včetně názvu, kategorie, ceny,
  textových limitů a typu dostupnosti.
- Přímý browser Supabase service `ordersService` byl odstraněn po ověření,
  že v runtime zajišťoval pouze produktový katalog.
- Modal nyní zobrazuje chybu zápisu místo tichého selhání nebo zamrznutí stavu.

### Ne-cíle

- Bez změny databázového schématu a bez změny RLS politik, které už odpovídají
  modelu workspace member read / manager-admin write.
- Bez redesignu katalogu, objection cards nebo Operator Console workflow.

### Ověření

- `npm run check` (lint, typecheck, build),
- `git diff --check`,
- autentizované načtení katalogu a create/update/reload smoke test,
- přímý SQL check workspace vazby a kontrola nulového průniku do cizích
  workspace,
- testovací produkt po ověření odstraněn.

---

## 🔒 Stabilizační slice: Audit Log server boundary

**Status:** implementováno v navazujícím stabilizačním commitu
**Priorita:** P1 — auditní workspace a attribution hranice

### Rozsah

- Auditní čtení nyní prochází přes serverovou DAL a Server Action.
- Čtení je serverově omezené na `manager` a `admin`, v souladu s produkční
  RLS politikou.
- Při novém auditním zápisu se `workspace_id`, `actor_id` a `actor_name`
  odvozují ze serverové autentizované session; klient je nemůže podvrhnout.
- Používá se explicitní výběr polí a serverová validace akce, závažnosti a
  detailu.
- Starý browser `auditService` byl odstraněn po ověření, že nemá runtime
  použití.
- Auditní stránka zobrazuje chybu oprávnění nebo načtení místo tichého
  prázdného stavu.

### Ověření

- autentizované načtení `/audit` jako `majkito.studio` / `Admin`,
- zobrazení 9 reálných auditních událostí z produkční databáze,
- browser logy bez chyb,
- přímý SQL check: `foreign_workspace_rows = 0`, `unattributed_rows = 0`,
- bez změny SQL schématu.

---

## 🔒 Stabilizační checkpoint follow-up — 2026-08-17

Tato poznámka mapuje poslední schválené kroky z roadmapy na skutečné změny,
ověření a otevřené rozhodnutí.

### Slice 1 — katalog a demo data

- [x] Do katalogu byly přidány tři čitelné vzorové produkty: FlexiJoint Ultra
  Collagen, Lumière Bio-Retinol Elixir a RoboClean Pro LiDAR V8.
- [x] Šest objednávek původně navázaných na `Playwright Test Product` bylo
  přes autorizovanou manager/admin cestu přesměrováno na `FlexiJoint Ultra
  Collagen`; historické částky zůstaly beze změny.
- [ ] `Playwright Test Product` ještě nebyl odstraněn. Po přesunu objednávek už
  není referencovaný a lze ho bezpečně odstranit; mazání je samostatná
  potvrzovaná akce.

### Slice 2 — workflow server boundary

- [x] Pravidla a execution log jsou za serverovou DAL/Server Action hranicí.
- [x] Workspace a role se ověřují na serveru; klientský `workflowService` byl
  odstraněn.
- [x] Execution log už nepoužívá `localStorage` jako zdroj historie.
- [x] Ověřeno autentizovaným UI: create → reload → delete; SQL potvrdilo, že
  testovací pravidlo po cleanupu nezůstalo.
- [x] Commit: `034b169 fix: move workflows behind server boundary`.

### Slice 3 — schema/custom-object server boundary

- [x] Schémata, atributy a EAV record entities čte a zapisuje serverová DAL
  přes Server Actions s workspace a role kontrolou.
- [x] `/objects/[slug]` už nepoužívá browser Supabase service ani lokální
  fallback jako zdroj záznamů; chyby načtení a zápisu jsou viditelné.
- [x] Nastavení načítá built-in i workspace custom schemas ze serveru.
- [x] Custom object create/reload byl ověřen v autentizovaném UI a přímou SQL
  kontrolou; mazání je omezené na manager/admin a objekty bez záznamů.
- [ ] Cleanup dočasného smoke-test custom objectu čeká na potvrzení nativního
  mazacího dialogu. Nejde o historický produkt ani produkční CRM data.

### Společné kontrolní gates

- [x] `npm run check` — lint, typecheck a production build.
- [x] `git diff --check`.
- [x] Ověření reálné autentizované session na `/objects/deals`, `/settings` a
  `/workflows`.
- [x] Ověření katalogu: šest objednávek přešlo na `FlexiJoint Ultra Collagen`,
  původní produkt má nulový počet objednávek a SQL potvrdilo cílový počet šest.
- [ ] Po uzavření smoke-test cleanupu commitnout schema slice a aktualizovat
  checkpoint na stav bez otevřeného testovacího artefaktu.
