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
- 🔔 **`notify_manager`**: Sends alerts to the Team Leader with template variable interpolation (`{{lead_name}}`).

### 3.1 Operational Assignment and Routing Model

The approved call-center workflow separates the CRM lead directory from the
operator work queue:

- **Lead Directory** is the complete CRM directory for Team Leaders and
  Administrators.
- **Available Pool** is an internal routing pool. Operators do not browse it
  or choose a lead from it.
- **My Work** is a server-controlled operator scope. The Operator receives
  exactly one current lead and does not see a list of queued lead identities.
- **Current Lead** is limited to one `in_progress` lead per Operator.
- **Routing Engine** atomically claims the next eligible lead after the
  previous outcome is closed.

The database, rather than the UI, must enforce that one lead has at most one
active assignment and one Operator has at most one current lead. Assignment
history is retained separately from the CRM lead record so reassignment,
release, callback, recovery and supervisor overrides remain auditable.

Outcome routing is explicit: an order closes the prospecting assignment and
routes the next lead; no-answer/call-later releases the lead into a retry
schedule; a scheduled callback prefers the original Operator only when that
Operator is available; and not-interested closes the lead until a Team Leader
or Administrator explicitly reopens it.

The canonical resource URL is `/leads/[leadId]`, while `/leads` remains the
Team Leader/Administrator directory. Opening a URL is read-only and never
starts a call. An Operator may see only a server-authorized current assignment
or callback context. Starting a call is a separate server operation that
requires the current assignment ID, owner, lease, presence and capacity checks.

The planned queue implementation includes transactional claiming, operator
presence/capacity, lease/heartbeat recovery, callback affinity and audited
Team Leader actions `View`, `Reassign`, `Release` and `Reopen`. This is an
approved follow-up scope and is not yet represented as a completed runtime
feature.

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

## 🛡️ 6. Enterprise Security Audit & Omnichannel Messaging Architecture

1. **Security Audit Log Engine (`src/lib/audit.ts`)**: Sleduje a zaznamenává veškeré akce operátorů (přihlášení, úpravy leadů, vytvoření objednávek, exporty). Klasifikuje události podle závažnosti (*Low / Medium / High / Critical*) s možností okamžitého CSV exportu na stránce `/audit`.
2. **Omnichannel Messaging & Timeline (`src/lib/timeline.ts`)**: Propojuje historii hovorů, objednávek, SMS Pay-Linků a poznámek do 360° časové osy. Server Action `generateFollowupAction` v `src/app/actions/followup.ts` generuje personalizované e-maily a WhatsApp zprávy přes Gemini Flash.
3. **AI Call Agent Simulator & Speech Engine (`src/lib/training.ts`)**: Propojuje Web Speech API (STT & TTS), VAD (Voice Activity Detection), živou čtečku skriptu (Teleprompter) a dynamickou psychologii zákazníka (Patience Gauge & Distrustful Persona).

---

## 📁 7. Codebase Architecture & Key File Directory

```
src/
├── app/
│   ├── actions/        # Server Actions (Gemini Copilot, Follow-up, Training)
│   ├── analytics/      # AI Executive Summary & Predictive Revenue Forecasting
│   ├── audit/          # Enterprise Security Audit Log & Activity Tracker
│   ├── calls/          # Call Transcripts Hub & JSON/CSV AI Learning Sync
│   ├── leads/          # Views (Table & Kanban) with Multi-Attribute Filters
│   ├── monitor/        # Live Multi-Operator Presence & Activity Ticker
│   ├── objects/        # Dynamic Custom Object Records & Schema Views
│   ├── products/       # Product Catalog & Custom Objection Script Builder
│   ├── settings/       # Custom Object Builder & Battlecard Manager
│   ├── training/       # AI Voice Roleplay Simulator & Live Call Agent Configurator
│   ├── workflows/      # Visual Rule Builder & Webhook Integrations
│   └── workspace/      # Tele-Sales Operator Console (Live AI Copilot & VAD)
├── components/
│   ├── blueprints/     # BlueprintPickerModal
│   ├── layout/         # Header (Cmd+K & Blueprint badge), Sidebar, AppShell
│   ├── views/          # ViewSwitcher, KanbanBoard, LeadsTable, ReportGeneratorModal
│   ├── workflows/      # RuleBuilderModal, WebhookNodeModal
│   └── workspace/      # CustomerPanel, CustomerTimelineCard, AiCopilotPanel, PostCallSummaryCard
└── lib/
    ├── audit.ts        # Enterprise Audit Log Event Engine
    ├── blueprints/     # Blueprint Schema, Registry & Storage Engine
    ├── objections.ts   # Custom Objection Scripts & Battlecard Registry
    ├── schema/         # EAV Core Engine & Gemini AI Attributes
    ├── speech.ts       # Speech Recognition & Voice Activity Detection (VAD)
    ├── speechSynthesis.ts # Browser Text-to-Speech Engine
    ├── supabase/       # PostgreSQL Client & TypeScript Database Definitions
    ├── timeline.ts     # Omnichannel Activity Timeline Architecture
    ├── training.ts     # AI Training Scenarios & Dynamic Customer Psychology
    └── workflows/      # Rule Evaluator, Execution Engine & Audit Logger
```
