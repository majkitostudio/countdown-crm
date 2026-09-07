# Celoprojektový checkpoint — 7. 9. 2026

## Výsledek

Základ projektu je technicky zdravý a dosavadní implementační plán je uzavřený.
Checkpoint nenašel důvod vracet Team Leader Review nebo předchozí post-call práci
do aktivního backlogu. Našel však čtyři bezpečnostní/databázové body před pilotem,
několik pravdivostních a odolnostních mezer v hlavní pracovní smyčce a potvrzuje,
že systém zatím vůbec nemá datový ani autorizační model týmů.

Detailní a jediné pořadí další práce je v
[`docs/AKTUALNI_STAV_A_DESATERO.md`](../../AKTUALNI_STAV_A_DESATERO.md).

## Hranice a zdroje důkazu

- Repo: branch `codex/project-checkpoint`, výchozí commit `94c37c9`.
- Linked sandbox: migration history 84/84 po nasazení Team Leader Review a
  následném čistém dry-runu.
- Checkpoint nic nemění v aplikačním chování ani databázovém schématu; mění pouze
  dokumentaci.
- Výsledky linked autentizovaných smoke testů pocházejí z uzavření předchozího
  plánu. Tento checkpoint je neopakuje a nevydává je za živý Telnyx důkaz.

## Ověřený inventář

| Oblast | Výsledek |
|---|---:|
| Next.js aplikační stránky | 29 |
| Supabase migrace | 84 |
| Vitest soubory / testy | 88 / 345 |
| pgTAP soubory / testy | 8 / 154 |
| serverové DAL moduly | 29 |
| produkční build | 38 vygenerovaných rout |

Kontroly na výchozím checkpointu:

- `npm test`: PASS, 88 souborů a 345 testů;
- `npx supabase test db`: PASS, 8 souborů a 154 testů;
- `npm run lint`: PASS;
- `npm run typecheck`: PASS;
- `npm run build`: PASS;
- lokální Supabase advisors: bez nálezu.

Finální ověření dokumentační větve je zaznamenáno v části „Finální kontrola“.

## Co drží

### Produkt a role

- Role-aware vstup na serveru odpovídá zamýšleným domovským plochám.
- `/team` má server guard pro Team Leadera a administrátora.
- `/exceptions` a Team Leader Review vynucují roli a workspace na serveru; review
  má append-only revize a audit.
- Demo auth je pod environment přepínačem a dokumentace jej omezuje na lokální
  vývoj.
- Workflows, custom objects a Live Monitor své nedostupné části v samotných
  obrazovkách přiznávají.

### Data a bezpečnost

- Poslední review RPC je `SECURITY INVOKER`, má explicitní grants/RLS a linked
  pozitivní i negativní auth důkaz.
- Nové review migrace nepřidaly seedy, role ani Vault secrets.
- Idempotentní post-call hranice, audit a workspace guardy mají automatizované
  pokrytí.

### Runtime

- Calendar, Exception Queue, Workspace Readiness, Wallet a Conversation Brief už
  používají částečně odolné načítání přes `Promise.allSettled`.
- Team Leader Review pravdivě zobrazuje, když historický hovor nemá uloženou verzi
  skriptu nebo transcript; data nedopočítává.

## Nálezy

### P0 — databáze a bezpečnost

1. **Linked schema drift není uzavřený.**
   `supabase db diff --linked --schema public` skončil úspěšně a neobsahoval
   destruktivní příkaz, ale vypsal rozdílné definice devíti starších funkcí:
   `add_wallet_manual_adjustment`, `apply_blueprint_for_workspace`,
   `complete_call_with_order_items`, `create_product_script_draft`,
   `finalize_wallet_monthly_commission`, `get_wallet_balances`,
   `heartbeat_operator_presence`, `publish_product_script_version` a
   `record_order_fulfillment_event`. Jde o drift k vysvětlení, nikoli souhlas s
   automatickou opravou.
2. **Linked Security Advisor hlásí sedm WARN.** Jeden se týká rozšíření `pgtap` v
   public schématu, pět autentizovaně volatelných `SECURITY DEFINER` funkcí
   (`add_wallet_bonus_rule`, `add_wallet_manual_adjustment`,
   `complete_call_with_order_items_idempotent`,
   `complete_lead_call_with_order_items_idempotent`, `update_wallet_settings`) a
   jeden vypnuté leaked-password protection. Nejde o nový regresní ERROR, ale před
   pilotem musí být každý kontrakt doložen nebo opraven.
3. **Privilegovaný vzdálený runner nemá konzistentní Data API přístup.** Secret
   key zvládá Auth admin a část membership operací, ale čtení `public.workspaces`
   odmítá kvůli chybějícímu grantu. Přidat široký grant bez návrhu by zvětšilo
   bezpečnostní plochu.

### P1 — runtime a pravdivost UI

