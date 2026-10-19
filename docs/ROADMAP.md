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
- Zavést jeden **Admin Hub** se sekcemi: Uživatelé a týmy · Pravidla a automatizace · Oddělení a pravidla příjmu · Audit a monitoring.
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

**Stav:** ✅ hotovo (14. 10. 2026). Poznámka: migrace z kroků 4 a 5 se ve vývojovém prostředí nespouštěly. Ověřeno ve Fázi 5: 15. 10. 2026 prošly na čisté databázi a jejich dotazy byly změřené na objemu dat (viz `docs/PHASE_5_MIGRATIONS_REVIEW.md`).

---

## Fáze 4 — P1–P4 jako obecný provozní model

**Cíl:** obecná architektura oddělení/front — bez tvrzení, že už máme reálný zdroj leadů.

**Hotovo (databázová logika):** 24h cooldown pro faily, retence P3 po 21 dnech, recyklace P4 a záchrany zásilek.

**Kroky:**
- Abstraktní model: zdroj leadu · department (oddělení) · tým · stav · fronta · důvod · výsledek.
- Připravit fronty P1–P4 bez hardcodovaných produktů nebo konkrétních zdrojů.
- V UI zobrazit P1–P4 jednotně i bez skutečných dat.

**Ověření:** systém zařadí lead do fronty podle pravidel, ne podle konkrétního zdroje; schéma připravené na API/webhook bez přepisování logiky.

**Stav:** ✅ hotovo (15. 10. 2026). Databáze hotová; sdílený model oddělení (`src/lib/department.ts`) hotový; přehled front hotový: agregace `lead_queue_items` po odděleních (`src/lib/dal/departmentQueues.ts` + čistá funkce `src/lib/departmentQueues.ts`) a nový view **Queues** v Team Workspace (manažerský souhrn oddělení + seznam leadů, funguje i bez dat, respektuje filtr týmů). Fronta se oddělení přiřazuje přes tým (`departmentKeyFromTeam`); položky bez rozpoznaného týmu se zobrazují jako „Bez oddělení". Nic se nehardcoduje (produkty ani zdroje).

---

## Fáze 5 — Data model a migrace (bezpečné základy)

**Cíl:** odstranit technické riziko skryté za „všechno funguje“.

**Hotovo:** duplicitní timestamp migrace vyřešen; 131 souborů migrací, 0 duplicit.

**Kroky:**
- Doplnit kontrolu **duplicitních verzí** do `scripts/verify-all-migrations.mjs` (počet migrací už hlásí správně — opraveno 15. 10. 2026). ✅ hotovo.
- Ověřit **čistý běh** celého řetězce na čisté PostgreSQL/Supabase databázi — včetně migrací Fáze 3 `20261014120000_team_leader_exception_pickup_risk.sql` a `20261014130000_orders_pickup_risk_index.sql`, které se ve vývojovém prostředí nespouští. ✅ hotovo.
- Změřit výkon `EXPLAIN` na objemu dat u dotazů Fáze 3 (rizikové zásilky na výdejně, Exception Queue) — indexy existují, ale nejsou ověřené na datech. ✅ hotovo.
- Zavést kontrolu „migration parity“ před dalším větším rozvojem. ✅ hotovo (`npm run verify:parity`).

**Ověření:** žádné duplicitní verze; migrace lze spustit z čistého stavu; změny modelu jsou mapované na role a workflow.

**Stav:** ✅ hotovo (15. 10. 2026). Kontrola duplicit je v `verify:migrations`; `supabase db reset` projde celý řetězec 131 migrací + seed na čisté databázi; dotazy Fáze 3 změřené na 200–300 tis. řádcích (do ~90 ms); kontrola parity zavedena jako `npm run verify:parity` (lokálně 131 = 131). Revize, měření a nálezy: `docs/PHASE_5_MIGRATIONS_REVIEW.md`.

**Nález fáze:** databázové pgTAP testy (`supabase test db`) na čisté databázi selhávaly — fixtures byly z doby před týmovým modelem a CI databázový job neměl. ✅ vyřešeno ve Fázi 5.1.

---

## Fáze 5.1 — Databázové testy a CI gate

**Cíl:** aby databázové testy nemohly znovu tiše ztichnout.

**Proč:** `npx supabase test db` na čisté databázi selhával ve 4 souborech (fixtures z doby před týmovým modelem) a CI databázový job vůbec neměl. Objeveno ve Fázi 5.

