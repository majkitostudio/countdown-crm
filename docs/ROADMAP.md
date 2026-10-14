# Countdown CRM — roadmapa

Toto je pracovní plán dalších fází. **Není to závazek dokončit MVP** a není to tlak na termín.
Aktuální prioritu vždy volí PM; pořadí níže je orientační a jednotlivé fáze se mohou překrývat.

Zdroj: sjednoceno z `CHAT_EXPORT_2026-10-11.md` a ověřeného stavu repozitáře (12. 10. 2026).

## Směr, který držíme

- Nepracujeme na **zdroji leadů** — stavíme kostru, do které se zdroj jednou napojí.
- Nepracujeme na **telefonii / VoIP (Telnyx)** — odloženo na neurčito, žádné výdaje.
- Neplánujeme **velkou novou funkci** bez jasného use case a role, které slouží.
- Postup: **pročištění → navigace/role → provozní fronty → data → reporting → QA gate**.
- Každá fáze se dělí na malé, bezpečné, ověřitelné kroky.

Stav: ✅ hotovo · 🔄 probíhá · ⏳ čeká

---

## Fáze 0 — Dokončit pročištění (stabilizační základ)

**Cíl:** dotáhnout a zafixovat odstranění nevyužívaných a generických funkcí; nikde nezůstanou mrtvé odkazy.

**Hotovo:**
- Odstraněny slepé routy `/objects/[slug]`, `/monitor`, `/audio-preview` a generický Object Builder.
- Odstraněny **blueprints** (multi-industry šablony), **custom schema / Attio pole** a **kanban + filtry + přepínač pohledu u leadů**.
- Opravena duplicitní verze migrace `20261007140000`.
- Opraveny rozbité editace (`LeadsTable.tsx`, `AppHeader.tsx`), uklizeny tři testy odkazující na smazané soubory a smazáno pracovní smetí.
- Ověřeno: `lint`, `typecheck`, `test` (815 testů) a `build` zelené; navigace neobsahuje mrtvé odkazy.

**Stav:** ✅ hotovo (12. 10. 2026).

---

## Fáze 1 — Sjednocení navigace a Admin Hub

**Cíl:** zredukovat chaos v levém menu a administraci; jedna logická struktura místo roztroušených položek.

**Kroky:**
- Seskupit navigaci podle role: Operátor / Team Leader / Admin.
- Zavést jeden **Admin Hub** se sekcemi: Uživatelé a týmy · Pravidla a automatizace · Kampaně a pravidla příjmu · Audit a monitoring.
- Přesunout technické nastavení pod jednu strukturu; skrýt/odstranit duplicity.

**Ověření:** maximálně jeden Admin Hub; u každé položky je jasné „kdo ji používá a proč“; základní správa do 3 kliknutí.

**Stav:** ✅ hotovo (12. 10. 2026). Menu je rozdělené do sekcí Work · Team · Reporting · Learn · Administration · Account, všechny názvy jsou anglicky, Team Leader Review je záložkou v Team Workspace, Call Logs je skryté operátorům a správa je v jednom Admin Hubu (`/admin`) pro admina. Detaily a rozhodnutí: [PHASE_1_NAVIGATION_REVIEW.md](PHASE_1_NAVIGATION_REVIEW.md).

---

## Fáze 2 — Role-based UX pass (operátor, TL, admin)

**Cíl:** každá role má jeden jasný pracovní prostor: jeden hlavní pohled, jeden úkolový tok, jeden přehled stavu.

**Konkrétní plán:** [PHASE_2_STRUCTURE_REVIEW.md](PHASE_2_STRUCTURE_REVIEW.md) — inventura všech obrazovek
(role, četnost, stav), **pravidlo pojmenování** (název anglicky · popis česky · obsah česky · obecná
tlačítka a URL anglicky), sloučení obrazovek a tři vlny prací.

