# Briefing pro novou session (Countdown CRM)

Tenhle soubor je **startovní prompt** pro další práci. Zkopíruj text níže jako první zprávu do nové session. Soubor slouží jen jako předávka — až ho nebudeš potřebovat, může se smazat.

---

Jsi pokračování práce na projektu **Countdown CRM** v tomto repozitáři.

**Nejdřív si přečti (v tomto pořadí):**
1. `AGENTS.md` — pravidla projektu. Pozor hlavně na **pravidlo 7 (callback vs. scheduled call)** a pravidlo 2 (nic nehardcodovat).
2. `docs/ROADMAP.md` — stav fází a „Okamžitý další krok“.
3. `docs/HISTORY_COMPACT.md` — kontext a trvalá rozhodnutí.

**Kde jsme (17. 10. 2026):**
- Hotové fáze 0–5.1c (migrace ověřené z čistého stavu, pgTAP v CI, vstup leadů do fronty triggerem).
- `main` je zelený: `npm test` = 937 testů / 189 souborů; `npm run lint` a `npm run typecheck` čisté; `npm run verify:parity` = 132 = 132 a `verify:parity --linked` = 132 = 132 (vzdálená parita obnovena 17. 10. 2026).
- **Fáze 6 — Team Leader dashboard a reporty** je v běhu. Hotovo: souhrn front P1–P4, pruh „Rizika a prodlevy“, Call Activity na `/reports`, sloupec `Důvod` v Queues (proč je lead v oddělení; čte se z `lead_queue_items.last_outcome`, **bez nové migrace**) a **čtyři provozní metriky pro denní checkpoint** (kroky 1–4, vše bez migrace): konverze, provoz na lince teď, stárnutí fronty, důvody neúspěchu (viz `docs/ROADMAP.md`, Fáze 6). Metriky jsou ověřené testy i živě v prohlížeči proti datům sandboxu. Základ je view **Queues** z Fáze 4 (`src/lib/departmentQueues.ts`, `src/lib/dal/departmentQueues.ts`, `src/components/team/TeamDepartmentQueuesPanel.tsx`). Zbývá QA/regresní uzávěrka fáze.

**Jak pracovat:**
- Po malých, ověřitelných krocích. Každý krok: `npm run test:changed` + commit.
- Kód a dokumentaci commitovat odděleně. **Git je „rajon“ agenta** — commity i push na `origin/main` řeší agent sám, bez ptaní (PM, 17. 10. 2026). Hlídej ale, aby byl strom zelený (`npm run lint`, `npm run typecheck`, `npm test`).
- Nic nehardcodovat (žádné konkrétní produkty, akce ani zdroje). Komunikovat česky a „po lopatě“.
- UI musí fungovat i bez dat.
- **Živé ověření v prohlížeči:** dev server spouštěj a otevírej přes `http://localhost:3000`, **ne** `http://127.0.0.1:3000`. Next 16 blokuje dev resources (HMR) pro cizí origin, takže přes `127.0.0.1` se stránka vůbec nenahydratuje a klikání na tlačítka nefunguje (tlačítko „Submit“ odešle nativní GET). Alternativně přidat `allowedDevOrigins` do `next.config.ts`.

**Otevřené body k potvrzení s PM:**
1. **Terminologie** — vymezení hotové (AGENTS.md, pravidlo 7): *callback* = vázaný na konkrétního operátora, *scheduled call* = bez určení operátora. **Texty v UI jsou sjednocené (16. 10. 2026).** Zbývá rozhodnout, **zda přejmenovat i kód a data** (stav `waiting_callback`, sloupec `callback_scheduled_at`, `callbackAttention.ts`, action/test id) — dotýká se migrací, proto samostatný úkol.
2. **Fáze 6** — základní obsah reportů i čtyři provozní metriky pro TL jsou hotové. Zbývá potvrdit, zda jsou metriky v tomto pořadí a podobě dostačující (kroky 1–4) a zda má být uzávěrka fáze (QA/regrese).
3. **Konverze (krok 1) — odchylka od zadání.** PM řekl „prodeje / spojené hovory“, ale celé CRM počítá konverzi jako **objednávky / všechny (vytáčené) hovory**; aby na obrazovce nebyla dvě různá čísla pro totéž, je krok 1 zapojen jako `sales / dialedCalls`. Je to jeden řádek (`conversionPercent` v `src/lib/teamWorkspaceMetrics.ts`) — snadno vrátitelné, čeká na potvrzení PM.
4. **Nesoulad povolených důvodů neúspěchu mezi UI a DB** (nález z ověřování, mimo rozsah metrik): UI nabízí `unsuccessful_sale` a `invalid_lead`, ale DB constraint `calls_fail_reason_check` je nepovoluje → reálný operátor by u těchto dvou voleb dostal chybu `23514` a hovor by se neuložil. Oprava = nová migrace, která constraint rozšíří (viz `docs/ROADMAP.md`, „Odložené a budoucí“). Čeká na zadání PM.
5. **Odložené featury** (propojení AI, systém směn, produktová karta, refactor trenažéru…) — jen držet v roadmapě; nezačínat bez zadání PM.

**Známé body, které nejsou rozbité, jen odložené:**
- Oddělení (departments P1–P4) jsou dnes modelovaná přes týmy; vyčlenění na samostatnou entitu je vědomě odloženo.
- **Migrační token má omezenou platnost** (podle evidence vyprší kolem **24. 10. 2026**) — obnovit včas, jinak se přestane nasazovat, aniž by to kdokoli poznal (a přestane fungovat `db push` i `verify:parity --linked`). Expirace tokenu v UI není vidět, proto paritu občas ověřit (postup: [REMOTE_DB_MIGRATIONS.md](REMOTE_DB_MIGRATIONS.md)).
- Vzdálená migration parity byla obnovena (17. 10. 2026) — šlo o vypršený migrační token a přečíslované migrace, ne o vadu platformy. Pro `db push` i `verify:parity --linked` je potřeba token s právem zápisu (`database_write`).
