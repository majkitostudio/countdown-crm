/**
 * Industry Blueprints System — Type Definitions
 *
 * Defines the schema and structures for ready-to-use industry presets
 * (Tele-Sales, B2B SaaS, E-Commerce Support, etc.)
 */

import { AttributeDefinition } from "../schema/types";
import { WorkflowRule } from "../workflows/types";

export type IndustryCategory = "tele_sales" | "b2b_saas" | "ecommerce_cs";

export interface IndustryBlueprint {
  id: IndustryCategory;
  name: string;
  tagline: string;
  description: string;
  icon: string; // Lucide icon identifier
  color: string; // Badge styling theme
  targetAudience: string;
  customAttributes: AttributeDefinition[];
  defaultWorkflowRules: Omit<WorkflowRule, "id" | "createdAt" | "updatedAt">[];
  keyMetrics: {
    label: string;
    description: string;
  }[];
  aiCapabilities: string[];
}
