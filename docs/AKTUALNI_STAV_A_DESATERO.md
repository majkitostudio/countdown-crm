# Countdown CRM — aktuální stav a desatero

**Snapshot:** 24. 8. 2026<br>
**Větev:** `chore/close-pilot-readiness-gate`<br>
**HEAD:** `02267fe fix: prevent settings hydration mismatch`<br>
**Pracovní strom:** čistý po fast-forwardu na aktuální `origin/main` a lokálních quality gates<br>
**GitHub:** branch je zatím pouze lokální; `HEAD` je shodný s `origin/main`

## Jedna věta na úvod

Jsme ve fázi **stabilizace před bezpečným interním pilotem**. Základ CRM,
workspace oprávnění, fronta leadů, objednávky a lifecycle hovoru už existují.
Nejsme ale ve fázi, kdy bychom měli bez dalšího přidávat velké funkce nebo
tvrdit, že je produkt připravený pro běžný produkční provoz.

Nejbližší práce je hlavně o srovnání repozitáře se živou databází, uzavření
security dluhu a novém důkazu přihlášeného workflow od začátku do konce.

## Co je dnes skutečný základ

- Next.js 16.3.2, React 19.2.4, TypeScript, Tailwind 4 a Supabase Auth/Postgres.
- Přihlášení je chráněné proxy i samostatnou kontrolou uvnitř Server Actions.
- Workspace se hledá přes membership uživatele; role jsou `operator`,
  `team_leader` a `administrator`.
- Kritické zápisy vedou přes serverovou datovou vrstvu a podle potřeby přes
  databázové RPC: leady, produkty, hovory, fronta, objednávky, reminders,
  workflow a training sessions.
- Operator Console má serverem řízenou frontu, claim, start hovoru, heartbeat,
  cancel/recovery, outcome a callback. Telephony uvnitř prohlížeče je stále
  simulace, ne napojená ústředna.
- Objednávky mají lifecycle, historii stavů, řízené opravy detailů a auditní
  stopu. To je dobrý základ pro pilot, ale musí se znovu ověřit v přihlášeném
  browseru.
- `78781cb` odstranil nepoužívané AI copilot, enrichment, follow-up,
  speech-recognition a některé dynamické UI plochy. To zmenšilo prostor pro
  nepravdivé sliby, ale starší dokumentace je stále místy popisuje jako hotové.

## Co je důležité nepřikrášlovat

- Product Script má workspace-scoped editor pro administrátora, draft/publish/archive
  verzování, sanitizaci a read-only zobrazení pro operátora. Pokud pro produkt
  není publikovaná verze, panel používá explicitní fallback; štítek `AI-assisted`
  není důkaz živé AI.
- Workflow pravidla a execution log se ukládají, ale některé akce runtime pouze
  vypíšou do konzole. E-mail, AI summary a manager notification proto nejsou
  skutečné externí integrace.
- Training je oddělený simulátor/session workflow. Není to produkční hovor a
  jeho provider může spadnout na lokální training engine.
- Dashboard a analytics používají reálná workspace data tam, kde existují.
  Forecast, live monitoring, sentiment z telephony a část KPI zůstávají
  `Unavailable`, což je správný stav.
- Presence existuje pro routing a heartbeat fronty. Monitor ale nemá skutečný
  live stream operátorů; „presence uložená pro routing“ neznamená „live
  supervisor monitoring hotový“.
- `NEXT_PUBLIC_ALLOW_DEMO_AUTH=true` je pouze lokální vývojová výjimka. Nesmí
  být zapnutá ve sdíleném stagingu ani v produkci.

## Aktuální stav Git a Supabase

Lokální checkout obsahuje 50 migration souborů, poslední je
`20260822120928_product_script_versions_archive_previous.sql`. Přímé
porovnání s live Supabase v tomto průchodu nebylo možné bezpečně provést:
worktree nemá `supabase/config.toml`, `.env.local`, Supabase proměnné,
`.mcp.json` ani dostupné Supabase CLI/MCP připojení.

