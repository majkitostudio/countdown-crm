# Countdown CRM — aktuální stav a desatero

**Snapshot:** 30. 8. 2026
**Ověřený baseline:** `origin/main` = `15a82faea289969fcd661ba6f306f71df9498b3b`
**Aktuální stav:** PR #17 a PR #43 jsou sloučené; PR #45 je OPEN/DRAFT mimo `main`
**Navazující checkpoint:** [PROJECT_POLISH_CHECKPOINT_20260826.md](PROJECT_POLISH_CHECKPOINT_20260826.md)

## Jedna věta na úvod

Jsme ve fázi **stabilizace před bezpečným interním pilotem**. Základ CRM,
workspace oprávnění, fronta leadů, objednávky a lifecycle hovoru už existují.
Nejsme ale ve fázi, kdy bychom měli bez dalšího přidávat velké funkce nebo
tvrdit, že je produkt připravený pro běžný produkční provoz.

Nejbližší práce po PR #45 je ověření tohoto atomického slice v oddělené
autentizované browser/persistence/authorization/RLS etapě a bezpečné vyřešení
migration provenance. Migration history nebyla měněna ani aplikována naslepo.

## Co je dnes skutečný základ

- Next.js 16.3.2, React 19, TypeScript, Tailwind 4 a Supabase Auth/Postgres.
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
- Starší odstranění AI copilot/enrichment/follow-up/speech-recognition zmenšilo
  prostor pro nepravdivé sliby, ale starší dokumentace je stále místy popisuje
  jako hotové; nový polish checkpoint uvádí konkrétní stale claims.

## Co je důležité nepřikrášlovat

- Product Script má workspace-scoped editor pro administrátora, draft/publish/archive
  verzování, sanitizaci a read-only zobrazení pro operátora. Pokud pro produkt
  není publikovaná verze, panel používá explicitní fallback; štítek `AI-assisted`
  není důkaz živé AI.
- Workflow pravdivost a dispatch jsou implementované a PR #17 je MERGED do
  `main` (`f1d86e1`). Live migrace, pozitivní manager browser důkaz a live RLS
  ověření z tohoto zápisu automaticky nevyplývají.
- PR #45 (`bb3d900`) je implementovaný draft slice mimo `main`: serverová DAL
  volá jediné `SECURITY INVOKER` RPC pro změnu statusu leadu nebo přesun orderů,
  které spojuje business mutaci s auditem v jedné transakci. Obsahuje kontrolu
  autentizace, workspace a manager/admin role, retry no-op/idempotency a u
  přesunu orderů transakční advisory lock. Live migrace, live persistence,
  cross-workspace autorizace a RLS tím nejsou prokázané.
- Blueprint apply je připravený v draft PR #23: serverová transakce ukládá
  stav, atributy i workflow společně; live nasazení čeká na reconciliation migrací.
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

## Aktuální stav důkazů

Současný repo baseline obsahuje 51 migration souborů, včetně order history,
Product Script versions a call-outcome recovery. Tento dokument migration
history nepovažuje za autoritativní live snapshot: nebyl proveden žádný live
SQL zápis, `db push`, `db pull`, repair ani schema reconciliation. Trackovaný
`supabase/schema.sql` je samostatně evidován jako neúplný/stale snapshot v
polish checkpointu a nemá být tiše použit jako nový source of truth.

### Provedené a ověřené na úrovni repozitáře

- Auth proxy, `getUser()`, workspace membership a většina DAL/RPC role guardů
  jsou přítomné ve zdrojovém kódu.
- Queue/call recovery kontrakt je server-owned a pracuje se stavy
  `awaiting_outcome`/`recovery_required`; UI close event není release/reassign
  mechanismus.
- Product Scripts mají administrator-only mutace, publish/archive model,
  sanitizaci a explicitní runtime fallback.
- Training/softphone/supervisor monitoring mají viditelné simulation nebo
  unavailable stavy.
- Tracked Playwright screenshots byly zachovány; nebyly mazány generated ani
  recovery artefakty.

### Provedené v kódu, ale nedostatečně ověřené pro pilot

- Workflow/Blueprint změny mají připravené serverové a idempotentní persistence
  cesty, ale skutečný business side effect není pro všechny action types doložen.
- Hlavní Operator Console completion nebyl doložen jako workflow event.
- Analytics role boundary a CSV escaping jsou již sloučené do `main`.
- Chybí čerstvý browser test s reálným Auth uživatelem, reloadem, logout/login,
  negativní rolí, cizím workspace, opakovaným submit a live RLS. Idempotence
  je nyní chráněná v kódu databázovým `event_id` klíčem.

Podrobný nálezový inventář a oddělení static/browser/persistence/authorization/
RLS evidence je v [Project Polish Checkpointu](PROJECT_POLISH_CHECKPOINT_20260826.md).

## Čerstvý delivery checkpoint — 30. 8. 2026

- Ověřený `origin/main` je `15a82fa`; PR #43 je MERGED a multi-item checkout
  je součástí `main` (`15a82fa`).
- PR #24 odstranil nepoužívaný stav Operator Console a byl sloučen do `main`
  jako `4a1b29f`.
- PR #17 je MERGED do `main` (`f1d86e1`).
- PR #45 je OPEN/DRAFT na `fix/atomic-business-audit-current-main`;
  implementační commit je `bb3d900`. Není součástí `main`.
  Předchozí implementační gate na této větvi byl 90/90 testů plus lint,
  typecheck a production build; jde o code/static evidence, nikoli o live DB,
  persistence, authorization nebo RLS důkaz.
