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
- `main` je zelený a pushnutý: `npm test` = 908 testů / 186 souborů; `npm run verify:parity` = 132 = 132 a `verify:parity --linked` = 132 = 132 (vzdálená parita obnovena 17. 10. 2026).
- **Fáze 6 — Team Leader dashboard a reporty** je v běhu. Hotovo: souhrn front P1–P4, pruh „Rizika a prodlevy“, Call Activity na `/reports` a sloupec `Důvod` v Queues (proč je lead v oddělení; čte se z `lead_queue_items.last_outcome`, **bez nové migrace**). Základ je view **Queues** z Fáze 4 (`src/lib/departmentQueues.ts`, `src/lib/dal/departmentQueues.ts`, `src/components/team/TeamDepartmentQueuesPanel.tsx`). Zbývá: další jednoduché provozní metriky pro TL.

**Jak pracovat:**
- Po malých, ověřitelných krocích. Každý krok: `npm run test:changed` + commit.
- Kód a dokumentaci commitovat odděleně. **Před pushnutím se vždy zeptej PM.**
- Nic nehardcodovat (žádné konkrétní produkty, akce ani zdroje). Komunikovat česky a „po lopatě“.
- UI musí fungovat i bez dat.

**Otevřené body k potvrzení s PM:**
1. **Terminologie** — vymezení hotové (AGENTS.md, pravidlo 7): *callback* = vázaný na konkrétního operátora, *scheduled call* = bez určení operátora. **Texty v UI jsou sjednocené (16. 10. 2026).** Zbývá rozhodnout, **zda přejmenovat i kód a data** (stav `waiting_callback`, sloupec `callback_scheduled_at`, `callbackAttention.ts`, action/test id) — dotýká se migrací, proto samostatný úkol.
2. **Fáze 6** — základní obsah reportů je hotový (kolik práce kde, rizika, prodlevy, důvod zařazení leada v oddělení). Zbývá potvrdit, jaké **další jednoduché provozní metriky** má vedoucí vidět.
3. **Odložené featury** (propojení AI, systém směn, produktová karta, refactor trenažéru…) — jen držet v roadmapě; nezačínat bez zadání PM.

**Známé body, které nejsou rozbité, jen odložené:**
- Oddělení (departments P1–P4) jsou dnes modelovaná přes týmy; vyčlenění na samostatnou entitu je vědomě odloženo.
- Vzdálená migration parity byla obnovena (17. 10. 2026) — šlo o vypršený migrační token a přečíslované migrace, ne o vadu platformy. Pro `db push` i `verify:parity --linked` je potřeba token s právem zápisu (`database_write`).
