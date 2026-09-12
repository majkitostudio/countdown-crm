import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProductScriptPanel } from "@/components/workspace/ProductScriptPanel";
import { LeadNotesSection } from "@/components/workspace/LeadNotesSection";

vi.mock("@/app/actions/productScripts", () => ({
  getProductScriptAction: vi.fn(),
}));

vi.mock("@/app/actions/leadNotes", () => ({
  createLeadNoteAction: vi.fn(),
}));

const projectRoot = path.resolve(__dirname, "..");

const product = {
  id: "product-1",
  title: "Kloubní výživa",
  category: "supplements" as const,
  price: 499,
  currency: "CZK",
  description: "Podpora pohodlí kloubů.",
  image_url: "",
  in_stock: true,
  created_at: "2026-09-04T00:00:00.000Z",
};

describe("operator client-profile and script focus layout", () => {
  it("renders safe read-only profile navigation from the assigned-customer header", () => {
    const header = readFileSync(
      path.join(projectRoot, "src", "components", "workspace", "OperatorLeadHeader.tsx"),
      "utf8",
    );

    expect(header).toContain('target="_blank"');
    expect(header).toContain('rel="noopener noreferrer"');
    expect(header).toContain("/leads/${encodeURIComponent(activeLead.id)}");
    expect(header).toContain('aria-label="Open read-only profile"');
    expect(header).not.toContain(">Open read-only profile<");
    expect(header).not.toContain("Source: not recorded");
  });

  it("keeps the client profile read-only while exposing shared note append", () => {
    const profile = readFileSync(path.join(projectRoot, "src", "app", "leads", "[leadId]", "page.tsx"), "utf8");

    expect(profile).toContain("listLeadNotesForWorkspace");
    expect(profile).toContain("LeadNotesSection");
    expect(profile).toContain("Read-only contact view");
    expect(profile).not.toContain("CreateLeadModal");

    const notesSection = readFileSync(
      path.join(projectRoot, "src", "components", "workspace", "LeadNotesSection.tsx"),
      "utf8",
    );
    expect(notesSection).toContain("LeadNotesCard");
    expect(notesSection).toContain("onNotesChange={setNotes}");
  });

  it("keeps the normal workspace layout and moves the same context below the script in focus mode", () => {
    const workspace = readFileSync(path.join(projectRoot, "src", "app", "workspace", "page.tsx"), "utf8");

    expect(workspace).toContain("isScriptExpanded");
    expect(workspace).toContain('data-testid="operator-focus-workspace"');
    expect(workspace).toContain('data-testid="focus-client-details"');
    expect(workspace).toContain('data-testid="supporting-context-rail"');
    expect(workspace).not.toContain("ClientProfileCard");
    expect(workspace).toContain("CustomerTimelineCard");
    expect(workspace).toContain("LeadNotesCard");
    expect(workspace).not.toContain("AdditionalQuestionsCard");
    const rail = workspace.slice(workspace.indexOf("const supportingContextRail"), workspace.indexOf("const pageHeader ="));
    expect(rail.indexOf("LeadNotesCard")).toBeLessThan(rail.indexOf("CustomerTimelineCard"));
    expect(workspace).toContain("conversationBriefCard");
    expect(workspace.match(/\n\s+\{operatorNextActionPanel\}/g) || []).toHaveLength(0);
  });

  it("exposes expand control but never offers script download", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProductScriptPanel, {
        product,
        isCallActive: false,
        onToggleExpand: vi.fn(),
      }),
    );

    expect(markup).toContain('aria-label="Expand script"');
    expect(markup).not.toContain("Download script");
    expect(markup).toContain("Product Script");
    expect(readFileSync(path.join(projectRoot, "src", "components", "workspace", "ProductScriptPanel.tsx"), "utf8")).not.toContain("buildScriptDownloadHtml");
    expect(readFileSync(path.join(projectRoot, "src", "components", "workspace", "ProductScriptPanel.tsx"), "utf8")).toContain("Discovery questions");
  });

  it("renders the shared note history section used by the read-only profile", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LeadNotesSection, { leadId: "lead-1", initialNotes: [] }),
    );

    expect(markup).toContain("Notes for this customer");
    expect(markup).toContain("Save Note");
    expect(markup).toContain("No notes for this lead yet.");
  });
});
