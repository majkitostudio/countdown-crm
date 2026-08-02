# Countdown CRM — Roadmap Inkrementálních Commitů (Attio-Grade Platform)

> **Zásada Engineera**: Vývoj probíhá uvážlivě, bez spěchu, s maximální kvalitou kódu, nulovým technologickým dluhem a přísným testováním po každém commitu.

---

## 🎯 FÁZE 2: Vizuální Pohledy (Attio Views - Tabulka vs. Kanban Pipeline)

### 📌 Commit 2.1: `feat(views): implement ViewSwitcher component and pipeline view state`
- **Popis**: Komponenta přepínače pohledů (Table / Kanban) v rozhraní `/leads`.
- **Cíl**: Umožnit operátorům a obchodním manažerům přepínat styl zobrazení obchodu.

### 📌 Commit 2.2: `feat(views): create KanbanBoard and KanbanColumn pipeline components`
- **Popis**: Vytvoření Kanban tabule s fázemi obchodu (`New Lead`, `Contacted`, `Qualified`, `Customer`, `Lost`).
- **Cíl**: Přehledné vizuální karty leadů s okamžitou možností změny fáze.

### 📌 Commit 2.3: `feat(views): add column aggregation metrics & deal sum headers`
- **Popis**: Zobrazení součtů hodnot obchodů ($) a průměrného AI Skóre v hlavičce každého sloupce Kanbanu.

---

## ⚡ FÁZE 3: Klávesové Řízení & Command Palette (`Cmd+K`)

### 📌 Commit 3.1: `feat(cmd-k): implement global Command K search palette`
- **Popis**: Globální modal po stisknutí `Ctrl+K` / `Cmd+K` pro okamžité prohledávání leadů, produktů a hovorů.

### 📌 Commit 3.2: `feat(cmd-k): add quick action shortcuts (Call, Add Lead, Export)`
- **Popis**: Rychlé spouštění akcí z klávesnice bez nutnosti klikat myší po rozhraní (přesně jako v Attio).

---

## 🧠 FÁZE 4: Agentic Workflow Engine (Vizuální Automatizace)

### 📌 Commit 4.1: `feat(workflows): define WorkflowTrigger & WorkflowAction schema types`
- **Popis**: Datový model pro automatizační pravidla (`on_call_ended`, `on_status_changed`).

### 📌 Commit 4.2: `feat(workflows): create visual Rule Builder modal`
- **Popis**: Rozhraní pro nastavování pravidel typu: *"Když hovor skončí stavem Success ➔ Vypočítej AI Summary ➔ Změň status na Customer"*.

### 📌 Commit 4.3: `feat(workflows): implement event execution logger`
- **Popis**: Auditní log spuštěných automatizací a výsledků v reálném čase.

---

## 📞 FÁZE 5: Tele-Sales Operator Console Supercharging

### 📌 Commit 5.1: `feat(workspace): integrate dynamic EAV attributes into Operator Console`
- **Popis**: Zobrazení custom políček a AI Attributes přímo v rozhraní `/workspace`.

### 📌 Commit 5.2: `feat(workspace): add Gemini live rebuttal card generator`
- **Popis**: Živé generování protiargumentů v reálném čase během vytočeného hovoru.

---

## 📦 FÁZE 6: Industry Blueprints & Oborové Balíčky (Šablony Použití)

### 📌 Commit 6.1: `feat(blueprints): define IndustryBlueprint schema & preset registry`
- **Popis**: Architektura balíčků pro odvětví (např. *Call Center & Tele-Sales*, *B2B SaaS Sales*, *E-commerce Support*).
- **Cíl**: Automatické načtení předkonfigurovaných vlastních polí, AI promptů, KPI metrik a automatizací po výběru šablony.

### 📌 Commit 6.2: `feat(blueprints): create Workspace Blueprint Picker onboarding modal`
- **Popis**: Vizuální průvodce výběrem šablony při zakládání nového účtu nebo přepínání režimu CRM.