**Kroky:**
- Opravit fixtures pgTAP testů tak, aby respektovaly týmové přiřazení (`can_manage_team_resource`) a hovory s `team_id`. ✅ hotovo.
- Přidat do CI job, který zvedne lokální Supabase a spustí `supabase test db`. ✅ hotovo.

**Ověření:** `npx supabase test db` na čistě resetované databázi hlásí `Files=12, Tests=216, Result: PASS`; nový CI job `database-tests` spouští `supabase start` → `supabase db reset` → `supabase test db`.

**Stav:** ✅ hotovo (15. 10. 2026). Detaily: `docs/PHASE_5_MIGRATIONS_REVIEW.md`.

---

## Fáze 5.1b — Vlastnictví záznamů (dořešené riziko z 5.1)

**Cíl:** dokončit to, co Fáze 5.1 jen pojmenovala — že záznam bez potvrzeného týmu (`team_id IS NULL`) je vidět jen administrátorovi.

**Proč:** `NULL` není vada; je to stav „import přišel, administrátor ještě nerozhodl“. Slabé bylo, že se po potvrzení týmu u leadu nedoplnila jeho položka fronty (pro vedoucího i operátora neviditelná) a nikde nebylo vidět, kolik záznamů na potvrzení čeká.

**Kroky:**
- Kaskáda vlastnictví v migraci `20261015090000_team_ownership_queue_cascade.sql`: potvrzením týmu u leadu se doplní jeho položky fronty a naopak; **nikdy se nepřepíše** už potvrzený tým a nemění se stav fronty ani operátor. ✅ hotovo.
- RPC nově vrací `leads_updated`, `queue_items_updated` a `queue_items_remaining`, aby UI nelhalo. ✅ hotovo.
- Panel se přesunul ze `/admin/users` na vlastní stránku `/admin/ownership` a karta **Team Ownership** v Management hubu nese počítadlo „bez přiřazení“. ✅ hotovo.
- Doplnit testy: 23 pgTAP situací + `tests/team-ownership-cascade.test.ts` (route i UI kontrakt). ✅ hotovo.

**Ověření:** `supabase db reset` → `npx supabase test db` = `Files=12, Tests=216, Result: PASS`; `npm test` = 872 testů v 180 souborech; `npm run verify:parity` = 131 = 131.

**Stav:** ✅ hotovo (15. 10. 2026). Rozhodnuto **nezavádět `NOT NULL`** — rozbilo by automatizovaný administrátorský import. Detaily: `docs/PHASE_5_MIGRATIONS_REVIEW.md`.

---

## Fáze 5.1c — Vstup leadů do fronty (dořešená mezera)

**Cíl:** zajistit, aby každý nový lead skutečně vstoupil do fronty, ať vznikne jakkoli.

**Proč:** jediné místo, které kdy vytvořilo položku fronty, byl jednorázový backfill v `20260819090000_lead_queue_assignment.sql`. Leady vzniklé později (ruční zadání, import CSV i budoucí API/webhook) do fronty nikdy nevstoupily: operátor ani Team Leader je neviděli a napojení P3/P4 tiše nic nedělalo, protože přesouvá jen leady, které už položku fronty mají.

**Kroky:**
- Trigger `leads_enqueue_queue_item` (AFTER INSERT na `public.leads`) v migraci `20261015091000_lead_queue_enqueue_on_insert.sql`: každý nový lead dostane právě jednu položku fronty. ✅ hotovo.
- Položka přebírá tým leadu; import bez týmu tak zůstane „bez přiřazení“ a doplní jej kaskáda z Fáze 5.1b. ✅ hotovo.
- Už uzavřený lead (`customer`/`unresponsive`) se zařadí jako `closed`; stav fronty se jinak nikdy nepřepisuje. ✅ hotovo.
- Jednorázové doplnění leadů, které vznikly po původním backfillu a položku neměly. ✅ hotovo.
- Fixtures, které vkládají lead i položku ručně, nově používají upsert (`on conflict … do update`), aby nahradily automatickou položku zamýšleným stavem. ✅ hotovo.
- Nový pgTAP `lead_queue_enqueue_test.sql` (20 testů) a vitest `lead-queue-enqueue.test.ts`. ✅ hotovo.

