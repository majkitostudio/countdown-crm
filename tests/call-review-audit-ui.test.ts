import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AuditDetailCell } from "@/app/audit/page";
import {
  auditActionLabel,
  parseCallReviewAuditDetails,
  type AuditLogEntry,
} from "@/lib/audit";

const details = JSON.stringify({
  previous: {
    id: "revision-1",
    revision_number: 1,
    verdict: "Vyžaduje coaching",
    coaching_note: "Původní coaching",
    correction_reason: null,
    reviewer_id: "manager-1",
    created_at: "2026-09-07T11:00:00.000Z",
  },
  new: {
    id: "revision-2",
    revision_number: 2,
    verdict: "Přijatelné",
    coaching_note: "Opravený coaching",
    correction_reason: "Upřesnění po druhé kontrole",
    reviewer_id: "admin-1",
    created_at: "2026-09-07T12:00:00.000Z",
  },
  correction_reason: "Upřesnění po druhé kontrole",
});

const log: AuditLogEntry = {
  id: "audit-1",
  timestamp: "2026-09-07 12:00:00",
  operatorId: "admin-1",
  operatorName: "Adam Admin",
  actionType: "CALL_REVIEW_CORRECTED",
  severity: "medium",
  details,
  ipAddress: "127.0.0.1",
};

describe("call review audit disclosure", () => {
  it("labels both review audit actions", () => {
    expect(auditActionLabel("CALL_REVIEW_COMPLETED")).toBe("Call review completed");
    expect(auditActionLabel("CALL_REVIEW_CORRECTED")).toBe("Call review corrected");
    expect(auditActionLabel("CALL_COMPLETED")).toBe("CALL_COMPLETED");
  });

  it("parses and renders exact previous and new human wording", () => {
    expect(parseCallReviewAuditDetails(details)).toMatchObject({
      previous: { revisionNumber: 1, reviewerId: "manager-1" },
      next: { revisionNumber: 2, reviewerId: "admin-1" },
      correctionReason: "Upřesnění po druhé kontrole",
    });

    const rendered = renderToStaticMarkup(React.createElement(AuditDetailCell, { log }));

    expect(rendered).toContain("Call review corrected");
    expect(rendered).toContain("Původní coaching");
    expect(rendered).toContain("Opravený coaching");
    expect(rendered).toContain("Upřesnění po druhé kontrole");
    expect(rendered).toContain("manager-1");
    expect(rendered).toContain("admin-1");
    expect(rendered).toContain("Revision 1");
    expect(rendered).toContain("Revision 2");
  });

  it("keeps malformed legacy details visible as plain text", () => {
    const malformed = "legacy detail that is not review JSON";
    expect(parseCallReviewAuditDetails(malformed)).toBeNull();

    const rendered = renderToStaticMarkup(React.createElement(AuditDetailCell, {
      log: { ...log, details: malformed },
    }));

    expect(rendered).toContain(malformed);
    expect(rendered).not.toContain("Previous review");
  });
});
