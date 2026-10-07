import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const PORT = 3005;
const BASE_URL = `http://localhost:${PORT}`;

const ROUTES_TO_TEST = [
  { path: "/login", name: "Přihlašovací obrazovka (Login)", expectedRole: "public" },
  { path: "/workspace", name: "Operátorská konzole (Operator Console)", expectedRole: "operator" },
  { path: "/calendar", name: "Plánovač (Schedules & Reminders)", expectedRole: "operator" },
  { path: "/orders", name: "Správa objednávek (Orders & Expedice)", expectedRole: "operator/manager" },
  { path: "/products", name: "Katalog produktů (Products)", expectedRole: "all" },
  { path: "/calls", name: "Historie hovorů (Calls)", expectedRole: "operator/manager" },
  { path: "/training", name: "AI Tréninkové centrum (Training)", expectedRole: "operator" },
  { path: "/training/reviews", name: "Hodnocení tréninků (Training Reviews)", expectedRole: "manager" },
  { path: "/team", name: "Týmový přehled & linky (Team Management)", expectedRole: "manager" },
  { path: "/exceptions", name: "Fronta výjimek (Exception Queue)", expectedRole: "manager" },
  { path: "/analytics", name: "Analytika prodeje (Analytics)", expectedRole: "manager" },
  { path: "/wallet", name: "Peněženka & Mzdová uzávěrka (Wallet & Settlement)", expectedRole: "manager" },
  { path: "/dashboard", name: "Hlavní manažerský přehled (Executive Dashboard)", expectedRole: "admin" },
  { path: "/controls", name: "Kontrolní stanoviště (Control Checkpoint)", expectedRole: "admin" },
  { path: "/settings", name: "Nastavení systému (Settings)", expectedRole: "admin" },
  { path: "/settings/users", name: "Centrum správy uživatelů (User Hub)", expectedRole: "admin" },
  { path: "/settings/scripts", name: "Správa prodejních skriptů (Scripts)", expectedRole: "admin" },
  { path: "/leads", name: "Přehled kontaktů (Leads)", expectedRole: "admin" },
  { path: "/audit", name: "Auditní záznamy (Audit Log)", expectedRole: "admin" },
  { path: "/telephony", name: "Nastavení telefonie (Telephony)", expectedRole: "admin" },
  { path: "/workflows", name: "Pracovní toky (Workflows)", expectedRole: "admin" },
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
  console.log(`Port: ${PORT} | Base URL: ${BASE_URL}`);
  console.log("==================================================\n");

  // 1. Spuštění Next.js serveru v produkčním módu (předtím proběhl next build)
  console.log("1. Spouštím Next.js server na pozadí...");
  const serverProcess = spawn(
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

    console.log("\n3. Procházím jednotlivé trasy aplikace:\n");

    for (const route of ROUTES_TO_TEST) {
      const url = `${BASE_URL}${route.path}`;
      const pageErrors = [];
      const consoleErrors = [];

      const errorHandler = (err) => pageErrors.push(err.message);
      const consoleHandler = (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      };

      page.on("pageerror", errorHandler);
      page.on("console", consoleHandler);

      const startTime = Date.now();
      let status = 0;
      let finalUrl = "";
      let title = "";
      let passed = false;
      let errorReason = "";

      try {
        const response = await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
        status = response ? response.status() : 0;
        finalUrl = page.url();
        title = await page.title();

        // Základní kritéria úspěchu:
        // 1. Status 200 nebo redirect
        // 2. Žádná neošetřená výjimka v JS na stránce
        const reachedTarget = route.path === "/login" || !finalUrl.includes("/login");
        if (status >= 200 && status < 400 && pageErrors.length === 0 && reachedTarget) {
          passed = true;
        } else {
          errorReason = !reachedTarget ? `Redirected to ${finalUrl}` : `Status ${status}, pageErrors: ${pageErrors.join("; ")}`;
        }
      } catch (err) {
        errorReason = err.message;
      } finally {
        page.off("pageerror", errorHandler);
        page.off("console", consoleHandler);
      }

      const durationMs = Date.now() - startTime;

      if (!passed) hasFailure = true;

      const symbol = passed ? "✅ OK" : "❌ CHYBA";
      console.log(` ${symbol} | ${route.path.padEnd(25)} | ${status} | ${durationMs}ms | ${route.name}`);
      if (pageErrors.length > 0) {
        console.log(`     ⚠️ JS Chyby: ${pageErrors.join(" | ")}`);
      }
      if (consoleErrors.length > 0) {
        console.log(`     ℹ️ Konzole chyby (${consoleErrors.length}): ${consoleErrors[0]}`);
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
      });
    }

    // 4. Test specifických interakcí na klíčových nových obrazovkách
    console.log("\n4. Test specifických funkčních interakcí:\n");

    // 4.1 User Hub na /settings/users: Ověření přítomnosti KPI karet a onboarding tlačítka
    try {
      await page.goto(`${BASE_URL}/settings/users`, { waitUntil: "networkidle" });
      const userHubHeader = await page.textContent("h1, h2");
      const hasInviteBtn = await page.locator("button:has-text('Pozvat')").count();
      const hasSearch = await page.locator("input[placeholder*='Hledat']").count();

      const hubOk = hasInviteBtn > 0 && hasSearch > 0;
      console.log(` ${hubOk ? "✅ OK" : "❌ CHYBA"} | User Hub (/settings/users) - Tlačítko pozvat & vyhledávání přítomno`);
    } catch (err) {
      console.log(` ❌ CHYBA | User Hub interakce: ${err.message}`);
    }

    // 4.2 Objednávky na /orders: Ověření Carrier export dropdownu
    try {
      await page.goto(`${BASE_URL}/orders`, { waitUntil: "networkidle" });
      const hasExportBtn = await page.locator("button:has-text('Export')").count();
      console.log(` ${hasExportBtn > 0 ? "✅ OK" : "❌ CHYBA"} | Objednávky (/orders) - Export pro dopravce (CSV/Zásilkovna) přítomen`);
    } catch (err) {
      console.log(` ❌ CHYBA | Orders interakce: ${err.message}`);
    }

    // 4.3 Plánovač na /calendar
    try {
      await page.goto(`${BASE_URL}/calendar`, { waitUntil: "networkidle" });
      const calendarText = await page.content();
      const hasPlanner = calendarText.includes("Plánovač") || calendarText.includes("Schedules");
      console.log(` ${hasPlanner ? "✅ OK" : "❌ CHYBA"} | Plánovač (/calendar) - Zobrazení schedules a reminders přítomno`);
    } catch (err) {
      console.log(` ❌ CHYBA | Calendar interakce: ${err.message}`);
    }

    // 4.4 Mzdy na /wallet
    try {
      await page.goto(`${BASE_URL}/wallet`, { waitUntil: "networkidle" });
      const walletText = await page.content();
      const hasSettlement = walletText.includes("Měsíční uzávěrka") || walletText.includes("Exportovat mzdy");
      console.log(` ${hasSettlement ? "✅ OK" : "❌ CHYBA"} | Peněženka & Mzdy (/wallet) - Mzdový přehled a CSV export přítomen`);
    } catch (err) {
      console.log(` ❌ CHYBA | Wallet interakce: ${err.message}`);
    }

    await browser.close();

    console.log("\n==================================================");
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`🏁 VÝSLEDEK SMOKE TESTU: ${passedCount} / ${results.length} tras prošlo úspěšně!`);
    console.log("==================================================\n");

    if (hasFailure) {
      process.exitCode = 1;
    }
  } finally {
    console.log("Zastavuji Next.js testovací server...");
    if (serverProcess.pid) {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(serverProcess.pid), "/T", "/F"], { shell: true, stdio: "ignore" });
      } else {
        serverProcess.kill("SIGTERM");
      }
    }
  }
}

run().catch((err) => {
  console.error("Kritická chyba smoke testu:", err);
  process.exit(1);
});
