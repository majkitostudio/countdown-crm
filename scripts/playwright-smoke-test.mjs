import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import { chromium } from "playwright";

async function findAvailablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

const PORT = Number(process.env.SMOKE_TEST_PORT || await findAvailablePort());
const externalBaseUrl = process.env.SMOKE_TEST_BASE_URL?.replace(/\/$/, "");
const BASE_URL = externalBaseUrl || `http://localhost:${PORT}`;

const ROUTES_TO_TEST = [
  { path: "/login", name: "Přihlašovací obrazovka (Login)", expectedRole: "public" },
  { path: "/console", name: "Operátorská konzole (Operator Console)", expectedRole: "operator" },
  { path: "/schedule", name: "Plánované hovory (Schedule)", expectedRole: "operator" },
  { path: "/orders", name: "Správa objednávek (Orders)", expectedRole: "operator/manager" },
  { path: "/products", name: "Katalog produktů (Products)", expectedRole: "administrator" },
  { path: "/call-logs", name: "Historie hovorů (Call Logs)", expectedRole: "operator/manager" },
  { path: "/training", name: "AI Tréninkové centrum (Training)", expectedRole: "operator" },
  { path: "/team/reviews", name: "Hodnocení hovorů (Team Reviews)", expectedRole: "team_leader" },
  { path: "/team", name: "Týmový přehled (Team)", expectedRole: "team_leader" },
  { path: "/team/exceptions", name: "Fronta výjimek (Exceptions)", expectedRole: "team_leader" },
  { path: "/reports", name: "Přehledy a čísla (Reports)", expectedRole: "manager" },
  { path: "/wallet", name: "Peněženka & Mzdová uzávěrka (Wallet & Settlement)", expectedRole: "manager" },
  { path: "/admin", name: "Administrace (Management)", expectedRole: "administrator" },
  { path: "/settings", name: "Nastavení (Settings)", expectedRole: "administrator" },
  { path: "/admin/users", name: "Správa uživatelů a týmů (Users & Teams)", expectedRole: "administrator" },
  { path: "/settings/scripts", name: "Správa prodejních skriptů (Scripts)", expectedRole: "administrator" },
  { path: "/leads", name: "Přehled leadů (Leads)", expectedRole: "administrator" },
  { path: "/audit", name: "Auditní záznamy (Audit)", expectedRole: "administrator" },
  { path: "/telephony", name: "Nastavení telefonie (Telephony)", expectedRole: "administrator" },
  { path: "/automations", name: "Automatizace (Automations)", expectedRole: "administrator" },
];