Starší snapshoty live migration historie proto nejsou považované za čerstvý
důkaz. V tomto průchodu nebyla spuštěna žádná migrace, `apply_migration` ani
SQL zápis. Live schema/RLS zůstává neověřené, dokud nebude dostupný schválený
read-only přístup ke konkrétnímu Supabase projektu.

## Ověření tohoto průchodu

| Kontrola | Výsledek | Poznámka |
|---|---|---|
| `npm ci --no-audit --no-fund` | **prošlo** | 480 balíčků; NPM oznámil 3 čekající install scripty, které nebyly schválené naslepo |
| Konzistence Next/React | **prošla** | `next` a `eslint-config-next` 16.3.2, React a `react-dom` 19.2.4 |
| `npm test` | **prošlo** | 4 soubory, 29 testů |
| `npm run lint` | **prošlo** | 0 errors, 3 warningy v `src/app/workspace/page.tsx` |
| `npm run build` | **prošlo** | Next 16.3.2, kompilace a 24 rout doběhly |
| `npm run typecheck` | **prošlo** | samostatně po čisté instalaci |
| `git diff --check` | **prošlo** | bez whitespace chyb |
| `npm audit --omit=dev --audit-level=high` | **prošlo** | 0 zranitelností |
| Live migration/RLS porovnání | **neověřeno** | chybí bezpečný endpoint, projektová konfigurace a Supabase přístup |
| Přihlášený pilotní browser smoke | **neověřeno** | otevřená relace obsahovala pouze GitHub; bezpečné testovací údaje nebyly dostupné |

Quality gates jsou po čisté instalaci zelené s výjimkou tří neblokujících
lint warningů. Tento snapshot ale **neprohlašuje interní pilot za připravený**:
chybí čerstvé read-only porovnání live migration historie a přihlášený browser
test s reálným Auth uživatelem, reloadem, RLS kontrolou a cleanupem.

## Doporučené pořadí commitů

Každý bod níže je jeden tematický commit. Nepřidávat do něj nesouvisející UI
nebo novou funkci jen proto, aby byl commit větší.

1. **P0 — srovnat Git a živé migrace**

   `chore: reconcile repository and remote migration history`

   Zjistit, odkud pochází sedm remote-only migrací, a dostat jejich skutečné
   SQL do repozitáře nebo výslovně zrušit jejich používání. Doplnit typy a
   zkontrolovat, že lokální seznam migrací odpovídá databázi. Bez tohoto kroku
   nevíme, proti jakému schématu vlastně vyvíjíme.

2. **P0 — uzavřít dependency/security audit**

   `chore: upgrade Next.js and close production dependency audit`

   Aktualizovat Next.js a související balíčky kontrolovaně, po přečtení
   aktuálních Next.js pravidel z `node_modules/next/dist/docs/`. Neprovádět
   slepě `npm audit fix --force`. Znovu ověřit test, lint, typecheck, build a
   audit. Součástí je i rozhodnutí k ochraně proti uniklým heslům v Supabase.

3. **P0 — udělat čerstvý důkaz přihlášeného pilotu**

   `test: verify authenticated pilot workflows against Supabase`

   V reálném Auth účtu projít: login → workspace → claim leadu → start/cancel
   nebo dokončení hovoru → callback nebo objednávka → reload → ověření v SQL.
   Otestovat také role a zápis do cizího workspace. Zapsat přesný účet/roli,
   datum, výsledek a případné fixture cleanup; neuvádět hesla.

4. **HOTOVO — zapojit zdroj Product Scriptu**

   `feat: persist and publish workspace product scripts`

   Používá se `product_scripts` a `product_script_versions`, draft/publish/archive
   přes DAL a RLS, bezpečné formátování a read-only runtime pro operátora.
   Zbývá pouze oddělené role-only ověření, pokud bude k dispozici příslušná
   přihlášená relace.

