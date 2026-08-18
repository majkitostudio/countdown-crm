import type { ObjectSchema } from "./types";

/**
 * Built-in schema metadata. Workspace-specific additions are loaded from the
 * authenticated server DAL; this module contains no browser persistence.
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
      {
        id: "attr-lead-status",
        key: "status",
        name: "Lead Status",
        type: "select",
        options: [
          { label: "New Lead", value: "new", color: "zinc" },
          { label: "Contacted", value: "contacted", color: "cyan" },
          { label: "Qualified", value: "qualified", color: "emerald" },
          { label: "Customer", value: "customer", color: "emerald" },
          { label: "Lost", value: "lost", color: "rose" },
        ],
      },
      { id: "attr-lead-score", key: "ai_score", name: "Lead Propensity Score", type: "number" },
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
      {
        id: "attr-prod-category",
        key: "category",
        name: "Category",
        type: "select",
        options: [
          { label: "Supplements", value: "supplements" },
          { label: "Cosmetics", value: "cosmetics" },
          { label: "Electronics", value: "electronics" },
        ],
      },
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
      {
        id: "attr-deal-stage",
        key: "stage",
        name: "Stage",
        type: "select",
        options: [
          { label: "Discovery", value: "discovery", color: "zinc" },
          { label: "Proposal Sent", value: "proposal", color: "cyan" },
          { label: "Negotiation", value: "negotiation", color: "amber" },
          { label: "Closed Won", value: "closed_won", color: "emerald" },
          { label: "Closed Lost", value: "closed_lost", color: "rose" },
        ],
      },
      { id: "attr-deal-probability", key: "win_probability", name: "Win Probability (%)", type: "number", defaultValue: 50 },
    ],
  },
];