**Kroky (po vlnách):**
- **Vlna 1 — názvy a popisy:** srovnat titulky a popisy všech stránek podle pravidla pojmenování (bez zásahu do logiky a URL).
- **Vlna 2 — sloučení:** Products & Scripts (`/products` + `/settings/scripts`), Reports (`/dashboard` + `/analytics`), Team Workspace záložky (`/team` + `/exceptions` + reviews), health strip místo `/controls`, **Automations** místo Workflows, zaparkovat telefonii.
- **Vlna 3 — URL:** nové cesty (`/console`, `/schedule`, `/call-logs`, `/reports`, `/automations`, `/admin/users`, `/team/*`) + přesměrování starých cest.
- **Role workspaces:** operátor zůstává v Operator Console, TL má týmový cockpit se záložkami (Overview · Exceptions · Training Reviews), admin má správu na jednom místě (Administration).

**Ověření:** operátor nevidí admin nastavení; TL vidí týmové fronty a výjimky na jedné ploše; admin má správu v jednom místě; žádná stránka nemá duplicitní protějšek.

**Stav:** ✅ hotovo (14. 10. 2026) — vlny 1 (názvy a popisy), 2 (sloučení obrazovek A–F) a 3 (URL + přesměrování) dokončené. Revize struktury schválena PM (13. 10. 2026). Otevřené body (produktová karta, koncept Schedule, náplň Automations) pokračují jako samostatné úkoly — viz [PHASE_2_STRUCTURE_REVIEW.md](PHASE_2_STRUCTURE_REVIEW.md), část 7.

---

## Fáze 3 — Objednávky: stabilizace Kanbanu a workflow

**Cíl:** objednávky jako funkční provozní nástroj, ne jen vizuální experiment.

**Hotovo:** `/orders` nabízí Kanban i tabulku; exporty pro dopravce (Zásilkovna, Balíkovna, GLS); tracking čísla.

- Krok 1 — sdílený model stavů (`src/lib/orderStage.ts`); Kanban i filtry pokrývají všechny stavy: Processing · Sent · Awaiting Pickup · Delivered · Returned · Canceled. Opravilo to chybu, kdy objednávky ze hovoru měly stav `completed`, který Kanban neznal, a nebyly vidět.
- Krok 2 — riziko výdejny (`src/lib/orderRisk.ts`): 3+ dny na výdejně = alarm, 2 dny = riziko, po obvolání zákazníka = v klidu; barevné zvýraznění na kartách i v tabulce.
- Krok 3 — přehledový pruh s počty (`src/components/orders/OrderStageSummary.tsx`): Total, 6 fází, Warning, Alarm; vidí ho tabulka i Kanban.
- Krok 4 — rizikové zásilky jako výjimka `order:pickup_risk` v Exception Queue: do fronty jde jen alarm (3+ dny na výdejně bez obvolání, priorita high), TL ji může označit „Mark handled“ / „Snooze“. DB migrace rozšiřuje CHECK klíče, RLS politiky a guard aktivního zdroje.
- Krok 5 — index `orders (workspace_id, status, package_arrived_at)` pro dotaz na rizikové zásilky + kontraktní test.

**Kroky:**
- Zkontrolovat tok stavů: vytvořeno → k expedici → odesláno → na výdejně → doručeno → retence.
- Dořešit výjimky/rizika (např. zásilka na výdejně déle než 3 dny), počítadla a rozlišení „v klidu / riziko / alarm“.
- Ověřit výkon při větším objemu.

**Ověření:** každý stav má definovaný trigger a způsob řešení; výjimka je vidět hned, ne až v detailu; TL rychle pozná rizikové zásilky.

**Stav:** ✅ hotovo (14. 10. 2026). Poznámka: migrace z kroků 4 a 5 se v tomto prostředí nespouští — čistý běh a reálné měření výkonu (`EXPLAIN` na objemu dat) patří do Fáze 5.

---

## Fáze 4 — P1–P4 jako obecný provozní model

**Cíl:** obecná architektura oddělení/front — bez tvrzení, že už máme reálný zdroj leadů.

**Hotovo (databázová logika):** 24h cooldown pro faily, retence P3 po 21 dnech, recyklace P4 a záchrany zásilek.

