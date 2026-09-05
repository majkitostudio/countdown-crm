import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  const path = join(process.cwd(), relativePath);
  expect(existsSync(path), `${relativePath} should exist`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("local Asterisk Docker contract", () => {
  it("uses a pinned local-only Asterisk service", () => {
    const compose = readSource("docker-compose.telephony.yml");

    expect(compose).toContain("andrius/asterisk:22.10.1_debian-trixie");
    expect(compose).not.toContain(":latest");
    expect(compose).toContain("127.0.0.1:5060:5060/udp");
    expect(compose).toContain("127.0.0.1:8088:8088/tcp");
    expect(compose).toContain("127.0.0.1:12000-12020:12000-12020/udp");
    expect(compose).not.toContain("TELNYX");
  });

  it("defines only authenticated internal WebRTC extensions", () => {
    const pjsip = readSource("docker/asterisk/pjsip.conf");
    const dialplan = readSource("docker/asterisk/extensions.conf");

    expect(pjsip).toContain("type=transport");
    expect(pjsip).toContain("webrtc=yes");
    expect(pjsip).toContain("endpoint-1001");
    expect(pjsip).toContain("endpoint-1002");
    expect(pjsip).toContain("${ENV(SIP_PASSWORD_1001)}");
    expect(pjsip).toContain("${ENV(SIP_PASSWORD_1002)}");
    expect(dialplan).toContain("Dial(PJSIP/1001");
    expect(dialplan).toContain("Dial(PJSIP/1002");
    expect(dialplan).not.toContain("telnyx");
  });

  it("does not commit local credentials or certificates", () => {
    const gitignore = readSource(".gitignore");

    expect(gitignore).toContain("docker/asterisk/.env");
    expect(gitignore).toContain("docker/asterisk/*.pem");
    expect(gitignore).toContain("docker/asterisk/pjsip.local.conf");
  });
});
