// Run with: node tests/password-no-js-browser-check.mjs
// No credentials or external services are used.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { chromium } from "playwright";

const port = await new Promise((resolve, reject) => {
  const listener = createServer();
  listener.once("error", reject);
  listener.listen(0, "127.0.0.1", () => {
    const { port } = listener.address();
    listener.close((error) => error ? reject(error) : resolve(port));
  });
});
const base = `http://localhost:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(port)], {
  env: {
    ...process.env,
    NEXT_PUBLIC_ALLOW_DEMO_AUTH: "true",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-anon-key",
  },
  stdio: "ignore",
});

let browser;
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error("Next.js server did not start");
    try {
      if ((await fetch(`${base}/auth/update-password`)).ok) { ready = true; break; }
    } catch { /* server is starting */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(ready, "Next.js server did not become ready");
  browser = await chromium.launch({ headless: true });
  for (const mode of ["no-js", "before-hydration"]) {
    const context = await browser.newContext({ javaScriptEnabled: mode !== "no-js" });
    const page = await context.newPage();
    if (mode === "before-hydration") {
      await page.route("**/_next/static/**/*.js*", (route) => route.abort());
    }
    const requests = [];
    page.on("request", (request) => requests.push(request));
    await page.goto(`${base}/auth/update-password`, { waitUntil: "networkidle" });
    // The form is only rendered after the session check, which requires hydration.
    assert.equal(await page.locator("form, input[type=password]").count(), 0, mode);
    if (mode === "no-js") {
      assert.match(await page.locator("noscript").textContent(), /zapněte JavaScript/i);
    }
    assert.ok(requests.every((request) => request.method() === "GET"), mode);
    await context.close();
  }
  console.log("Password page checks passed: no JavaScript and before hydration.");
} finally {
  await browser?.close();
  server.kill();
}