function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        resolve(res.statusCode);
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server did not respond at ${url} within ${timeoutMs}ms`));
        } else {
          setTimeout(check, 400);
        }
      });
    };
    check();
  });
}

async function run() {
  console.log("==================================================");
  console.log("🚀 STARTUJI PLAYWRIGHT BROWSER SMOKE TEST");
  console.log(`Base URL: ${BASE_URL}${externalBaseUrl ? " (externí lokální server)" : ` (port ${PORT})`}`);
  console.log("==================================================\n");

  let serverProcess = null;
  if (externalBaseUrl) {
    console.log("1. Používám již spuštěný server; test jej po dokončení nezastaví.");
  } else {
    console.log("1. Spouštím izolovaný Next.js dev server na volném portu...");
    serverProcess = spawn(
      "npx",
      ["next", "dev", "-p", String(PORT)],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: "development",
          NEXT_PUBLIC_ALLOW_DEMO_AUTH: "true",
          PORT: String(PORT),
        },
        shell: true,
        stdio: "pipe",
      }
    );

    serverProcess.stdout?.on("data", (d) => {
      const msg = d.toString();
      if (msg.includes("Ready in") || msg.includes("started server on")) {
        console.log(`[Next.js Server]: ${msg.trim()}`);
      }
    });

    serverProcess.stderr?.on("data", (d) => {
      const msg = d.toString();
      if (!msg.includes("ExperimentalWarning") && !msg.includes("punycode")) {
        console.warn(`[Next.js Server Stderr]: ${msg.trim()}`);
      }
    });
  }

  try {
    await waitForServer(`${BASE_URL}/login`);
    console.log("✅ Next.js server je připraven k testování.\n");

    // 2. Spuštění Playwright Chromium
    console.log("2. Spouštím Chromium prohlížeč (headless: true)...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    const results = [];
    let hasFailure = false;
    const interactionResults = [];
    const recordInteraction = (name, passed, details = "") => {
      interactionResults.push({ name, passed, details });
      if (!passed) hasFailure = true;
      console.log(` ${passed ? "✅ OK" : "❌ CHYBA"} | ${name}${details ? ` — ${details}` : ""}`);
    };

    const smokeEmail = process.env.SMOKE_TEST_EMAIL;
    const smokePassword = process.env.SMOKE_TEST_PASSWORD;
    if (Boolean(smokeEmail) !== Boolean(smokePassword)) {
      hasFailure = true;
      console.error("❌ Je nutné nastavit společně SMOKE_TEST_EMAIL i SMOKE_TEST_PASSWORD.");
    } else if (smokeEmail && smokePassword) {
      const loginErrors = { page: [], console: [], http: [] };
      const onLoginPageError = (error) => loginErrors.page.push(error.message);
      const onLoginConsole = (message) => {
        if (message.type() === "error") loginErrors.console.push(message.text());
      };
      const onLoginResponse = (response) => {
        if (response.status() >= 400) loginErrors.http.push(`${response.status()} ${new URL(response.url()).pathname}`);
      };
      page.on("pageerror", onLoginPageError);
      page.on("console", onLoginConsole);
      page.on("response", onLoginResponse);
      try {
        await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 15000 });
        await page.locator("#login-email").fill(smokeEmail);
        await page.locator("#login-password").fill(smokePassword);
        await page.getByRole("button", { name: "Přihlásit se do pracovního prostoru" }).click();
        await page.waitForURL((url) => url.pathname !== "/login", { timeout: 15000 });
      } catch (error) {
        hasFailure = true;
        console.error(`❌ Přihlášení smoke testu selhalo: ${error.message}`);
      } finally {
        page.off("pageerror", onLoginPageError);
        page.off("console", onLoginConsole);
        page.off("response", onLoginResponse);
      }
      if (loginErrors.page.length || loginErrors.console.length || loginErrors.http.length) {
        hasFailure = true;
        console.error(`❌ Chyba při přihlášení — JS: ${loginErrors.page.join("; ")}; konzole: ${loginErrors.console.join("; ")}; HTTP: ${loginErrors.http.join(", ")}`);
      } else {
        console.log("✅ Přihlášení smoke testu proběhlo bez chyb prohlížeče ani HTTP.");
      }
    }

    console.log("\n3. Procházím jednotlivé trasy aplikace:\n");

    for (const route of ROUTES_TO_TEST) {
      const url = `${BASE_URL}${route.path}`;
      const pageErrors = [];
      const consoleErrors = [];
      const httpErrors = [];

      const errorHandler = (err) => pageErrors.push(err.message);
      const consoleHandler = (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      };
      const responseHandler = (response) => {
        if (response.status() >= 400) {
          httpErrors.push(`${response.status()} ${new URL(response.url()).pathname}`);
        }
      };

      page.on("pageerror", errorHandler);
      page.on("console", consoleHandler);
      page.on("response", responseHandler);

      const startTime = Date.now();
      let status = 0;
      let finalUrl = "";
      let title = "";
      let visibleErrorState = "";
      let passed = false;
      let errorReason = "";

      try {
        const response = await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
        status = response ? response.status() : 0;
        finalUrl = page.url();
        title = await page.title();
        const mainText = await page.locator("main").innerText().catch(() => "");
        const mainHeadings = await page.locator("main h1, main h2").allTextContents();
        const errorHeading = mainHeadings.find((heading) => /\b(?:unavailable|error|failed)\b/i.test(heading));
        const failedLoadText = mainText.match(/\b(?:could not be loaded|failed to load|data could not be loaded)\b/i)?.[0];
        visibleErrorState = errorHeading || failedLoadText || "";

        // Základní kritéria úspěchu:
        // HTTP, JS, browser console, failed data responses, and visible load-error states all fail the route.
        const reachedTarget = route.path === "/login" || !finalUrl.includes("/login");
        if (status >= 200 && status < 400 && pageErrors.length === 0 && consoleErrors.length === 0 && httpErrors.length === 0 && !visibleErrorState && reachedTarget) {
          passed = true;
        } else {
          errorReason = [
            !reachedTarget ? `Redirected to ${finalUrl}` : "",
            `Status ${status}`,
            visibleErrorState ? `visible data/load error: ${visibleErrorState}` : "",
            pageErrors.length ? `page errors: ${pageErrors.join("; ")}` : "",
            consoleErrors.length ? `console errors: ${consoleErrors.join("; ")}` : "",
            httpErrors.length ? `HTTP errors: ${httpErrors.join(", ")}` : "",
          ].filter(Boolean).join(" | ");
        }
      } catch (err) {
        errorReason = err.message;
      } finally {
        page.off("pageerror", errorHandler);
        page.off("console", consoleHandler);
        page.off("response", responseHandler);
      }

      const durationMs = Date.now() - startTime;

      if (!passed) hasFailure = true;

      const symbol = passed ? "✅ OK" : "❌ CHYBA";
      console.log(` ${symbol} | ${route.path.padEnd(25)} | ${status} | ${durationMs}ms | ${route.name}`);
      if (pageErrors.length > 0) {
        console.log(`     ⚠️ JS Chyby: ${pageErrors.join(" | ")}`);
      }
      if (consoleErrors.length > 0) {
        console.log(`     ⚠️ Konzolové chyby (${consoleErrors.length}): ${consoleErrors[0]}`);
      }
      if (visibleErrorState) {
        console.log(`     ⚠️ Chybový stav stránky: ${visibleErrorState}`);
      }
      if (httpErrors.length > 0) {
        console.log(`     ⚠️ HTTP chyby (${httpErrors.length}): ${httpErrors.join(" | ")}`);
      }

      results.push({
        path: route.path,
        name: route.name,
        status,
        durationMs,
        passed,
        errorReason,
        pageErrors,
        consoleErrorsCount: consoleErrors.length,
        httpErrors,
        visibleErrorState,
      });
    }

    // 4. Test specifických interakcí na klíčových nových obrazovkách
    console.log("\n4. Test specifických funkčních interakcí:\n");
    const interactionRuntimeErrors = { page: [], console: [], http: [] };
    const onInteractionPageError = (error) => interactionRuntimeErrors.page.push(error.message);
    const onInteractionConsole = (message) => {
      if (message.type() === "error") interactionRuntimeErrors.console.push(message.text());
    };
    const onInteractionResponse = (response) => {
      if (response.status() >= 400) interactionRuntimeErrors.http.push(`${response.status()} ${new URL(response.url()).pathname}`);
    };
    page.on("pageerror", onInteractionPageError);
    page.on("console", onInteractionConsole);
    page.on("response", onInteractionResponse);

    // 4.1 Users & Teams: tlačítko pro pozvání a vyhledávání
    try {
      await page.goto(`${BASE_URL}/admin/users`, { waitUntil: "networkidle" });
      const userHubHeader = await page.textContent("h1, h2");
      const hasInviteBtn = await page.locator("button:has-text('Pozvat')").count();
      const hasSearch = await page.locator("input[placeholder*='Hledat']").count();

      const hubOk = hasInviteBtn > 0 && hasSearch > 0;
      recordInteraction("Users & Teams — pozvání a vyhledávání", hubOk, userHubHeader || "nadpis nenalezen");
    } catch (err) {
      recordInteraction("Users & Teams — pozvání a vyhledávání", false, err.message);
    }

    // 4.2 Orders: hlavní stránkový nadpis
    try {
      await page.goto(`${BASE_URL}/orders`, { waitUntil: "networkidle" });
      const hasOrdersHeading = (await page.locator("h1, h2").allTextContents()).some((text) => /orders|objednáv/i.test(text));
      recordInteraction("Orders — hlavní nadpis stránky", hasOrdersHeading);
    } catch (err) {
      recordInteraction("Orders — hlavní nadpis stránky", false, err.message);
    }

    // 4.3 Schedule: správná současná trasa a její nadpis
    try {
      await page.goto(`${BASE_URL}/schedule`, { waitUntil: "networkidle" });
      const hasScheduleHeading = (await page.locator("h1, h2").allTextContents()).some((text) => /schedule|plán/i.test(text));
      recordInteraction("Schedule — nadpis plánovaných hovorů", hasScheduleHeading);
    } catch (err) {
      recordInteraction("Schedule — nadpis plánovaných hovorů", false, err.message);
    }

    // 4.4 Wallet: stránka nebo vysvětlený stav nedostupnosti
    try {
      await page.goto(`${BASE_URL}/wallet`, { waitUntil: "networkidle" });
      const walletText = await page.locator("body").innerText();
      const walletAvailableOrExplained = /wallet|peněženka/i.test(walletText);
      recordInteraction("Wallet — stránka nebo vysvětlený stav", walletAvailableOrExplained);
    } catch (err) {
      recordInteraction("Wallet — stránka nebo vysvětlený stav", false, err.message);
    }

    page.off("pageerror", onInteractionPageError);
    page.off("console", onInteractionConsole);
    page.off("response", onInteractionResponse);
    const interactionErrors = [
      ...interactionRuntimeErrors.page.map((message) => `JS ${message}`),
      ...interactionRuntimeErrors.console.map((message) => `console ${message}`),
      ...interactionRuntimeErrors.http,
    ];
    recordInteraction("Chyby HTTP, konzole a JS při interakčních kontrolách", interactionErrors.length === 0, interactionErrors.join(" | "));

    await browser.close();

    console.log("\n==================================================");
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`🏁 VÝSLEDEK SMOKE TESTU: ${passedCount} / ${results.length} tras prošlo úspěšně!`);
    console.log(`🔎 VÝSLEDEK INTERAKCÍ: ${interactionResults.filter((r) => r.passed).length} / ${interactionResults.length} kontrol prošlo úspěšně!`);
    console.log("==================================================\n");

    if (hasFailure) {
      process.exitCode = 1;
    }
  } finally {
    if (serverProcess?.pid) {
      console.log("Zastavuji Next.js testovací server...");
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(serverProcess.pid), "/T", "/F"], { shell: true, stdio: "ignore" });
      } else {
        serverProcess.kill("SIGTERM");
      }
    } else if (externalBaseUrl) {
      console.log("Externí server zůstává spuštěný.");
    }
  }
}

run().catch((err) => {
  console.error("Kritická chyba smoke testu:", err);
  process.exit(1);
});
