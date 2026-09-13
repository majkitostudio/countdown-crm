import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusAlert } from "@/components/ui/Status";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("entry and workspace state contract", () => {
  it("uses non-interrupting status for neutral state and alert for failure", () => {
    expect(renderToStaticMarkup(<StatusAlert tone="neutral" role="status">Loading</StatusAlert>)).toContain('role="status"');
    expect(renderToStaticMarkup(<StatusAlert tone="danger">Save failed</StatusAlert>)).toContain('role="alert"');
  });

  it("keeps semantic state opacity fixed", () => {
    const warning = renderToStaticMarkup(<StatusAlert tone="warning">Callback is due</StatusAlert>);
    expect(warning).toContain("bg-status-warning");
    expect(warning).not.toContain("bg-status-danger");
  });

  it("requires shared primitives and narrow-layout protection on entry and workspace surfaces", () => {
    for (const path of ["src/app/login/page.tsx", "src/app/dashboard/page.tsx"]) {
      const content = source(path);
      expect(content).toContain("@/components/ui/");
      expect(content).toMatch(/px-4|sm:px-6|min-w-0/);
    }

    for (const path of [
      "src/components/workspace/CallbackScheduleModal.tsx",
      "src/components/workspace/IncomingCallModal.tsx",
      "src/components/workspace/CustomerTimelineCard.tsx",
    ]) {
      const content = source(path);
      if (path.includes("Modal")) {
        expect(content).toMatch(/variant="overlay"|<Dialog/);
        expect(content).toMatch(/overflow-y-auto|max-h-/);
      } else {
        expect(content).toContain('tone="danger"');
      }
    }
  });
});
