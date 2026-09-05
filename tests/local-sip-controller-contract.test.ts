import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("Local SIP softphone controller contract", () => {
  it("selects the active server adapter before starting a call", () => {
    const softphone = readSource("src/lib/telephony/softphone.ts");

    expect(softphone).toContain("getActiveTelephonyAdapterClient");
    expect(softphone).toContain('adapter === "local_sip"');
    expect(softphone).toContain("dialWithLocalSip");
    expect(softphone).toContain("/api/telephony/local/bootstrap");
    expect(softphone).toContain("/api/telephony/local/session");
  });

  it("maps Local SIP lifecycle and controls without using simulation audio", () => {
    const softphone = readSource("src/lib/telephony/softphone.ts");

    expect(softphone).toContain("localSipAdapter");
    expect(softphone).toContain("syncLocalSipSession");
    expect(softphone).toContain("toggleHold");
    expect(softphone).toContain("sendDtmf");
    expect(softphone).toContain("activeAdapter !== \"local_sip\"");
  });
});