**Stav:** ✅ hotovo (15. 10. 2026). Přesný stav: `supabase test db` = 13 souborů / 236 testů, `npm test` = 880 testů / 181 souborů, `npm run verify:parity` = 132 = 132.

**Doporučení na později:** skutečný kontrakt příjmu leadů (ověření, deduplikace, zdroj) zůstává samostatný budoucí modul; trigger jen garantuje, že co do databáze dorazí, to se zařadí.

---

## Fáze 6 — Team Leader dashboard a reporty

**Cíl:** dát vedoucímu přehled o provozu, bez zbytečných „nice to have“ reportů.

**Hotovo:**
- **Souhrn front P1–P4** na špičce `/team` (Denní checkpoint): karty `čeká / v řešení / naplánované / po termínu` + upozornění na položky bez oddělení. Karty jsou klikací — otevřou Queues s přednastaveným filtrem oddělení (včetně detailu P4). Soubory: `src/components/team/TeamQueuesSummaryStrip.tsx`, `src/components/team/TeamPageContent.tsx`.
- **Pruh „Rizika a prodlevy“** se souhrnnými kartami (hovor bez výsledku, naplánovaný hovor po termínu, propadlé přiřazení, zásilka na výdejně — riziko / alarm). Počítá se stejnými pravidly jako Exception Queue. Soubory: `src/lib/teamRiskSummary.ts`, `src/lib/dal/teamRiskSummary.ts`, `src/components/team/TeamRiskSummaryStrip.tsx`.
- **Graf Call Activity** na `/reports`: napojen na reálná data z tabulky `calls` (objem hovorů po dnech za posledních 7 dní + hodinová aktivita). Statický `CallActivityChart` byl napojen na data (nezměněn na komponentní úrovni). Soubory: `src/lib/callActivity.ts`, `src/components/dashboard/CallActivityChart.tsx`, `src/components/analytics/AnalyticsPanel.tsx`.
- **Důvod „proč je lead v oddělení“** v tabulce Queues (sloupec `Důvod`): námitka (recyklace na další den), vrácený balíček (Re-ship), balíček na výdejně, retence po doručení. Čte se z `lead_queue_items.last_outcome`, který zapisují SQL směrovací funkce, takže **není potřeba nová migrace**. Neznámý/nezaznamenaný důvod se zobrazí jako „—“, nic se nedomýšlí. Soubory: `src/lib/queueReason.ts`, `src/components/team/TeamDepartmentQueuesPanel.tsx`.
- **Čtyři provozní metriky pro denní checkpoint** (kroky 1–4, vše bez migrace). Všechny se vykreslují nad daty, která už na `/team` jsou, a bez dat nic nepředstírají (prázdno = hláška / „—“, ne falešná nula):
  - **Konverze** — objednávky / vytáčené hovory (počítáno jednotně s ostatním CRM). `src/lib/teamWorkspaceMetrics.ts`.
  - **Provoz na lince teď** — kolik operátorů je volných / v hovoru / po hovoru / na pauze / offline. Signál starší 5 minut nebo chybějící se počítá jako offline a panel přizná, u kolika operátorů je signál zastaralý. `src/lib/liveOpsSummary.ts`, `src/components/team/TeamLiveOpsStrip.tsx`.
  - **Stárnutí fronty** — kolik leadů čeká do 24 h / 1–3 dny / 3+ dny, jak dlouho čeká nejstarší a kolik jich je odloženo na později (`available_at` v budoucnosti). „Čeká“ je stejná množina jako u souhrnu front oddělení, takže na obrazovce nejsou dvě čísla pro totéž. `src/lib/queueAging.ts`, `src/components/team/TeamQueueAgingStrip.tsx`.
  - **Důvody neúspěchu** — žebříček důvodů z hovorů s výsledkem „námitka“ za zvolené období, včetně vlastního řádku „Neuvedeno“ pro hovory bez zaznamenaného důvodu. `src/lib/failureReasonRanking.ts`, `src/components/team/TeamFailureReasonStrip.tsx`.

**Kroky:**
- Kolik případů je v kterém oddělení, kolik v riziku a prodlevě. ✅ hotovo.
- Co je v P4 a proč. ✅ hotovo — počty + seznam + sloupec `Důvod` s důvodem zařazení (námitka / vratka / balíček na výdejně / retence).
- Jednoduché provozní metriky pro TL. ✅ hotovo — konverze, provoz na lince teď, stárnutí fronty a důvody neúspěchu (kroky 1–4 výše).

