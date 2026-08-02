# Countdown CRM Architecture: Dynamic Schema & AI Attributes Engine

> **Architectural Vision**: Transforming Countdown CRM into an **Attio-grade, AI-native CRM platform** with dynamic objects, extensible user-defined attributes, and autonomous AI-computed fields.

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

### Data Types Supported:
- **`text`**: Plain text strings.
- **`number`**: Numeric values, currency, rates.
- **`select`**: Single-choice dropdown options.
- **`multi_select`**: Tags or badges.
- **`boolean`**: True/False toggle states.
- **`ai_generated`**: Autonomous field computed in real-time by Google Gemini Flash API.
- **`relation`**: Relational link to another object ID (e.g., `lead_id` -> `Lead`).

---

## 🧠 2. AI Attributes Engine (Google Gemini 2.5 Flash)

Attio popularized AI Attributes. In Countdown CRM, **AI Attributes** are dynamic fields whose values are calculated or enriched by AI based on context:

### Built-in AI Attributes:
1. **`ai_propensity_score`** (Number 0-100): Calculated based on lead interaction history, company size, and budget.
2. **`ai_detected_sentiment`** (Select: Positive, Price Sensitive, Skeptical): Derived from real-time WebSpeech transcripts during calls.
3. **`ai_objection_category`** (Select: Price, Competition, Authority): Extracted automatically from customer utterances.
4. **`ai_next_best_pitch`** (Text): Suggested pitch generated on-the-fly during active phone calls.

---

## 📁 3. Directory Structure for Schema System

```
src/lib/schema/
├── types.ts          # TypeScript interfaces for Schema, Attributes, and Entities
├── engine.ts         # Schema Manager, EAV record validator, and CRUD store
└── aiAttributes.ts   # Google Gemini API prompt handlers for autonomous fields
```
