# Countdown CRM Architecture: Dynamic Schema, AI Attributes & Agentic Workflows

> **Architectural Vision**: Countdown CRM is an **Attio-grade, AI-native CRM platform** built with Next.js 16 (App Router & Turbopack), Tailwind CSS v4, dynamic Entity-Attribute-Value (EAV) data modeling, autonomous Gemini 2.5 Flash AI attributes, and an event-driven Agentic Workflow Engine.

---

## 🏛️ 1. Dynamic Data Model (EAV / Schema Architecture)

Legacy CRMs (HubSpot, Salesforce, Pipedrive) rely on rigid SQL schemas with fixed tables for Contacts, Companies, and Deals.  
**Countdown CRM** uses an **Entity-Attribute-Value (EAV)** schema engine:

```
+-------------------+       +-----------------------+       +---------------------+
|   ObjectSchema    | 1---* |  AttributeDefinition  | 1---* |     RecordValue     |
| (e.g. Lead, Call) |       | (e.g. status, score)  |       |  (actual data cell) |
+-------------------+       +-----------------------+       +---------------------+
          |                             |
          +--------------*--------------+
                         |
                 +---------------+
                 | RecordEntity  |
                 +---------------+
```

### Supported Data Types:
- **`text`**: Plain text strings.
- **`number`**: Numeric values, currency, rates.
- **`select`**: Single-choice dropdown options with custom colors.
- **`multi_select`**: Tags or badges.
- **`boolean`**: True/False toggle states.
- **`ai_generated`**: Autonomous field computed in real-time by Google Gemini Flash API.
- **`relation`**: Relational link to another object ID.

---

## 🧠 2. AI Attributes Engine (Google Gemini 2.5 Flash)

In Countdown CRM, **AI Attributes** are dynamic fields whose values are calculated or enriched by AI based on real-time context:

1. **`ai_propensity_score`** (Number 0-100): Calculated based on lead interaction history, company domain, and deal budget.
2. **`ai_detected_sentiment`** (Select: Positive, Price Sensitive, Skeptical): Derived from real-time WebSpeech transcripts during calls.
3. **`ai_objection_category`** (Select: Price, Competition, Authority): Extracted automatically from customer utterances and matched to product battle-cards.
4. **`ai_summary`** (Text): Concisely generated meeting summary computed on demand or post-call.

---

## ⚡ 3. Agentic Workflow Engine (Event-Driven Visual Automation)

The **Workflow Engine** enables user-configured event-driven rule chains:

```
[ Event Trigger ] ➔ [ Condition Evaluator ] ➔ [ Action Executor ] ➔ [ Execution Audit Log ]
```

### Supported Triggers:
- **`on_call_ended`**: Fires upon call outcome completion in Operator Console.
- **`on_lead_status_changed`**: Fires when a lead moves to a different pipeline stage.
- **`on_order_placed`**: Fires when a new purchase order is completed.
- **`on_lead_created`**: Fires when a lead is created or imported.

### Supported Actions:
- ✨ **`compute_ai_summary`**: Calls Gemini API to generate transcript summary.
- 📧 **`send_email_followup`**: Sends automated follow-up email.
- 🏷️ **`update_lead_status`**: Automatically advances pipeline stage.
- 🔔 **`notify_manager`**: Sends alerts with template variable interpolation (`{{lead_name}}`).

---

## 📦 4. Industry Blueprints & Oborové Balíčky

Industry Blueprints allow one-click CRM domain adaptation:

1. 📞 **Tele-Sales & Call Center**: High-velocity dialing, objection battle-cards, call outcome scripts.
2. 💼 **B2B SaaS Sales Pipeline**: ARR tracking, Decision Maker roles, Tech Stack analysis, Demo booking workflows.
3. 🛒 **E-Commerce Customer Success**: LTV tracking, Churn Risk alerts, Cross-sell recommendation engine.

Upon selecting a blueprint, `BlueprintEngine` dynamically registers custom EAV attributes into `SchemaEngine` and default workflow rules into `WorkflowEngine`.

---

## 📊 5. Attio-Grade View System (Table vs. Kanban Aggregations)

CRMs require flexible data presentation:
- **ViewSwitcher**: Instant toggling between Attio-style Table and Kanban Pipeline view.
- **Kanban Column Metrics**: Column headers dynamically aggregate total deal value ($) and average AI Propensity Score.
- **EAV Badges**: Lead cards display dynamic EAV custom attributes corresponding to the active Industry Blueprint.

---

## 📁 6. Codebase Architecture & Key File Directory

```
src/
├── app/
│   ├── leads/          # Views (Table & Kanban)
│   ├── workflows/      # Visual Rule Builder & Audit Log
│   ├── workspace/      # Tele-Sales Operator Console (Live AI Copilot)
│   └── actions/        # Server Actions (Gemini API)
├── components/
│   ├── blueprints/     # BlueprintPickerModal
│   ├── layout/         # Header (Cmd+K trigger & Blueprint badge), Sidebar, AppShell
│   ├── views/          # ViewSwitcher, KanbanBoard, LeadsTable
│   ├── workflows/      # RuleBuilderModal
│   └── workspace/      # CustomerPanel (DynamicAttributesCard), AiCopilotPanel, PostCallSummaryCard
└── lib/
    ├── blueprints/     # types.ts, registry.ts, engine.ts (Storage Persistence)
    ├── schema/         # types.ts, engine.ts (EAV Core), aiAttributes.ts (Gemini)
    ├── supabase/       # client.ts, types.ts (PostgreSQL Integration & Fallback)
    └── workflows/      # types.ts, engine.ts (Rule Evaluator & Audit Logger)
```
