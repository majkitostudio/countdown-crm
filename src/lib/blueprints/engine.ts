/**
 * Industry Blueprint Engine — Application Logic & Persistence
 *
 * Handles preset switching, persisting custom EAV attributes through the
 * authenticated workspace action and persisting active choices.
 */

import { IndustryCategory, IndustryBlueprint } from "./types";
import { INDUSTRY_BLUEPRINTS } from "./registry";
import { applyBlueprintAction, getActiveBlueprintAction } from "@/app/actions/blueprints";

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
   * The server owns the transaction. Local state is updated only after it
   * confirms that the workspace metadata and active selection were persisted.
   */
  public async applyBlueprint(blueprintId: IndustryCategory): Promise<{
    success: boolean;
    addedAttributesCount: number;
    addedRulesCount: number;
    blueprint: IndustryBlueprint;
  }> {
    const blueprint = this.getBlueprintById(blueprintId);
    if (!blueprint) {
      throw new Error(`Blueprint with ID '${blueprintId}' not found.`);
    }

    const result = await applyBlueprintAction(blueprintId);
    this.activeBlueprintId = blueprintId;
    this.persistActiveBlueprint(blueprintId);

    console.log(
      `[BlueprintEngine] Applied blueprint '${blueprint.name}': ${result.attributesApplied} attributes, ${result.rulesApplied} workflow rules.`
    );

    return {
      success: true,
      addedAttributesCount: result.attributesApplied,
      addedRulesCount: result.rulesApplied,
      blueprint,
    };
  }

  public async hydrateFromServer(): Promise<IndustryBlueprint | null> {
    const serverBlueprintId = await getActiveBlueprintAction();
    if (!serverBlueprintId) return null;
    this.activeBlueprintId = serverBlueprintId;
    this.persistActiveBlueprint(serverBlueprintId);
    return this.getActiveBlueprint();
  }
}

export const blueprintEngine = new BlueprintEngine();
