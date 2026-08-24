# Countdown CRM — aktuální stav a desatero

**Snapshot:** 24. 8. 2026<br>
**Větev:** `chore/close-pilot-readiness-gate`<br>
**Base:** `origin/main` na `02267fe fix: prevent settings hydration mismatch`<br>
**Pracovní strom:** quality gates a read-only browser smoke dokončené<br>
**GitHub:** otevřený draft PR #6 `chore: document pilot readiness gate`

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
- Globální status v sidebaru (`Ready for Calls` / `On Break`) je v aktuálním
  buildu pouze session-local UI. Změna se po reloadu vrátí na výchozí hodnotu;
  není to důkaz zápisu do `operator_presence`.
- `NEXT_PUBLIC_ALLOW_DEMO_AUTH=true` je pouze lokální vývojová výjimka. Nesmí
  být zapnutá ve sdíleném stagingu ani v produkci.

## Aktuální stav Git a Supabase

Lokální checkout nyní obsahuje 55 migration souborů, poslední je
`20260823041802_profile_backfill_and_auth_trigger.sql`. Supabase CLI
`2.115.0` v read-only příkazu
`npx supabase migration list --project-ref qlzrsookyobtvyekhrqi --linked`
potvrdilo 52 live záznamů proti 55 lokálním. Po doplnění doložené baseline a
čtyř live-only migrací se přesně shoduje 28 verzí; zbytek tvoří historické
přejmenování, posunuté timestampy a lokální order migrace bez jednoznačného
live protějšku. Prvních osm workspace migrací nyní používá live verze a původní
názvy má zachované v názvu souboru; devátý seed byl zařazen na místo, kde ho
live historie skutečně uvádí.

Tento drift je skutečný a nesmí se automaticky "opravovat" přejmenováním,
novou migrací ani opakováním aplikace migrací.

Původně live-only položky `countdown_crm_base_schema`,
`push_reminder_notifications`, `push_subscription_user_index`,
`operator_presence_heartbeat` a `profile_backfill_and_auth_trigger` jsou nyní
zachycené v lokálních souborech pod přesnými live verzemi. Baseline byla
rekonstruována z historického schématu v commitu `9f9dfe4`; push migrace byly
dohledány v archivní větvi a heartbeat/Auth SQL bylo ověřeno read-only diffem.

Zbývající drift není bezpečné sloučit podle názvu naslepo. Lokální-only nebo
jinak pojmenované položky stále zahrnují
`20260821102718_allow_operator_orders_for_current_lead`,
`20260821104557_order_items_and_atomic_create` a
`20260821151606_order_item_minimum_pricing`; další rozdíly jsou ve
verzi/názvu, například `order_status_history_and_updates`. Live schema diff
po nové baseline ukazuje ještě rozdíly v některých RPC funkcích, oprávněních a
`audit_logs.workspace_id`; ty zůstávají samostatným reconciliation krokem.

Docker Desktop byl následně spuštěn a read-only `supabase db diff` byl
vyzkoušen v obou směrech. Po doplnění baseline a doložených live-only migrací
lokální replay projde od prázdné databáze až do poslední migrace. Původní
problém byl, že `20260809_0002_workspace_scope_business_data.sql` očekává
`public.leads`, ale žádná předchozí lokální migrace tuto tabulku nevytvářela.
Základní definice `leads`, `products`, `calls` a `orders` přitom existují v
tracked souboru `supabase/schema.sql`, který není součástí běžného replaye
adresáře `supabase/migrations`. Schema diff tedy není zablokovaný Dockerem, ale
chybějící nebo nejasně připojenou lokální baseline.

Čerstvý live inventory ukazuje, že `20260810071051|countdown_crm_base_schema`
je v souladu právě s touto základní vrstvou. Řada dalších live řádků má stejné názvy
jako lokální migrace, ale jiné verze, například `atomic_call_completion`,
`training_sessions`, `lead_notes` a `order_status_history_and_updates`.
Live-only názvy `push_reminder_notifications`,
`push_subscription_user_index`, `operator_presence_heartbeat` a
`profile_backfill_and_auth_trigger` zatím nemají lokální soubor. Live schéma
zároveň obsahuje `order_items`, `create_order_with_items` a kontrolu
`minimum_unit_price`, tedy funkcionalitu z lokálních order migrací; přesný
původ těchto změn v live history ale zatím nelze bezpečně určit.

