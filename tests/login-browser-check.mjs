// Run with: node tests/login-browser-check.mjs
// Uses only synthetic credentials and a mocked authentication service.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { chromium } from "playwright";

const port = await new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    server.close((error) => error ? reject(error) : resolve(port));
  });
});
const base = `http://localhost:${port}`;
const email = "synthetic@example.test";
const password = "synthetic-password-42";
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
      const response = await fetch(`${base}/login`);
      if (response.ok) { ready = true; break; }
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
    await page.goto(`${base}/login?existing=1`, { waitUntil: "domcontentloaded" });
    if (mode === "no-js") assert.match(await page.locator("noscript").textContent(), /zapněte JavaScript/i);
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill(password);
    const [response] = await Promise.all([
      page.waitForResponse((response) => response.request().isNavigationRequest() && response.request().method() === "POST"),
      page.getByRole("button", { name: /Přihlásit se do pracovního prostoru/ }).click(),
    ]);
    assert.equal(response.status(), 200, mode);
    const post = response.request();
    assert.equal(post.url(), `${base}/login`);
    assert.equal(new URLSearchParams(post.postData()).get("password"), password);
    const responseBody = await response.text();
    assert.ok(!responseBody.includes(password) && !responseBody.includes(email));
    assert.ok(requests.every((request) => !request.url().includes(password) && !request.url().includes(encodeURIComponent(email))));
    assert.ok(!requests.some((request) => request.url().includes("/auth/v1/token")));
    assert.ok(!(await context.cookies()).some((cookie) => cookie.name.includes("auth-token")));
    await context.close();
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error("Browser error:", error.message));
  page.on("requestfailed", (request) => console.error("Request failed:", request.url(), request.failure()?.errorText));
  let authCalls = 0;
  await page.route("http://127.0.0.1:54329/auth/v1/token?*", async (route) => {
    authCalls++;
    assert.deepEqual(route.request().postDataJSON(), { email, password, gotrue_meta_security: {} });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "synthetic-token",
        refresh_token: "synthetic-refresh",
        token_type: "bearer",
        expires_in: 3600,
        user: { id: "00000000-0000-0000-0000-000000000001", aud: "authenticated", role: "authenticated", email },
      }),
    });
  });
  const requests = [];
  page.on("request", (request) => requests.push(request));
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: /Přihlásit se do pracovního prostoru/ }).click();
  await page.waitForURL(`${base}/`);
  assert.equal(authCalls, 1);
  assert.ok(!requests.some((request) => request.method() === "POST" && request.url() === `${base}/login`));
  assert.ok(requests.every((request) => !request.url().includes(password) && !request.url().includes(encodeURIComponent(email))));
  await context.close();
  console.log("Login browser checks passed: no JS, before hydration, hydrated login with mocked auth.");
} finally {
  await browser?.close();
  server.kill();
}
