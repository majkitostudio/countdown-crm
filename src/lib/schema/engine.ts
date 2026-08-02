import { ObjectSchema, AttributeDefinition, RecordEntity } from "./types";

const SCHEMA_STORAGE_KEY = "countdown_custom_schemas";

/**
 * Built-in System Schemas for Countdown CRM (Attio-Grade Foundation)
 */
export const DEFAULT_SCHEMAS: ObjectSchema[] = [
  {
    id: "schema-leads",
    slug: "leads",
    name: "Leads & Contacts",
    description: "Prospective customers, AI propensity scores, and sales pipeline records",
    iconName: "Users",
    attributes: [
      { id: "attr-lead-name", key: "full_name", name: "Full Name", type: "text", required: true },
      { id: "attr-lead-phone", key: "phone", name: "Phone Number", type: "text", required: true },
      { id: "attr-lead-email", key: "email", name: "Email Address", type: "text" },
      { id: "attr-lead-company", key: "company", name: "Company", type: "text" },
      { id: "attr-lead-status", key: "status", name: "Lead Status", type: "select", options: [
        { label: "New Lead", value: "new", color: "zinc" },
        { label: "Contacted", value: "contacted", color: "cyan" },
        { label: "Qualified", value: "qualified", color: "emerald" },
        { label: "Customer", value: "customer", color: "emerald" },
        { label: "Lost", value: "lost", color: "rose" },
      ]},
      {
        id: "attr-lead-score",
        key: "ai_score",
        name: "AI Propensity Score",
        type: "ai_generated",
        aiConfig: {
          promptTemplate: "Calculate lead purchase propensity score (0-100) based on company size, engagement, and deal value.",
          contextSources: ["lead_notes", "company_info"],
          refreshTrigger: "on_record_update",
        },
      },
      {
        id: "attr-lead-summary",
        key: "ai_summary",
        name: "AI Lead Summary",
        type: "ai_generated",
        aiConfig: {
          promptTemplate: "Generate a concise 2-sentence summary of the lead's main business pain points and purchase intent.",
          contextSources: ["transcript", "lead_notes"],
          refreshTrigger: "on_call_end",
        },
      },
    ],
  },
  {
    id: "schema-products",
    slug: "products",
    name: "Product Catalog",
    description: "Multi-category products, battle-cards, and cross-sell relationships",
    iconName: "Package",
    attributes: [
      { id: "attr-prod-title", key: "title", name: "Product Title", type: "text", required: true },
      { id: "attr-prod-price", key: "price", name: "Price ($)", type: "number", required: true },
      { id: "attr-prod-category", key: "category", name: "Category", type: "select", options: [
        { label: "Supplements", value: "supplements" },
        { label: "Cosmetics", value: "cosmetics" },
        { label: "Electronics", value: "electronics" },
      ]},
      { id: "attr-prod-stock", key: "in_stock", name: "In Stock", type: "boolean", defaultValue: true },
    ],
  },
  {
    id: "schema-deals",
    slug: "deals",
    name: "Deals & Opportunities",
    description: "B2B Sales pipeline deals, contracts, and revenue stages",
    iconName: "Briefcase",
    attributes: [
      { id: "attr-deal-name", key: "title", name: "Deal Name", type: "text", required: true },
      { id: "attr-deal-amount", key: "amount", name: "Deal Amount ($)", type: "number", required: true },
      { id: "attr-deal-stage", key: "stage", name: "Stage", type: "select", options: [
        { label: "Discovery", value: "discovery", color: "zinc" },
        { label: "Proposal Sent", value: "proposal", color: "cyan" },
        { label: "Negotiation", value: "negotiation", color: "amber" },
        { label: "Closed Won", value: "closed_won", color: "emerald" },
        { label: "Closed Lost", value: "closed_lost", color: "rose" },
      ]},
      { id: "attr-deal-probability", key: "win_probability", name: "Win Probability (%)", type: "number", defaultValue: 50 },
    ],
  },
];

class SchemaEngine {
  private schemas: Map<string, ObjectSchema> = new Map();

  constructor() {
    DEFAULT_SCHEMAS.forEach((schema) => {
      this.schemas.set(schema.slug, schema);
    });
    this.initFromStorage();
  }

  private initFromStorage(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(SCHEMA_STORAGE_KEY);
        if (saved) {
          const parsed: ObjectSchema[] = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            parsed.forEach((schema) => {
              this.schemas.set(schema.slug, schema);
            });
          }
        }
      } catch (err) {
        console.warn("[SchemaEngine] Failed to restore schemas from localStorage:", err);
      }
    }
  }

  private persistSchemas(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const customSchemas = Array.from(this.schemas.values());
        window.localStorage.setItem(SCHEMA_STORAGE_KEY, JSON.stringify(customSchemas));
      } catch (err) {
        console.warn("[SchemaEngine] Failed to save schemas to localStorage:", err);
      }
    }
  }

  public getSchema(slug: string): ObjectSchema | undefined {
    return this.schemas.get(slug);
  }

  public getAllSchemas(): ObjectSchema[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Adds a brand new custom object schema (e.g. "Companies", "Tickets", "Deals")
   */
  public addCustomSchema(schema: Omit<ObjectSchema, "id">): ObjectSchema {
    const slug = schema.slug.toLowerCase().trim().replace(/\s+/g, "_");
    const newSchema: ObjectSchema = {
      ...schema,
      id: `schema-${slug}-${Date.now()}`,
      slug,
    };

    this.schemas.set(slug, newSchema);
    this.persistSchemas();
    return newSchema;
  }

  /**
   * Adds a custom attribute to a specific schema (Attio Custom Fields)
   */
  public addCustomAttribute(schemaSlug: string, attribute: AttributeDefinition): boolean {
    const schema = this.schemas.get(schemaSlug);
    if (!schema) return false;

    // Avoid duplicate keys
    if (schema.attributes.some((a) => a.key === attribute.key)) {
      return false;
    }

    schema.attributes.push(attribute);
    this.persistSchemas();
    return true;
  }

  /**
   * Validates and extracts record entity values against the schema definition
   */
  public formatRecordValues(schemaSlug: string, rawValues: Record<string, unknown>): Record<string, unknown> {
    const schema = this.schemas.get(schemaSlug);
    if (!schema) return rawValues;

    const formattedValues: Record<string, unknown> = {};

    schema.attributes.forEach((attr) => {
      const val = rawValues[attr.key];
      if (val !== undefined) {
        formattedValues[attr.key] = val;
      } else if (attr.defaultValue !== undefined) {
        formattedValues[attr.key] = attr.defaultValue;
      }
    });

    return formattedValues;
  }
}

export const schemaEngine = new SchemaEngine();