Z toho plyne, že část rozdílu `52 vs. 55` tvoří posunuté verze nebo názvy a
část tvoří nyní zachycené historické live-only migrace. Základní replay je
opravený, ale provenance není ještě čistá: zbývá rozhodnout, které lokální
order/RPC soubory jsou skutečné změny a které historické aliasy. V tomto
průchodu nebyla spuštěna žádná migrace,
`migration repair`, `db push`, `apply_migration` ani SQL zápis.

## Read-only investigace nových účtů

Read-only důkazy zatím neukazují, že by nejnovější Auth účty byly příčinou
rozdílu v migration history. Jeden nový
operátor je potvrzený a má poslední přihlášení, druhý je zatím nepotvrzený a
nemá žádné přihlášení. U obou existuje odpovídající profil s rolí `operator` a
membership v `Main workspace` se stejnou rolí. Administrátorská stránka
`/team` zobrazila oba členy bez console error.

U obou profilů je `profiles.created_at` přesně
`2026-08-23 04:18:02.053751+00`. Live migration `20260823041802` se jmenuje
`profile_backfill_and_auth_trigger` a databáze má trigger
`on_auth_user_created_profile` na `auth.users`, který volá
`private.handle_new_auth_user_profile()`. Funkce vkládá profil, pokud ještě
neexistuje. To silně ukazuje na backfill/trigger událost v live databázi, která
doplnila profily po vytvoření účtů; není to důkaz, že vytvoření účtu změnilo
tabulku `supabase_migrations.schema_migrations`. Na `profiles` ani
`workspace_members` nebyl nalezen vlastní trigger, takže původ membershipu
zůstává z tohoto průchodu neprokázaný.

Anonymní kontrola aktuálního serveru vrátila `307 /login` pro `/workspace` i
`/calls` a `401 Unauthorized` pro `/api/training/reviews`. Vlastní přihlášenou
relaci potvrzeného nového operátora jsme následně použili read-only. `/workspace`
ukázal `mikestudio / Operator` a bezpečný stav „čeká na přiřazení“, `/leads`
správně nepovolil adresář leadů, `/orders` ukázal 0 vlastních objednávek,
`/team` správně zobrazil omezení pro Team Leader/Administrator a `/settings`
zachovalo 80 % po reloadu. Všechny tyto trasy doběhly bez console error.

**Závěr:** problém s novými účty se jeví jako samostatná Auth/profile/
membership otázka. Migration drift je samostatný problém historie a
provenance. Přímá příčinná souvislost mezi vytvořením účtu a rozdílem `52 vs.
55` nebyla prokázána. Nejmenší bezpečný další slice je projít zbývající RPC,
oprávnění a lokální order aliasy; historii není bezpečné opravovat podle
samotných timestampů. Role-only a cross-workspace negativní důkaz zůstává
oddělený.

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
| Live migration history přes CLI | **neprošla jako clean gate** | 52 live vs. 55 lokálních; 28 přesných verzí, zbytek jsou renamed/version-shifted položky a lokální aliasy |
| Live schema diff přes CLI | **replay prošel, diff zůstává** | Docker běží; obousměrný replay už nepadá na `public.leads`; zbývá rozdíl v RPC funkcích, oprávněních a `audit_logs.workspace_id` |
| Nové Auth účty / profile / membership | **prošlo read-only** | 2 nejnovější účty mají profil a `operator` membership v `Main workspace`; jeden je nepotvrzený |
| Auth trigger / backfill evidence | **prošlo read-only** | live trigger i migration `profile_backfill_and_auth_trigger` existují; account insert nemá důkaz změny migration history |
| Vlastní přihlášený operator smoke | **prošel read-only** | `mikestudio / Operator`; workspace čeká na přiřazení, lead directory a team operations jsou správně omezené, settings 80 % přežilo reload |
| Live RLS inventář cílových tabulek | **prošel** | RLS je enabled a dashboard ukazuje policies; nenahrazuje role-by-role negativní proof |
| Přihlášení a workspace | **prošlo** | `/login` přesměroval na `/workspace`; Administrator `majkito.studio`, workspace a aktuální lead se načetly bez console error |
| Read-only pilotní workflow | **prošlo** | Product Script fallback; 4 leady a detail; order create prefill bez uložení; 8 objednávek před i po reloadu; order detail, status history a legacy read-only stav |
| Read-only reload persistence | **prošlo** | `/orders` zůstal na 8 položkách a `/settings` zachovalo uložených 50 % po reloadu |
| Anonymní serverová hranice | **prošla** | `/workspace`, `/calls`, `/team` a `/training/reviews` vracejí redirect na `/login`; API vrací `401 UNAUTHORIZED` |
| Administrator read autorizace | **prošla** | `/team` načetl workspace queue a members přes uživatelskou Supabase session; bez zápisu a bez console error |
| Controlled DB persistence → reload → cleanup | **prošlo** | syntetická note se po async reloadu objevila, přesný řádek byl ověřen v SQL a po smazání měl SQL i UI nulový zbytek |
| Cross-workspace / role negativní RLS test | **neověřeno** | k dispozici byla pouze Administrator relace a žádný read-only SQL/MCP přístup |

