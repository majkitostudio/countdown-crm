/**
 * Industry Blueprint Engine — Application Logic & Persistence
 *
 * Handles preset switching, registering custom EAV attributes in SchemaEngine,
 * loading preset workflow rules into WorkflowEngine, and persisting active choices.
 */

import { IndustryCategory, IndustryBlueprint } from "./types";
import { INDUSTRY_BLUEPRINTS } from "./registry";
import { schemaEngine } from "../schema/engine";
import { workflowEngine } from "../workflows/engine";

const STORAGE_KEY = "countdown_active_blueprint";

class BlueprintEngine {
  private activeBlueprintId: IndustryCategory = "tele_sales";

  constructor() {
    this.initFromStorage();
  }

  private initFromStorage(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY) as IndustryCategory | null;
        if (saved && INDUSTRY_BLUEPRINTS.some((b) => b.id === saved)) {
          this.activeBlueprintId = saved;
        }
      } catch (err) {
        console.warn("[BlueprintEngine] Failed to read from localStorage:", err);
      }
    }
  }

  private persistActiveBlueprint(id: IndustryCategory): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, id);
      } catch (err) {
        console.warn("[BlueprintEngine] Failed to save to localStorage:", err);
      }
    }
  }

  public getActiveBlueprint(): IndustryBlueprint {
    const found = INDUSTRY_BLUEPRINTS.find((b) => b.id === this.activeBlueprintId);
    return found || INDUSTRY_BLUEPRINTS[0];
  }

  public getAllBlueprints(): IndustryBlueprint[] {
    return INDUSTRY_BLUEPRINTS;
  }

  public getBlueprintById(id: IndustryCategory): IndustryBlueprint | undefined {
    return INDUSTRY_BLUEPRINTS.find((b) => b.id === id);
  }

  /**
   * Applies an industry blueprint to the CRM workspace:
   * 1. Updates active blueprint state & persists
   * 2. Registers custom EAV attributes into SchemaEngine ('leads' schema)
   * 3. Registers preset workflow rules into WorkflowEngine
   */
  public applyBlueprint(blueprintId: IndustryCategory): {
    success: boolean;
    addedAttributesCount: number;
    addedRulesCount: number;
    blueprint: IndustryBlueprint;
  } {
    const blueprint = this.getBlueprintById(blueprintId);
    if (!blueprint) {
      throw new Error(`Blueprint with ID '${blueprintId}' not found.`);
    }

    this.activeBlueprintId = blueprintId;
    this.persistActiveBlueprint(blueprintId);

    // 1. Inject custom attributes into 'leads' schema
    let addedAttributesCount = 0;
    blueprint.customAttributes.forEach((attr) => {
      const added = schemaEngine.addCustomAttribute("leads", attr);
      if (added) addedAttributesCount++;
    });

    // 2. Inject default workflow rules into WorkflowEngine
    let addedRulesCount = 0;
    blueprint.defaultWorkflowRules.forEach((rule) => {
      // Check if a rule with same name exists to avoid duplicate clutter
      const existingRules = workflowEngine.getRules();
      const exists = existingRules.some((r) => r.name === rule.name);
      if (!exists) {
        workflowEngine.addRule(rule);
        addedRulesCount++;
      }
    });

    console.log(
      `[BlueprintEngine] Applied blueprint '${blueprint.name}': +${addedAttributesCount} attributes, +${addedRulesCount} workflow rules.`
    );

    return {
      success: true,
      addedAttributesCount,
      addedRulesCount,
      blueprint,
    };
  }
}

export const blueprintEngine = new BlueprintEngine();