**Poznámka k důvodu zařazení:** `last_outcome` je „poslední zaznamenaný výsledek“, ne úplná historie. Pro leady, kde poslední hovor skončil jinak než přesunem do oddělení, se zobrazí „—“. Konkrétní námitka (cena, nedůvěra, …) je k dispozici v `lead_queue_events.metadata.fail_reason`; doplnění tohoto detailu je možné jako samostatný navazující krok bez migrace.

**Ověření:** vedoucí podle přehledu rozhodne, kam přesunout práci; fronty a rizika jsou vidět na první pohled. Nové metriky jsou ověřené jak testy, tak živě v prohlížeči proti skutečným datům sandboxu (čísla porovnaná s databází ve stejném rozsahu týmu). Prošly i **nezávislou revizí**, která našla tři věci, jež jsou opravené: poctivá věta o stavu signálů (nemlčí o operátorech bez signálu), žebříček důvodů počítá stejnou množinu jako tabulka „Neúspěšné hovory“ a texty nepřekrucují, co data umí. Konverze byla po potvrzení PM přepnuta na `prodeje / spojené hovory` (nezvednuté hovory se do jmenovatele nepočítají) a prodej platí od chvíle vytvoření. Přidány komponentní testy vykreslování stripů (včetně prázdných a nedostupných stavů).

**Stav:** ✅ hotovo (17. 10. 2026). Souhrn front, rizika a prodlevy, provozní metriky, taxonomie neúspěchů, QA kontrola rolí i regresní testy kompletní.

---

## Fáze 7 — QA, regrese a pevný release gate

**Cíl:** zabránit tomu, aby se „malé úpravy“ rozpadly do chaosu.

**Existuje:** CI, `verify:migrations`, Playwright smoke test.

**Kroky:** po každé fázi projít testy, smoke check, kontrolu rolí, kontrolu toku stavů a kontrolu migrací. Každá „funkční“ změna má mít definovaný důkaz o správnosti.

**Stav:** 🔄 částečně.

---

## Odložené a budoucí (iterativní)

Projekt se vyvíjí iterativně — PM bude hodně zkoušet, vymýšlet a rozšiřovat. **Tento seznam není závazek ani konečný**; další nápady se sem připisují průběžně a konkrétní zadání vždy určuje PM.

**PM pojmenoval jako budoucí směr (16.–17. 10. 2026):**
- **Velký refactor designu UI/UX a vizuální stránky webu** (PM, 17. 10. 2026) — komplexní přepracování vizuálního stylu, typografie, hierarchie komponent a modernizace designu napříč celým CRM (v souladu s design systemem a vysokou kvalitou uživatelského rozhraní). Podklad a inventura obrazovek: [docs/UI_UX_AUDIT_2026-10-17.md](UI_UX_AUDIT_2026-10-17.md).
- **Propojení AI do systému** — rozšiřovat AI napříč systémem (kontext, trénink, kvalita, pomoc operátorovi i vedoucímu). Drží se hranice z vize: AI pomáhá, ale nenahrazuje pravdu o hovoru, objednávce ani oprávněních.
- **Systém směn** — plánování a řízení směn (operátoři, vedoucí), návaznost na Team Operations a týmový dohled.
- **Ochranný štít proti vratkám: Blacklist, historie převzetí a detekce duplicit (Risk & Blacklist Check)** (PM, 17. 10. 2026) — automatická kontrola při načtení leadu i zadávání objednávky: (a) upozornění, pokud telefon/e-mail v minulosti nepřevzal zásilku (`returned`) nebo je na blacklistu chronických nevyzvedávačů, (b) detekce duplicitní objednávky (stejný klient si nedávno objednal u jiného operátora), aby se nevyexpedoval zbytečný druhý balík.
- **Živá ruka nahoře (Live SOS & Whisper asistence TL)** (PM, 17. 10. 2026 — nižší priorita / spíše pro home-office režim) — okamžitý alert pro Team Leadera při žádosti operátora o pomoc během hovoru a možnost poslat operátorovi tichou nápovědu (Whisper zprávu) přímo do konzole.
- **Přizpůsobení Operator Console podle oddělení** (PM, 17. 10. 2026) — každé oddělení dělá jinou práci (P1 prioritní prodej a doobjednávky, P2 masové volání, P3 retence 21 dní po doručení, P4 poslední záchrana — včerejší faily, vratky, balíčky na výdejně), ale operátor vidí na všech odděleních **stejnou** obrazovku (`src/app/console/page.tsx`). Cílem je, aby konzole vedla operátora k tomu, co je pro jeho oddělení klíčové (hlavní akce a výsledek hovoru, pořadí a důraz panelů, skript a otázky). Oddělení je v datech už rozpoznatelné (`src/lib/department.ts`, `departmentKeyFromTeam`; u aktivního leadu přes `lead_queue_items.team_id`), takže to má být **řízené daty, ne hardcodovanými větvemi po odděleních** (pravidlo 2). Doporučení: jeden konzole + datové profily oddělení, ne čtyři samostatné obrazovky. Než se začne, potvrdit s PM: (a) podle čeho se UI přizpůsobuje — oddělení **operátora**, nebo oddělení **leadu** (u P4 se liší: faily přicházejí z P1/P2), (b) co přesně se mění — hlavní akce a výsledek vs. celé rozložení a podklady, (c) profily vs. samostatné obrazovky.

