import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/call-logs/page.tsx"), "utf8");
const drawer = readFileSync(resolve(process.cwd(), "src/components/calls/CallDetailDrawer.tsx"), "utf8");

describe("Call Logs truthful transcript copy", () => {
  it("does not promise a full or real-time transcript for every call", () => {
    expect(source).not.toContain("úplné přepisy řeči");
    expect(source).not.toContain("Historie hovorů v reálném čase");
    expect(source).toContain("ověřené zachycené přepisy");
    expect(source).toContain("Záznam nemusí obsahovat audio ani přepis.");
  });

  it("shows transcript evidence without making the row action promise a transcript", () => {
    expect(drawer).toContain('call.transcript.kind === "unavailable"');
    expect(drawer).toContain("nebyl zachycen ověřený přepis řeči");
    expect(source).toContain("Zobrazit záznam");
    expect(source).not.toContain("Zobrazit přepis");
  });

  it("uses call review instead of sentiment or an ambiguous actions column", () => {
    expect(source).toContain("Kontrola hovoru");
    expect(source).not.toContain(">Nálada<");
    expect(source).not.toContain(">Akce<");
    expect(source).not.toContain("c.sentiment");
    expect(source).toContain("reviewStatusLabel(c.review_status)");
  });
});
