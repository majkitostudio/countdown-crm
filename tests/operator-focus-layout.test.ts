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
    expect(header).toContain('aria-label="Otevřít profil zákazníka v nové kartě"');
    expect(header).not.toContain(">Otevřít profil zákazníka v nové kartě<");
    expect(header).not.toContain("Zdroj: nezaznamenán");
  });

  it("keeps the client profile read-only while exposing shared note append", () => {
    const profile = readFileSync(path.join(projectRoot, "src", "app", "leads", "[leadId]", "page.tsx"), "utf8");

    expect(profile).toContain("listLeadNotesForWorkspace");
    expect(profile).toContain("LeadNotesSection");
    expect(profile).toContain("Kontakt pouze pro čtení");
    expect(profile).not.toContain("CreateLeadModal");

    const notesSection = readFileSync(
      path.join(projectRoot, "src", "components", "workspace", "LeadNotesSection.tsx"),
      "utf8",
    );
    expect(notesSection).toContain("LeadNotesCard");
    expect(notesSection).toContain("onNotesChange={setNotes}");
  });

  it("keeps the normal workspace layout and moves the same context below the script in focus mode", () => {
    const workspace = readFileSync(path.join(projectRoot, "src", "app", "console", "page.tsx"), "utf8");

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

    expect(markup).toContain('aria-label="Rozbalit skript"');
    expect(markup).not.toContain("Stáhnout skript");
    expect(markup).toContain("Produktový skript");
    expect(readFileSync(path.join(projectRoot, "src", "components", "workspace", "ProductScriptPanel.tsx"), "utf8")).not.toContain("buildScriptDownloadHtml");
    expect(readFileSync(path.join(projectRoot, "src", "components", "workspace", "ProductScriptPanel.tsx"), "utf8")).toContain("Zjišťovací otázky");
  });

  it("renders the shared note history section used by the read-only profile", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LeadNotesSection, { leadId: "lead-1", initialNotes: [] }),
    );

    expect(markup).toContain("Poznámky k zákazníkovi");
    expect(markup).toContain("Uložit poznámku");
    expect(markup).toContain("K tomuto leadu zatím nejsou žádné poznámky.");
  });

  it("does not present unapproved canned objections and keeps the catalog available in extended view", () => {
    const standardMarkup = renderToStaticMarkup(
      React.createElement(ProductScriptPanel, {
        product,
        isCallActive: false,
        isExpanded: false,
        onToggleExpand: vi.fn(),
        onOpenObjections: vi.fn(),
      }),
    );

    expect(standardMarkup).not.toContain('data-testid="script-quick-objections"');
    expect(standardMarkup).not.toContain("Naprosto vám rozumím");
    expect(standardMarkup).not.toContain('aria-label="Otevřít katalog námitek"');

    const extendedMarkup = renderToStaticMarkup(
      React.createElement(ProductScriptPanel, {
        product,
        isCallActive: false,
        isExpanded: true,
        onToggleExpand: vi.fn(),
        onOpenObjections: vi.fn(),
      }),
    );

    expect(extendedMarkup).not.toContain('data-testid="script-quick-objections"');
    expect(extendedMarkup).toContain('aria-label="Otevřít katalog námitek"');
    expect(extendedMarkup).toContain("Katalog námitek");
  });
});