5. **P1 — uzavřít Operator Console lifecycle**

   `test: close operator queue and order lifecycle smoke`

   Doplnit opakovatelný smoke pro dva operátory, callback affinity, heartbeat,
   pád/recovery, order creation, status change a detail edit. Zaměřit se na
   race conditions a na to, že po chybě není lokální stav vydáván za uložený.

6. **P1 — oddělit reálné workflow od simulací**

   `refactor: isolate workflow simulations from production actions`

   U každé akce rozhodnout: skutečně ji implementujeme, nebo ji zobrazíme jako
   `Unavailable`/`Simulation`. Console log nesmí být vydáván za odeslaný
   e-mail, AI analýzu nebo notifikaci. Odstranit také demo payloady typu
   `Demo test transcript...` z cesty, kterou může uživatel považovat za realitu.

7. **P1 — uklidit RLS a výkonové warningy**

   `fix: close remaining Supabase policy and index warnings`

   Zapnout leaked-password protection, projít duplicitní permissive policies a
   doplnit jen odůvodněné FK indexy. Každou změnu ověřit security/performance
   advisorem a negativním přístupovým testem.

8. **P2 — sjednotit dokumentaci se skutečným produktem**

   `docs: align architecture and roadmap with pilot reality`

   Aktualizovat `README.md`, `docs/architecture.md`, `docs/roadmap.md` a
   `docs/commits.md`, aby nepopisovaly odstraněný Copilot, live AI nebo hotové
   externí integrace jako současný stav. Vizi zachovat, ale oddělit ji od
   ověřeného pilotu.

## Nové desatero pro práci na projektu

1. **Nejdřív řekneme, co přesně měníme.** Každý úkol má cíl, co do něj
   nepatří, riziko a jasný způsob ověření.
2. **Jeden commit řeší jednu věc.** Funkce, refaktor, migrace a dokumentace se
   nemíchají jen kvůli pohodlnějšímu pushi.
3. **Kód není důkaz hotového workflow.** U každého důležitého zápisu chceme
   přihlášení, správnou roli, reload a kontrolu výsledku v databázi.
4. **Bezpečnost žije na serveru a v RLS.** UI může něco skrýt, ale nesmí být
   jedinou ochranou workspace nebo role.
5. **Lokální migrace a live databáze musí být ve shodě.** Ruční SQL mimo Git
   je dočasný incident, ne nový zdroj pravdy.
6. **Nevyrábíme falešné signály.** Žádné smyšlené latency, online stav,
   AI skóre, e-mail, telephony nebo „success“, když se nic neuložilo.
7. **Simulace jsou viditelně simulace.** Training, softphone a lokální fallback
   nesmí vypadat jako produkční call centrum.
8. **Kontroly spouštíme před handoffem.** Minimálně test, lint, typecheck,
   build a `git diff --check`; u datové změny navíc browser + SQL smoke.
9. **Opravujeme příčinu, ne masku.** Nevypínat pravidla, nezakrývat chybu
   fallbackem a nemažme test jen proto, aby vyšel zeleně.
10. **Po práci necháme stopu.** Aktualizovat stavový dokument, přesně uvést
    ověření, stageovat konkrétní soubory a push/merge dělat až po kontrole
    divergence větví.

## Kdy smíme říct „interní pilot je připravený“

Teprve až platí všechno níže:

- Git a live Supabase mají stejnou migrační historii;
- bezpečnostní audit nemá otevřený P0 problém;
- reálný Auth uživatel projde hlavním workflow a zápisy přežijí reload;
- role a cizí workspace jsou ověřené negativním testem;
- Product Script má jasný a ověřený zdroj pravdy;
- simulované části jsou zřetelně oddělené od produkčních záznamů;
- testy, lint, typecheck, build a dependency audit mají vysvětlený výsledek;
- dokumentace odpovídá tomu, co skutečně běží.

Do té doby je správný status: **stabilizační práce / interní pilot v přípravě**.