**Kroky:**
- Abstraktní model: zdroj leadu · kampaň/oddělení · tým · stav · fronta · důvod · výsledek.
- Připravit fronty P1–P4 bez hardcodovaných produktů nebo konkrétních kampaní.
- V UI zobrazit P1–P4 jednotně i bez skutečných dat.

**Ověření:** systém zařadí lead do fronty podle pravidel, ne podle konkrétního zdroje; schéma připravené na API/webhook bez přepisování logiky.

**Stav:** 🔄 databáze hotová, UI přehled front čeká.

---

## Fáze 5 — Data model a migrace (bezpečné základy)

**Cíl:** odstranit technické riziko skryté za „všechno funguje“.

**Hotovo:** duplicitní timestamp migrace vyřešen; 128 souborů migrací, 0 duplicit.

**Kroky:**
- Doplnit kontrolu **duplicitních verzí** do `scripts/verify-all-migrations.mjs` (teď hlásí zastarale „ALL 127 MIGRATIONS“ a duplicity nekontroluje).
- Ověřit **čistý běh** celého řetězce na čisté PostgreSQL/Supabase databázi — včetně migrací Fáze 3 `20261014120000_team_leader_exception_pickup_risk.sql` a `20261014130000_orders_pickup_risk_index.sql`, které se ve vývojovém prostředí nespouští.
- Změřit výkon `EXPLAIN` na objemu dat u dotazů Fáze 3 (rizikové zásilky na výdejně, Exception Queue) — indexy existují, ale nejsou ověřené na datech.
- Zavést kontrolu „migration parity“ před dalším větším rozvojem.

**Ověření:** žádné duplicitní verze; migrace lze spustit z čistého stavu; změny modelu jsou mapované na role a workflow.

**Stav:** 🔄 částečně (kolize opravena, čistý běh a kontrola duplicit zbývají).

---

## Fáze 6 — Team Leader dashboard a reporty

**Cíl:** dát vedoucímu přehled o provozu, bez zbytečných „nice to have“ reportů.

**Kroky:**
- Kolik případů je v kterém oddělení, kolik v riziku a prodlevě.
- Co je v P4 a proč.
- Jednoduché provozní metriky pro TL.

**Ověření:** vedoucí podle přehledu rozhodne, kam přesunout práci; fronty a rizika jsou vidět na první pohled.

**Stav:** ⏳ čeká (základ `/reports` a `/team` existuje).

---

## Fáze 7 — QA, regrese a pevný release gate

**Cíl:** zabránit tomu, aby se „malé úpravy“ rozpadly do chaosu.

**Existuje:** CI, `verify:migrations`, Playwright smoke test.

**Kroky:** po každé fázi projít testy, smoke check, kontrolu rolí, kontrolu toku stavů a kontrolu migrací. Každá „funkční“ změna má mít definovaný důkaz o správnosti.

**Stav:** 🔄 částečně.

---

## Odložené samostatné featury

- **Refactor trenažéru (AI Training)** — [TRAINING_REFACTOR.md](TRAINING_REFACTOR.md). Vyňato z Fáze 2, proběhne jako velké samostatné přepracování.
- **Produktová karta (editor)** — viz sloučení A v [PHASE_2_STRUCTURE_REVIEW.md](PHASE_2_STRUCTURE_REVIEW.md); nejdřív zmapovat datový model produktu/skriptu.
- **Schedule — nový koncept osobní agendy** — viz část 7 tamtéž.

---

## Okamžitý další krok

**Fáze 0, 1, 2 a 3 jsou hotové.** Fáze 3 stabilizovala objednávky: jednotný tok stavů,
riziko výdejny („v klidu / riziko / alarm“), přehledová počítadla a rizikové zásilky jako
výjimka `order:pickup_risk` v Exception Queue.

**Další na řadě je Fáze 4 — P1–P4 jako obecný provozní model** (databáze hotová, čeká UI přehled front).
Konkrétní prioritu vždy volí PM. Čistý běh migrací a reálné měření výkonu (`EXPLAIN`) řeší Fáze 5.

**Vyňato do samostatné práce:** refactor trenažéru — [TRAINING_REFACTOR.md](TRAINING_REFACTOR.md).
