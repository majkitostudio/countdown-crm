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
- `main` je zelený: `npm test` = 942 testů / 189 souborů; `npm run lint` a `npm run typecheck` čisté; `npm run verify:parity` = 133 = 133 a `verify:parity --linked` = 133 = 133 (vzdálená parita OK, nasazeno na sandbox).
- **Fáze 6 — Team Leader dashboard a reporty** je v běhu. Hotovo: souhrn front P1–P4, pruh „Rizika a prodlevy“, Call Activity na `/reports`, sloupec `Důvod` v Queues a **čtyři provozní metriky pro denní checkpoint**: konverze, provoz na lince teď, stárnutí fronty, důvody neúspěchu.
- **Taxonomie důvodů neúspěchu (vyřešeno 17. 10. 2026):** vyřešen nesoulad UI vs. DB. Model sjednocen na 6 typů ve 2 skupinách: **ovlivnitelné operátorem** (→ recyklace do P4, povinná poznámka: „Neuzavřený obchod“ / `unsuccessful_sale`, „Jiný důvod (vlastní popis)“ / `other`) a **neovlivnitelné operátorem** (→ uzavření, nepovinná poznámka: „Bez zájmu (ukončeno)“, „Invalidní přihláška (nesprávné údaje)“, „Zdravotní důvody (alergie, intolerance)“, „Duplikát“). Migrace `20261017120000_fail_reason_taxonomy.sql` rozšířila constraint na 10 hodnot (včetně starých pro historii) a obě přetížení privátní RPC. Nasazeno na sandbox (`verify:parity --linked` = 133 = 133). Přidán guard test proti driftu. Strip na `/team` ukazuje souhrn ovlivnitelných neúspěchů a štítky. Zbývá QA/regresní uzávěrka fáze.

**Jak pracovat:**
- Po malých, ověřitelných krocích. Každý krok: `npm run test:changed` + commit.
- Kód a dokumentaci commitovat odděleně. **Git je „rajon“ agenta** — commity i push na `origin/main` řeší agent sám, bez ptaní (PM, 17. 10. 2026). Hlídej ale, aby byl strom zelený (`npm run lint`, `npm run typecheck`, `npm test`).
- Nic nehardcodovat (žádné konkrétní produkty, akce ani zdroje). Komunikovat česky a „po lopatě“.
- UI musí fungovat i bez dat.
- **Živé ověření v prohlížeči:** dev server spouštěj a otevírej přes `http://localhost:3000`, **ne** `http://127.0.0.1:3000`. Next 16 blokuje dev resources (HMR) pro cizí origin, takže přes `127.0.0.1` se stránka vůbec nenahydratuje a klikání na tlačítka nefunguje (tlačítko „Submit“ odešle nativní GET). Alternativně přidat `allowedDevOrigins` do `next.config.ts`.

**Otevřené body k potvrzení s PM:**
1. **Fáze 6 — uzávěrka** — základní obsah reportů, čtyři provozní metriky i oprava taxonomie neúspěchů jsou hotové. Zbývá formální QA/regresní uzávěrka fáze (definice důkazů správnosti, kontrola rolí).
2. **Konverze (krok 1) — odchylka od zadání.** PM řekl „prodeje / spojené hovory“, ale celé CRM počítá konverzi jako **objednávky / všechny (vytáčené) hovory**; aby na obrazovce nebyla dvě různá čísla pro totéž, je krok 1 zapojen jako `sales / dialedCalls`. Je to jeden řádek (`conversionPercent` v `src/lib/teamWorkspaceMetrics.ts`) — snadno vrátitelné, čeká na potvrzení PM.
   - **Doplněk z revize (17. 10. 2026):** i čitatel se liší od reportů. Checkpoint bere jako prodej `SALES_ORDER_STATUSES` (`completed, pending, in_progress, sent, delivered`), kdežto Reporting i denní souhrn jen `status = 'completed'`. Checkpoint je proto mírně „vstřícnější“. Je to vědomé (umožňuje ověřit řádek proti sloupci „Prodeje“ na téže obrazovce), ale **definice prodeje by se měla sjednotit napříč obrazovkami** — čeká na rozhodnutí PM.
3. **Leady bez týmu (`team_id = NULL`) nejsou v rozsahu týmu vidět** (nález z revize). Obrazovka i nový strip stárnutí fronty filtrují podle týmů, takže lead bez přiřazeného (nebo archivovaného) týmu se do „Čeká celkem“ nepočítá — i když reálně čeká. Otázka pro PM: má vedoucí tyto leady vidět (např. jako „nepřiřazené“), nebo za ně opravdu neodpovídá? Úklid: ukázat je zvlášť, nebo popisek upravit tak, aby nelhal.
4. **Přizpůsobení Operator Console podle oddělení** (PM pojmenoval 17. 10. 2026 jako budoucí směr): konzole má vést operátora podle specifik jeho oddělení (P1 prioritní prodej a doobjednávky, P2 masové volání, P3 retence, P4 poslední záchrana). Doporučení: řízené datovými profily, ne 4 duplicitní obrazovky. Před začátkem upřesnit s PM otázky zapsané v ROADMAP.md.
5. **Odložené featury** (propojení AI, systém směn, produktová karta, refactor trenažéru…) — jen držet v roadmapě; nezačínat bez zadání PM.

**Známé body, které nejsou rozbité, jen odložené:**
- Oddělení (departments P1–P4) jsou dnes modelovaná přes týmy; vyčlenění na samostatnou entitu je vědomě odloženo.
- „Teď“ se v stripech (provoz na lince, stárnutí fronty) počítá při renderu (`new Date()`). Přes hranici 5 minut / 24 h mezi serverem a prohlížečem se číslo může o kousek rozejít — přijaté riziko, ne vada. Kdyby to vadilo, předá se `now` ze serveru.
- Týmový rozsah hovorů a objednávek hlídá **RLS** (politika `20260914144701_team_leader_historical_scope.sql`), ne dotaz v DAL. `analytics.ts` navíc přidává explicitní filtr `team_id`; checkpoint se o RLS spoléhá. Není to vada, ale je to rozdíl, na který je dobré si vzpomenout při změnách rozsahu.
- **Migrační token má omezenou platnost** (podle evidence vyprší kolem **24. 10. 2026**) — obnovit včas, jinak se přestane nasazovat, aniž by to kdokoli poznal (a přestane fungovat `db push` i `verify:parity --linked`). Expirace tokenu v UI není vidět, proto paritu občas ověřit (postup: [REMOTE_DB_MIGRATIONS.md](REMOTE_DB_MIGRATIONS.md)).
- Vzdálená migration parity byla obnovena (17. 10. 2026) — šlo o vypršený migrační token a přečíslované migrace, ne o vadu platformy. Pro `db push` i `verify:parity --linked` je potřeba token s právem zápisu (`database_write`).
