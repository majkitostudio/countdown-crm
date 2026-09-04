import { describe, expect, it } from "vitest";

import { validateCallFailFields } from "@/lib/postCall";

describe("generic call Fail write contract", () => {
  it("requires reason and note for objection calls", () => {
    expect(validateCallFailFields({ outcome: "objection", failReason: null, note: "" })).toBe("Select a fail reason.");
    expect(validateCallFailFields({ outcome: "objection", failReason: "price", note: "Client declined on price." })).toBeNull();
  });

  it("rejects fail reasons on non-Fail outcomes", () => {
    expect(validateCallFailFields({ outcome: "completed", failReason: "price", note: "Legacy note" })).toBe(
      "Fail reason is only valid for a fail outcome",
    );
  });
});
