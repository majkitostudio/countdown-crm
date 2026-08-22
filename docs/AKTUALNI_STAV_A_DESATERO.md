# Countdown CRM — aktuální stav a nové desatero

**Aktualizováno:** 2026-08-22
**Větev:** `feat/order-detail-edit`
**Aktuální HEAD:** `baabfc3 feat: finalize product script versioning and publishing`
**Účel:** Tento soubor je praktický handoff pro další práci v Codexu. Má přednost před starými dlouhými roadmapami, pokud se jejich tvrzení liší od současného checkoutu a ověření.

## Kde právě jsme

Jsme ve fázi **stabilizace před bezpečným interním pilotem**. Základní CRM už není jen maketa: přihlášení, workspace hranice, role, leady, produkty, hovory, objednávky, fronta, callbacky, kalendář a část trainingu mají skutečnou serverovou a databázovou cestu.

Zároveň ještě nejsme připraveni pro širší provoz ani pro tvrzení „produkčně hotovo“. Product Script workflow s verzemi, publikováním a archivací je implementačně commitnuté a pushnuté; zbývá přihlášený browser smoke. Pracovní strom stále obsahuje necommitované docs/dependency změny a recovery artefakty, které zkreslují běžný TypeScript gate. Další krok je čisté ověření současné práce, ne přidávání další velké funkce.

## Stav po oblastech

| Oblast | Aktuální pravda |
|---|---|
| Auth, workspace a role | **Pilot-ready pro ověřené cesty.** Server kontroluje session, membership, workspace a role; RLS je zapnuté na kontrolovaných public tabulkách. |
| Leads, produkty, hovory a objednávky | **Pilot-ready pro pokryté workflow.** Zápisy jdou přes serverovou DAL/Server Actions, důležité vztahy se kontrolují a ověřené zápisy přežívají reload. |
| Orders | **Rozpracování je v pokročilé fázi.** Existují full-page create/detail/edit, lifecycle statusy, položky, historie a lokální oprava hydration/legacy driftu. Ověření a handoff order slice ještě zbývá. |
| Operator Console | **Funkční pilotní pracovní plocha, další hlavní produktová etapa.** Queue, assignment, callback routing a recovery jsou ověřené; vizuální a informační redesign je stále před námi. |
| Callbacky a kalendář | **Pilot-ready pro schválený model.** Callbacky a osobní reminders jsou oddělené; splatný callback nepřeruší aktivní hovor a při obsazeném preferovaném operátorovi přejde jinam. |
| Product Scripts — základ | **Uzavřený základ.** Administrator editor, workspace ownership, sanitizace, RLS a read-only Operator Console cesta jsou ověřené. |
| Product Scripts — verze/publish/archive | **Implementačně uzavřeno, runtime smoke zbývá.** Remote i lokální migration soubory používají `20260822114853`, `20260822115016` a `20260822120928`; `archived` je sjednocený v SQL, typech, DAL i UI. Změna je v pushnutém commitu `baabfc3`. |
| Training | **Session-only pilot.** Uložené review je oddělené od CRM; fyzický mikrofon, SpeechRecognition a skutečné TTS/barge-in nejsou potvrzené. |
| AI Copilot, enrichment a follow-up | **Preview nebo unavailable.** Gemini a externí dispatch se nesmí tvářit jako produkční integrace. Chyba nemá být nahrazena vymyšlenými daty. |
| Telephony | **Provider-neutral simulátor s opraveným lifecycle.** Zrušení, audio failure a cleanup jsou ošetřené; skutečný telefonní/inbound provider, webhooky a transkripce nejsou zapojené. |
| Analytics, Monitor a dashboard activity | **Částečné.** Některé metriky jsou databázové nebo pravdivě unavailable, ale živá presence, leaderboard, aktivita a část KPI ještě nejsou jednotně produkční zdroj pravdy. |
| Automatické testy | **22/22 Vitest testů prošlo.** Pokrývají sanitizaci Product Scriptů, lifecycle softphonu a training HTTP kontrakty; nepokrývají celé CRM a RLS workflow. |

## Co je teď nejdůležitější

1. Ověřit Product Script draft → publish → reload v přihlášeném browseru a role read-only relaci; migrace znovu nespouštět.
2. Obnovit čistý dependency/quality gate bez recovery složek a oddělit necommitované docs/dependency změny od produktových commitů.
3. Z pracovní větve udělat čistý, ověřený handoff pro order detail fix (`7a6a0ea`) a následně ho publikovat podle výsledku review.
4. Přidat pilotní E2E gate pro kritická workflow.
5. Teprve potom řešit nový Operator Console redesign podle state mapy a briefu.

## Co jsem při auditu ověřil

- Live Supabase má 1 organizaci, 1 workspace, 3 membership řádky a kontrolované tabulky mají zapnuté RLS.
- Remote migration history obsahuje order lifecycle/edit, Product Scripts i tři Product Script version migrations. Poslední remote verze je `20260822120928` a lokální soubor má stejný název; stavový model i migrace jsou v `baabfc3`, browser proof ještě zbývá.
- `product_script_versions` je na live projektu prázdná; nezůstal v ní testovací fixture.
- Security advisor hlásí jeden externí warning: vypnutou ochranu proti uniklým heslům. To je nastavení Supabase projektu, ne bezpečná SQL zkratka v repozitáři.
- Performance advisor hlásí několik chybějících indexů a duplicate permissive policy warnings. Řešit je až samostatným, změřeným databázovým commitem.
- `npm test -- --run` prošel jako 22/22.
- `npm run lint` prošel a `npm audit --omit=dev --audit-level=high` hlásí 0 zranitelností. Filtrovaný TypeScript check zdrojů prošel pro 173 souborů; běžný `npm run typecheck` stále načítá rozbité `node_modules-recovery-*` složky z globálního include a proto není platným zeleným gate. Build po čisté instalaci ještě zbývá.

