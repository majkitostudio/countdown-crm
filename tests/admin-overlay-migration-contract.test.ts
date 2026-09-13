import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const DIALOG_OVERLAYS = [
  "src/components/blueprints/BlueprintPickerModal.tsx",
  "src/components/schema/ObjectBuilderModal.tsx",
  "src/components/workflows/RuleBuilderModal.tsx",
  "src/components/leads/CreateLeadModal.tsx",
  "src/components/leads/CsvImportModal.tsx",
  "src/components/leads/LeadDetailDrawer.tsx",
  "src/components/products/ObjectionDrawer.tsx",
  "src/components/products/ObjectionEditorModal.tsx",
  "src/components/products/CallTranscriptUploaderModal.tsx",
  "src/components/workspace/CallbackScheduleModal.tsx",
  "src/components/calls/CallDetailDrawer.tsx",
  "src/components/calendar/OperatorCalendar.tsx",
  "src/components/layout/CommandPalette.tsx",
] as const;

const ADMIN_FORMS = [
  "src/components/exceptions/ExceptionQueue.tsx",
  "src/components/team/TeamMembersPanel.tsx",
  "src/components/team/TeamQueuePanel.tsx",
  "src/components/wallet/WalletManagerPanel.tsx",
] as const;

describe("admin overlay migration contract", () => {
  it("routes every administrative modal and drawer through the shared dialog shell", () => {
    for (const path of DIALOG_OVERLAYS) {
      const content = source(path);
      expect(content, path).toContain('from "@/components/ui/Dialog"');
      expect(content, path).toContain("<Dialog");
      expect(content, path).not.toContain("fixed inset-0");
    }
  });

  it("uses shared field primitives for overlay forms", () => {
    for (const path of DIALOG_OVERLAYS) {
      const content = source(path);
      if (content.includes("<input") || content.includes("<select") || content.includes("<textarea")) {
        expect(content, path).toContain('from "@/components/ui/Field"');
        expect(content, path).toMatch(/<(TextField|SelectField|TextAreaField)/);
      }
    }
  });

  it("uses shared field primitives in administrative panels", () => {
    for (const path of ADMIN_FORMS) {
      const content = source(path);
      expect(content, path).toContain('from "@/components/ui/Field"');
      expect(content, path).toMatch(/<(TextField|SelectField|TextAreaField)/);
    }
  });
});