1. **Některé nezávislé zdroje jsou stále svázané `Promise.all`.** Výpadek jednoho
   může skrýt druhý v Next Best Action, Recent Context, Products, Team queue a
   Analytics. Každý kontrakt potřebuje test selhání a cílené rozdělení, ne plošnou
   mechanickou změnu.
2. **Navigace a serverová oprávnění se rozcházejí.** Team Leader může serverově na
   `/team`, ale položku „Workspace Members“ dostává jen administrátor. Sidebar a
   command palette mají navíc vlastní duplicitní konfigurace a běžným rolím
   nabízejí několik zmrazených nebo neaktivních ploch.
3. **Call Logs slibují víc, než systém garantuje.** Popis „full speech transcript
   protocols“ neodpovídá tomu, že transcript může chybět a živý transcription
   pipeline není implementovaný.
4. **Live Monitor je správně označený jako nedostupný, ale stále je nabízený v
   navigaci.** To je informační šum, nikoli funkční blocker.
5. **Dependency audit hlásí tři moderate zranitelnosti.** Přímý
   `@telnyx/webrtc@2.27.10` přináší starší `uuid` přes
   `@peermetrics/webrtc-stats`. Navržený automatický fix je major downgrade na
   starší Telnyx SDK, proto se nesmí aplikovat bez ověření. Instalace současně
   eviduje tři nepovolené install skripty (`@google/genai`, `protobufjs`,
   `unrs-resolver`), které vyžadují supply-chain rozhodnutí.

### P2 — týmový základ chybí celý

Repo ani migrace neobsahují `teams`, `team_memberships` ani `team_id`. Současné
Analytics a Team Leader Daily Brief agregují podle `workspace_id`; Exception
Queue, `/team` queue a některé výběry uživatelů jsou také workspace-wide.
Označení „team“ zde znamená roli/pohled, nikoli datově vymezené oddělení.

Z toho plyne pořadí: nejprve model členství a Team Leader scope, potom schéma,
správa, DAL/RPC/RLS a migrace dnešních agregací. Operátorské Results a porovnání
se spolupracovníky vzniknou až nad touto hranicí.

### P3/P4 — provoz a udržovatelnost

- `operator_presence` existuje, ale stav v sidebaru není důkazem serverové
  přítomnosti; Live Monitor proto nemá pravdivý živý zdroj.
- Směny, absence a přesčasy potřebují jediný kalendářový model navázaný na týmy.
- `src/app/workspace/page.tsx` má přes 1 100 řádků a kombinuje mnoho stavů a
  odpovědností. Je to konkrétní riziko dalších změn, ne důvod pro předčasný
  plošný refaktor. Training stránka je podobně velká, ale její scope je zmrazený.
- Saved views a část uživatelského UI stavu zůstávají lokální; auditní kontext,
  responsive průchod a locale/currency konzistence nejsou celoprojektově uzavřené.

## Matice role a navigace

| Role | Správný vstup | Klíčová práce | Checkpointový problém |
|---|---|---|---|
| Operátor | Operator Console | lead → hovor → outcome/callback/order | navigace nabízí i vedlejší či zmrazené plochy |
| Team Leader | Exception Queue | výjimky, queue, review, brief | `/team` je povolené, ale skryté; data nejsou team-scoped |
| Administrátor | Workspace Readiness | připravenost, členové, oprávnění, konfigurace | chybí samostatné Users & Permissions a týmy |

## Drift dokumentace, který checkpoint opravil

- staré počty 251/255 aplikačních a 92/109 databázových testů;
- smíšený seznam hotových, budoucích, blokovaných a zmrazených úkolů;
- týmová struktura vedená jako vzdálený doplněk místo základu;
- duplicitní pořadí v `PROJECT.md` a stavovém dokumentu;
- tvrzení o chybějícím negativním důkazu, přestože linked review smoke už prošel.

## Rozhodnutí o pořadí

1. P0: schema drift, privileged RPC/grants, vzdálený runner a Auth hardening.
2. P1: dílčí selhání, role-aware navigace, pravdivé copy, full-shift smoke a
   dependency gate.
3. P2: týmy/oddělení včetně správy a server/RLS hranic; až poté Results.
4. P3: presence, směny, Live Monitor a role-aware Settings.
5. P4: podpůrná kvalita obsluhy a cílená udržovatelnost.
6. Telnyx zůstává externě blokovaný; post-telephony AI a široké moduly zůstávají
   za příslušnou hranicí.

## Finální kontrola

- `npm test`: PASS, 88/88 souborů a 345/345 testů;
- `npm run lint`: PASS;
- `npm run typecheck`: PASS;
- `npm run build`: PASS, 38/38 statických výstupů;
- `npx supabase test db`: PASS, 8/8 souborů a 154/154 testů;
- `git diff --check`: PASS po odstranění formátovacího whitespace;
- změny jsou pouze dokumentační; produktové soubory, migrace a runtime konfigurace
  zůstaly beze změny.