**Dříve odložené (z Fází 2 a 5):**
- **Refactor trenažéru (AI Training)** — [TRAINING_REFACTOR.md](TRAINING_REFACTOR.md). Vyňato z Fáze 2, proběhne jako velké samostatné přepracování.
- **Produktová karta (editor)** — viz sloučení A v [PHASE_2_STRUCTURE_REVIEW.md](PHASE_2_STRUCTURE_REVIEW.md); nejdřív zmapovat datový model produktu/skriptu.
- **Schedule — nový koncept osobní agendy** — ✅ **hotovo (17. 10. 2026):** stránka `/schedule` byla přepracována na přehlednou denní agendu rozdělenou do sekcí *Po termínu (červeně)*, *Dnes*, *Zítra*, *Později*. Každá karta nabízí přímou akci *Call now* (otevře konzoli s leadem), *Detail* nebo správu připomínek.
- **Skutečný kontrakt příjmu leadů (API/webhook)** — ověření, deduplikace a zdroj; trigger z Fáze 5.1c řeší jen zařazení do fronty, ne příjem samotný.
- **Sjednocení povolených důvodů neúspěchu (UI vs. databáze)** — ✅ **hotovo (17. 10. 2026):** opraven nesoulad nalezený při metrikách. Model sjednocen na 6 typů ve 2 skupinách: **ovlivnitelné operátorem** (→ recyklace do P4, povinná poznámka: „Neuzavřený obchod“ / `unsuccessful_sale`, „Jiný důvod (vlastní popis)“ / `other`) a **neovlivnitelné operátorem** (→ uzavření, nepovinná poznámka: „Bez zájmu (ukončeno)“, „Invalidní přihláška (nesprávné údaje)“, „Zdravotní důvody (alergie, intolerance)“, „Duplikát“ / `duplicate`). Migrace `20261017120000_fail_reason_taxonomy.sql` rozšířila constraint na 10 hodnot (včetně starých pro historii) a obě přetížení privátní RPC `complete_lead_call_with_order_items_idempotent`. Nasazeno na linked sandbox (`verify:parity --linked` = 133 = 133). Přidán guard test proti budoucímu driftu. Strip na `/team` ukazuje souhrn ovlivnitelných neúspěchů a štítky.
- **Oddělení (departments) jako samostatná entita** — dnes vedená přes týmy; zvážit vyčlenění (ve Fázi 5 vědomě odloženo).
- **Sjednocení terminologie (callback vs. scheduled call)** — ✅ **hotovo (19. 10. 2026).** Texty v UI sjednoceny 16. 10. 2026; kód a data dokončeno dedikovaným refactoringem ve třech krocích: **B1** sloupec `calls.callback_scheduled_at` → `scheduled_at` (i parametry RPC), **B2** stav `waiting_callback` → `scheduled` a event `callback_scheduled` → `scheduled_call_created`, **B3** typ výjimky `overdue_callback` → `overdue_scheduled_call`, chybové texty v DB funkcích, action id `schedule_callback` → `claim_scheduled_call`, smazání shim `callbackAttention.ts` a přejmenování polí, typů, modulů a komponent (`scheduledCallsBanner.ts`, `ScheduleCallModal.tsx`, …). Nasazeno na linked sandbox (`verify:parity --linked` = 136 = 136), pgTAP 23/23, 7/7 databázových evidenčních kontrol. Programátorské callbacky (React `useCallback`, audio) a historické migrace zůstávají beze změny (viz AGENTS.md, pravidlo 7).
- **Vzdálená migration parity** — ✅ **obnoveno (17. 10. 2026):** vzdálený sandbox má nyní 132 souborů = 132 aplikovaných verzí (`verify:parity --linked` = `MIGRATION PARITY OK`). Příčina driftu: migrační access token vypršel 19. 9. 2026 (od té doby se nenasazovalo) a 12 migrací z 14.–16. 9. bylo v DB zapsaných pod přečíslovanými verzemi. Náprava: `supabase migration repair` (přečíslované → aplikováno, osiřelé záznamy → odstraněny) + `supabase db push` (15 chybějících migrací). **Pozor:** `db push` i `verify:parity --linked` potřebují token s právem zápisu (`database_write`); scoped read-only token na to nestačí. Postup je v [REMOTE_DB_MIGRATIONS.md](REMOTE_DB_MIGRATIONS.md).
- **Telefonie / VoIP (Telnyx)** — odloženo na neurčito, dokud se nezmění priorita.

