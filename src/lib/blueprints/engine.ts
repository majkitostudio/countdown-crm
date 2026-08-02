/**
 * Industry Blueprint Engine — Application Logic
 *
 * Handles preset switching, registering custom EAV attributes in SchemaEngine,
 * and loading preset workflow rules into WorkflowEngine.
 */

import { IndustryCategory, IndustryBlueprint } from "./types";
import { INDUSTRY_BLUEPRINTS } from "./registry";
import { schemaEngine } from "../schema/engine";
import { workflowEngine } from "../workflows/engine";

class BlueprintEngine {
  private activeBlueprintId: IndustryCategory = "tele_sales";

  constructor() {
    // Default initial blueprint is Tele-Sales
    this.activeBlueprintId = "tele_sales";
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
   * 1. Updates active blueprint state
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