## Priorita dalších commitů

### P0 — dokončit ověření Product Script workflow

Implementace a migration provenance jsou v `baabfc3` a pushnuté na
`feat/order-detail-edit`. Zbývá create draft → reload → publish → Operator
Console read v přihlášeném browseru, role smoke a SQL kontrola bez fixture dat.

### P0 — obnovit opakovatelný ověřovací základ

**Gate/commit podle výsledku: `chore: verify clean dependency and quality gates`**

- čistá instalace z lockfile,
- žádné recovery složky, generované výstupy ani Playwright artefakty ve staged změnách,
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`,
- dependency audit bez nových zranitelností.

Framework dependency hardening už má lokální commit `f200078`; tento bod je nyní release gate pro čistou instalaci a ověřitelný checkout. Nemá opravovat náhodné aplikační chyby. Pokud gate odhalí kódový problém, vznikne samostatný fix.

### P1 — uzavřít order lifecycle a publikovat větev

**Commit: `fix: verify order detail lifecycle against persisted data`**

Nejdříve ověřit, že lokální změna `7a6a0ea` skutečně řeší hydration a legacy edit drift pro nový, odeslaný a historický order. Pak provést create → detail → edit → status → reload → history smoke a teprve podle výsledku případně vytvořit malý follow-up commit. Nesmí se míchat s Product Scripts ani s redesignem Console.

### P1 — přidat pilotní E2E gate pro kritické workflow

**Commit: `test: add authenticated pilot smoke gate`**

Pokrytí: login/logout, role boundary, workspace isolation, claim leadu, callback fallback, start/cancel/end call, order create/edit, Product Script save/publish, reload persistence, SQL kontrola a cleanup. Test musí pracovat s jasně označenými disposable fixtures a nesmí po sobě nechávat data.

### P1 — dokončit pravdivé stavy zbývajících obrazovek

**Commit: `fix: isolate remaining non-production surfaces`**

Projít dashboard activity/KPI, monitor, leaderboard, telephony preview, AI preview, follow-up/paylink a lokální preference. Produkční data nesmí pocházet z `localStorage` ani z fallbacku po chybě; uživatelské preference mohou zůstat lokální, ale musí být takto pojmenované.

### P1 — Operator Console redesign

**Commit: `feat: redesign operator console around explicit states`**

Nejdřív state map pro před-call, in-call, post-call, callback, pauzu, chybu a recovery. Zachovat pořadí `call controls → Product Script → customer/timeline/order context`; nevracet do Console prvky, které jen vypadají chytře, ale nemají skutečná data. Redesign neřeší telephony providera ani nové AI funkce.

### P2 — databázové indexy a policies

**Commit: `perf: reconcile Supabase indexes and permissive policies`**

Nejdřív zjistit, které indexy se skutečně používají, potom přidat chybějící foreign-key indexy a sloučit pouze policies, které mají stejný účel. Security advisor a performance advisor se musí po migraci znovu přečíst. Leaked Password Protection zůstává mimo repozitář jako externí nastavení/plánový blocker.

### P2 — skutečná telephony a messaging integrace

**Commit: `feat: connect approved telephony provider`**

Až po stabilním pilotním gate: provider, inbound, webhooky, idempotence, audio/transkripce, error recovery, nákladové limity a audit. Do té doby používáme slova simulace, preview a unavailable.

## Nové desatero pro Codex

1. **Nejdřív pravda, potom dojem.** Build nebo hezký screenshot není důkaz. U každého důležitého tvrzení uvádíme, zda pochází z kódu, browseru, SQL nebo živého nastavení.
2. **Jeden commit = jeden problém.** Feature, refactor, dependency upgrade, migrace a úklid artefaktů se nemíchají jen proto, že byly po ruce.
3. **Před kódem schválíme malý plán.** Cíl, ne-cíle, dotčené vrstvy, rizika, akceptace a ověření musí být jasné dřív, než se začne psát.
4. **Každý nový chat začíná kontrolou checkoutu.** `git status`, větev, HEAD, remote, diff, migrace a relevantní dokumentace mají přednost před starou konverzací.
5. **Oprávnění patří na server a do databáze.** UI může něco skrýt, ale nesmí být jedinou ochranou. Každý zápis kontroluje session, workspace, roli a vlastnictví vztahů.
6. **Supabase je zdroj pravdy pro produkční data.** `localStorage`, in-memory stav a demo fallback jsou jen preference nebo explicitní simulace; nikdy se nesmí vydávat za uložený CRM stav.
7. **Zápis se počítá až po reloadu.** Kritická změna potřebuje skutečný přihlášený browser, SQL kontrolu, reload a úklid fixture dat.
8. **Simulace se nepřevléká za integraci.** Pokud nemáme providera, webhook nebo skutečný stream, UI řekne `simulation`, `preview` nebo `unavailable`.
9. **Migrace musí mít původ a bezpečnou historii.** Před změnou porovnat local/remote history, po změně ověřit RLS, grants, policies, funkce, advisories a typy. Nic znovu nespouštět naslepo.
10. **Končíme čistým handoffem.** Na konci je přesný seznam změn, ověřovací výsledek, známé mezery, staging jen relevantních souborů a žádné tvrzení silnější než důkaz.

## Pravidlo pro další sezení

Pokud nový úkol nesouvisí s P0/P1 bodem výše, nejdřív vysvětlit, proč má přednost. Bez toho nepřidávat další velkou funkci do projektu, který ještě uzavírá současnou rozpracovanou práci.