---

## Okamžitý další krok

**Fáze 0, 1, 2, 3, 4, 5, 5.1, 5.1b, 5.1c i 6 jsou hotové.** Fáze 3 stabilizovala objednávky: jednotný tok stavů,
riziko výdejny („v klidu / riziko / alarm“), přehledová počítadla a rizikové zásilky jako
výjimka `order:pickup_risk` v Exception Queue. Fáze 4 sjednotila oddělení P1–P4 jako obecný
provozní model a přidala přehled front (view **Queues** v Team Workspace). Fáze 5 ověřila
migrace z čistého stavu, změřila dotazy na objemu dat a zavedla kontrolu migration parity
(viz [PHASE_5_MIGRATIONS_REVIEW.md](PHASE_5_MIGRATIONS_REVIEW.md)). Fáze 5.1 opravila fixtures
databázových pgTAP testů (týmové přiřazení) a přidala do CI job `database-tests`. Fáze 5.1b
dokončila vlastnictví záznamů: potvrzení týmu se doplní tam, kde chybí, panel se přesunul
na `/admin/ownership` a karta v Managementu nese počítadlo „bez přiřazení“. Fáze 5.1c
uzavřela vstup leadů do fronty: každý nový lead se zařadí automaticky triggerem, tým převezme
z leadu a už zavřený lead jde do fronty jako `closed`. Fáze 6 dodala Team Leader dashboard,
reporty a denní checkpoint: přehled front P1–P4, rizika a prodlevy, provoz na lince, stárnutí
fronty, sjednocenou taxonomii důvodů neúspěchu a konverzi (prodeje / spojené hovory).

**Další na řadě je Fáze 7 (QA, regrese a release gate) a iterativní rozvoj:**
1. **Ochranný štít proti vratkám (Blacklist, historie převzetí a detekce duplicit)** — varování u dřívějších vratek/nevyzvedávačů a kontrola duplicitních objednávek.
2. **Přizpůsobení Operator Console podle oddělení** (P1 prioritní prodej a doobjednávky, P2 masové volání, P3 retence, P4 záchrana) — řízené datovými profily, ne hardcodovanými větvemi.
3. **Leady bez týmu (`team_id = NULL`)**: zobrazení nepřiřazených leadů v přehledu.
4. **Propojení AI do systému** a **systém směn** dle zadání PM.

**Iterativní rozvoj:** vedle fází přibývají další směry (PM, 16.–17. 10. 2026: **propojení AI do systému**, **systém směn**, **přizpůsobení Operator Console podle oddělení**, a další) — viz část „Odložené a budoucí“ výše.

**Terminologie:** **callback** je vázaný na konkrétního operátora; **scheduled call** (`Schedule`, `/schedule`) operátora neurčuje, jen preferuje toho, kdo ho zadal — když není volný, hovor převezme kdokoli. Termín „callback“ se pro naplánované hovory nepoužívá (AGENTS.md, pravidlo 7). **Texty v UI jsou sjednocené (16. 10. 2026)**; kód a data (stav, sloupce, action id, interní názvy) byly sjednoceny 19. 10. 2026.

**Vyňato do samostatné práce:** refactor trenažéru — [TRAINING_REFACTOR.md](TRAINING_REFACTOR.md).
