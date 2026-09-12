import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ADMIN_COMPONENTS = [
  "src/components/exceptions/ExceptionQueue.tsx",
  "src/components/schema/AddCustomFieldModal.tsx",
  "src/components/schema/ObjectBuilderModal.tsx",
  "src/components/blueprints/BlueprintPickerModal.tsx",
  "src/components/views/FilterEngineBar.tsx",
  "src/components/views/KanbanBoard.tsx",
  "src/components/views/ViewSwitcher.tsx",
];

describe("admin primitive contract", () => {
  it("uses shared console primitives for the remaining management controls", () => {
    for (const path of ADMIN_COMPONENTS) {
      const source = readFileSync(resolve(process.cwd(), path), "utf8");
      expect(source).toMatch(/@\/components\/ui\/(Surface|Button|Status|MetricCard)/);
    }
  });
});