Quality gates jsou po čisté instalaci zelené s výjimkou tří neblokujících
lint warningů. Přihlášené read-only workflow, controlled persistence a jeho
cleanup jsou ověřené. Tento snapshot ale **neprohlašuje interní pilot za
připravený**: základní replay je opravený, ale migration provenance stále není
srovnaná a chybí negativní cross-workspace/RLS důkaz pro jednotlivé role.

### Controlled fixture evidence

Syntetická note `Pilot readiness smoke 2026-08-24 — cleanup` byla vytvořena
pro lead `3b0939d2-ee63-4fba-b612-ca68339c184f`. Po reloadu se objevila v UI,
jakmile doběhl asynchronní seznam přibližně za pět sekund, a přesný řádek byl
ověřen v `public.lead_notes`. Následné smazání bylo provedeno s explicitním
potvrzením; follow-up SQL vrátilo 0 řádků a nový reload `/workspace` ukázal
`Note history 0`. Fixture nezůstala v databázi.

### Live RLS inventory

RLS je enabled a dashboard ukazuje policies na těchto pilotních tabulkách:
`audit_logs` 2, `calls` 3, `lead_queue_events` 1, `lead_queue_items` 1,
`leads` 4, `operator_presence` 1, `order_items` 4, `order_status_history` 1,
`orders` 3, `product_script_versions` 3, `product_scripts` 3 a `profiles` 2.
Jde o live schema/policy inventář, ne o náhradu autentizovaného negativního
testu každé role a cizího workspace.

## Doporučené pořadí commitů

Každý bod níže je jeden tematický commit. Nepřidávat do něj nesouvisející UI
nebo novou funkci jen proto, aby byl commit větší.

1. **P0 — srovnat Git a živé migrace**

   `chore: reconcile repository and remote migration history`

   Baseline a čtyři doložené live-only migrace jsou nyní v repozitáři a replay
   od nuly prochází. Inventory stále ukazuje 52 live vs. 55 lokálních položek a
   28 přesných verzí. Další krok je rozlišit zbývající renamed/version-shifted
   položky, order aliasy a RPC/oprávnění rozdíly. Bez slepého přejmenování,
   `migration repair`, `db push` nebo generování jedné obří follow-up migrace.

2. **HOTOVO — uzavřít dependency/security audit**

   `chore: upgrade Next.js and close production dependency audit`

   Next.js a související balíčky jsou konzistentní s lockfile. Po čistém
   `npm ci` prošly testy, lint, typecheck, build i produkční audit s nulou
   zranitelností. Supabase security nastavení mimo repozitář zůstává součástí
   budoucího live read-only průchodu.

3. **P0 — udělat čerstvý důkaz přihlášeného pilotu**

   `test: verify authenticated pilot workflows against Supabase`

   Login, workspace, leady, order prefill, seznam/detail objednávek a settings
   reload jsou ověřené v Administrator relaci; nyní prošel i vlastní read-only
   smoke potvrzeného `Operator` účtu. Controlled note vytvoření, reload, SQL
   readback a nulový cleanup také prošly. Zbývá negativní test cizího
   workspace nebo jiné role; neuvádět hesla.

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