- PR #22 popisuje bezpečný provisioning kontrakt pro sandbox a přesný seznam
  20 live-only migračních verzí. Byl sloučen do `main` jako dokumentace a
  neprovedl žádný databázový zápis.
- PR #23 převádí Blueprint apply na serverovou transakci s workspace/RLS
  ochranou a načtením stavu po reloadu. Zůstává draft do vyřešení provisioning
  hranice a následného přihlášeného browser ověření.
- PR #28 připravuje odstranění překrývajících se permissive RLS policies na
  šesti tabulkách. Zůstává draft; živé advisories se nezmění, dokud nebude
  migrace nasazena schválenou provisioning cestou.
- Přihlášený Administrator prošel read-only smoke na `/workspace`, `/leads`,
  `/orders`, `/settings` a `/team`; výsledek je v
  [ADMIN_UI_SMOKE_TEST_20260827.md](ADMIN_UI_SMOKE_TEST_20260827.md). Negativní
  Operator/cross-workspace scénáře tím nejsou nahrazené.
- Přihlášený Operator prošel stejné routy; `/leads` a `/team` vrátily pravdivý
  unavailable stav a admin-only navigace nebyla dostupná. Důkaz je v
  [OPERATOR_UI_SMOKE_TEST_20260827.md](OPERATOR_UI_SMOKE_TEST_20260827.md).
- Aktuální repozitářový gate prošel: testy, lint, typecheck, build a diff
  kontrola. Linked Supabase lint je čistý; linked migration dry-run byl
  bezpečně zastaven bez změny databáze.

## Ověření tohoto průchodu

| Kontrola | Výsledek | Poznámka |
|---|---|---|
| `npm test` | **prošlo** | 54/54 na aktuálním `origin/main`; předchozí PR #45 gate 90/90 |
| `npm run check` | **prošlo** | lint, typecheck a production build prošly; na Blueprint větvi zůstaly 2 starší warningy |
| `git diff --check` | **prošlo** | bez whitespace chyb |
| `npm audit --omit=dev --audit-level=high` | **prošlo** | 0 vulnerabilities po čisté instalaci |
| no-unused/static scan | **prošlo** | mrtvý operator status state odstraněn a PR #24 sloučen |
| browser/persistence/authorization/RLS | **neprovedeno v tomto docs auditu** | chybí přihlášená relace a live SQL evidence |
| live migration/provisioning | **neprovedeno** | PR #45 nebylo nasazeno do live DB; migration provenance zůstává otevřená |

Tento snapshot **neprohlašuje pilot za připravený**. Build/test a SQL metadata
jsou důkazy jednotlivých vrstev. Pro kritický workflow stále potřebujeme
čerstvý browser test s reálným Auth uživatelem, reloadem, SQL kontrolou,
negativními role/workspace scénáři a idempotency/recovery důkazem.

## Doporučené pořadí navazujících slices

Každý bod níže je jeden tematický commit. Nepřidávat do něj nesouvisející UI
nebo novou funkci jen proto, aby byl commit větší.

1. **DRAFT PR #45 — dokončit a důkazně uzavřít atomické business mutace a audit**

   `fix/atomic-business-audit-current-main`

   Slice je implementovaný v `bb3d900`, ale zůstává mimo `main`. Nejprve ověřit
   rollback při chybě auditu, retry/idempotency a obě RPC v přihlášeném runtime;
   teprve potom řešit migration provenance a případné live nasazení schválenou
   cestou. Do tohoto kroku nepatří nový business workflow ani obecný redesign.

2. **HOTOVO — uzavřít analytics authorization boundary**

   `fix/server-side-analytics-role-boundary`

   Přidat Team Leader/admin guard v Server Action/DAL a negativní role/workspace
   testy včetně CSV exportu.

3. **P1 — udělat čerstvý důkaz přihlášeného pilotu**

   `test: verify authenticated pilot workflows against Supabase`

   V reálném Auth účtu projít: login → workspace → claim leadu → start/cancel
   nebo dokončení hovoru → callback nebo objednávka → reload → ověření v SQL.
   Otestovat také role a zápis do cizího workspace. Zapsat přesný účet/roli,
   datum, výsledek a případné fixture cleanup; neuvádět hesla.

4. **HOTOVO, ale role-only smoke stále chybí — Product Script**

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

6. **ČÁSTEČNĚ HOTOVO — stale snapshoty, dead paths a export polish**

   Legacy training path a CSV escaping jsou uzavřené. Zbývá rozhodnout
   jak bezpečně provést fresh-schema ověření; `supabase/schema.sql` je už
   označený jako historický snapshot a nemá být použit jako provisioning
   source-of-truth. Teprve potom rozdělit největší UI soubory podle konkrétního
   workflow.

7. **P2 — sjednotit dokumentaci se skutečným produktem**

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
5. **Migrace měníme pouze po explicitním source-of-truth rozhodnutí.** Rozdíl
   mezi repozitářem a live databází evidujeme jako samostatný incident; tento
   handoff ani polish plán z něj automaticky nedělají gate pro další práci.
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

- schema provisioning contract a fresh-schema/policy proof jsou schválené;
  migration-history rozdíl má explicitní rozhodnutí a není automatickou gate;
- bezpečnostní audit nemá otevřený P0 problém;
- reálný Auth uživatel projde hlavním workflow a zápisy přežijí reload;
- role a cizí workspace jsou ověřené negativním testem;
- Product Script má jasný a ověřený zdroj pravdy;
- simulované části jsou zřetelně oddělené od produkčních záznamů;
- testy, lint, typecheck, build a dependency audit mají vysvětlený výsledek;
- dokumentace odpovídá tomu, co skutečně běží.

Do té doby je správný status: **stabilizační práce / interní pilot v přípravě**.
