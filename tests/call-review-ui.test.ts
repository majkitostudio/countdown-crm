import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/app/actions/callReviews", () => ({
  recordCallReviewAction: vi.fn(),
}));

import {
  CallReviewForm,
  CallReviewWorkspace,
} from "@/components/calls/CallReviewWorkspace";
import type { CallReviewDTO, CallReviewRevisionDTO } from "@/lib/dal/callReviews";
import type { CallTranscript } from "@/lib/callTranscript";

const revisionOne: CallReviewRevisionDTO = {
  id: "revision-1",
  callId: "call-1",
  revisionNumber: 1,
  verdict: "Needs coaching",
  coachingNote: "Confirm understanding before closing.",
  correctionReason: null,
  reviewer: { id: "manager-1", name: "Tara Team Leader" },
  supersedesRevisionId: null,
  createdAt: "2026-09-07T11:00:00.000Z",
};

const baseReview: CallReviewDTO = {
  call: {
    id: "call-1",
    createdAt: "2026-09-07T10:00:00.000Z",
    durationSeconds: 125,
    outcome: "objection",
    failReason: "price",
    operatorNote: "Customer found the offer expensive.",
    scheduledAt: null,
  },
  customer: { id: "lead-1", name: "Customer One" },
  operator: { id: "operator-1", name: "Olivia Operator" },
  callSource: "not_recorded",
  transcript: { kind: "unavailable" },
  script: { kind: "not_recorded" },
  revisions: [],
};

function render(review: CallReviewDTO) {
  return renderToStaticMarkup(React.createElement(CallReviewWorkspace, { initialReview: review }));
}

describe("real call review evidence", () => {
  it("labels a legacy call without inventing a source, script version, or transcript", () => {
    const html = render(baseReview);

    expect(html).toContain("Zdroj hovoru nebyl zaznamenán");
    expect(html).toContain("Verze skriptu nebyla u tohoto hovoru zaznamenána");
    expect(html).toContain("Nebyl zachycen ověřený přepis");
    expect(html).not.toContain("Verdikt AI");
  });

  it("renders the exact published snapshot instead of a current script", () => {
    const html = render({
      ...baseReview,
      callSource: "telnyx",
      script: {
        kind: "published_version",
        productId: "product-1",
        productTitle: "Joint Support",
        versionId: "version-7",
        versionNumber: 7,
        html: "<p>Approved v7 used for this call</p>",
        capturedAt: "2026-09-07T09:59:00.000Z",
      },
    });

    expect(html).toContain("Telnyx");
    expect(html).toContain("Pro tento hovor byla zachycena publikovaná verze 7");
    expect(html).toContain("Approved v7 used for this call");
  });

  it("distinguishes a captured built-in fallback from an unknown old version", () => {
    const html = render({
      ...baseReview,
      callSource: "simulation",
      script: {
        kind: "built_in_fallback",
        productId: "product-1",
        productTitle: "Joint Support",
        html: "<p>Captured fallback copy</p>",
        capturedAt: "2026-09-07T09:59:00.000Z",
      },
    });

    expect(html).toContain("Pro tento hovor byla zachycena vestavěná náhradní verze");
    expect(html).toContain("Captured fallback copy");
    expect(html).not.toContain("Verze skriptu nebyla u tohoto hovoru zaznamenána");
  });

  it.each([
    [{ kind: "structured", entries: [{ speaker: "operator", text: "Hello", timestamp: "00:01" }] } as CallTranscript, "Hello", "Strukturovaný přepis"],
    [{ kind: "plain_text", text: "Legacy transcript words" } as CallTranscript, "Legacy transcript words", "Starší nestrukturovaný přepis"],
    [{ kind: "unavailable" } as CallTranscript, "Nebyl zachycen ověřený přepis", "Přepis není dostupný"],
  ])("renders transcript state %# truthfully", (transcript, evidence, label) => {
    const html = render({ ...baseReview, transcript });

    expect(html).toContain(evidence);
    expect(html).toContain(label);
  });
});

describe("human review and correction history", () => {
  it("does not claim that a review is missing when a read-only user cannot see it", () => {
    const html = renderToStaticMarkup(React.createElement(CallReviewWorkspace, {
      initialReview: baseReview,
      readOnly: true,
    }));

    expect(html).toContain("Žádné dostupné kontroly");
    expect(html).not.toContain("Zatím neexistuje dokončená kontrola");
  });

  it("shows the initial human review form without a correction reason", () => {
    const html = renderToStaticMarkup(React.createElement(CallReviewForm, {
      callId: "call-1",
      latestRevision: null,
      isCorrectionMode: false,
      onCancel: vi.fn(),
    }));

    expect(html).toContain('name="verdict"');
    expect(html).toContain('name="coachingNote"');
    expect(html).not.toContain('name="correctionReason"');
    expect(html).toContain("Jde výhradně o rozhodnutí člověka");
  });

  it("pre-fills a correction and requires a reason", () => {
    const html = renderToStaticMarkup(React.createElement(CallReviewForm, {
      callId: "call-1",
      latestRevision: revisionOne,
      isCorrectionMode: true,
      onCancel: vi.fn(),
    }));

    expect(html).toContain("Needs coaching");
    expect(html).toContain("Confirm understanding before closing.");
    expect(html).toMatch(/name="correctionReason"[^>]*required/);
    expect(html).toContain("Uložit opravu jako revizi 2");
  });

  it("keeps both the original and corrected wording in the timeline", () => {
    const revisionTwo: CallReviewRevisionDTO = {
      ...revisionOne,
      id: "revision-2",
      revisionNumber: 2,
      verdict: "Acceptable after review",
      coachingNote: "The close was supported by the transcript.",
      correctionReason: "Rechecked the complete transcript.",
      reviewer: { id: "admin-1", name: "Adam Admin" },
      supersedesRevisionId: "revision-1",
      createdAt: "2026-09-07T12:00:00.000Z",
    };
    const html = render({ ...baseReview, revisions: [revisionOne, revisionTwo] });

    expect(html).toContain("Revize 1");
    expect(html).toContain("Needs coaching");
    expect(html).toContain("Revize 2");
    expect(html).toContain("Acceptable after review");
    expect(html).toContain("Rechecked the complete transcript.");
  });
});
