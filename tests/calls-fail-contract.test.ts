import { describe, expect, it } from "vitest";

import { validateCallFailFields } from "@/lib/postCall";

describe("generic call Fail write contract", () => {
  it("requires reason and note for objection calls", () => {
    expect(validateCallFailFields({ outcome: "objection", failReason: null, note: "" })).toBe("Vyberte důvod neúspěchu.");
    expect(validateCallFailFields({ outcome: "objection", failReason: "price", note: "Client declined on price." })).toBeNull();
  });

  it("rejects fail reasons on non-Fail outcomes", () => {
    expect(validateCallFailFields({ outcome: "completed", failReason: "price", note: "Legacy note" })).toBe(
      "Důvod neúspěchu lze zadat pouze u neúspěšného hovoru",
    );
  });
});
