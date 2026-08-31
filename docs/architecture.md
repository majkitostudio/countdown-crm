# Countdown CRM — aktuální architektonický kontrakt

Toto je současný implementační kontrakt. Historická AI vize a původní
three-panel návrhy nejsou popisem dnešního runtime.

## Kanonická cesta požadavku

```text
UI
  -> Server Action / Route Handler
  -> authenticated user + workspace membership + role
  -> server-only DAL nebo databázové RPC
  -> Supabase Postgres + RLS
```

Klient nesmí určovat aktivní workspace ani obcházet serverovou roli. Skrytí
ovládacího prvku v UI je pouze doplněk; kritická ochrana musí být v serverové
hranici a podle potřeby v RLS.

## Hlavní domény

| Doména | Současný kontrakt |
|---|---|
| Auth/workspace | Supabase Auth, membership a role `operator`, `team_leader`, `administrator` |
| Leads/queue | server-owned claim, jedna aktivní práce, lease/heartbeat a recovery |
| Calls | start, cancel/recovery, outcome, callback a dokončení přes serverovou cestu |
| Orders | workspace-scoped lifecycle, items, historie a audit |
| Product Scripts | administrator mutace, draft/publish/archive, sanitizovaný read-only operator view |
| Workflow | server dispatcher pro produkční eventy; browser emit je test-only simulation |
| Blueprint/EAV | workspace-scoped schema, records a server-authoritative apply |
| Training | oddělený session/simulation workflow; není produkční telephony |
| Wallet | immutable ledger, server-controlled fulfillment a service-role settlement |
| Insights | deterministické Next Best Action, Daily Brief a Customer 360 z autorizovaných dat |

## Pravdivé stavové hranice

Workflow execution používá tyto významy:

- `success` — efekt byl proveden a může být považován za úspěšný;
- `failure` — provedení selhalo nebo nebylo možné potvrdit;
- `unavailable` — produkční zdroj/provider není zapojený;
- `simulation` — testovací simulace bez produkčního efektu;
- `forbidden` — požadavek narazil na oprávnění; není totéž co prázdný výsledek.

`Audio session could not be initialized`, prázdný monitor, chybějící Product
Script nebo neaktivní external provider se nesmí zobrazit jako success.

## Mutace a audit

Každá citlivá mutace má ověřit autentizaci, workspace a roli před zápisem.
Business efekt a audit musí mít explicitní pořadí, transakční nebo idempotentní
kontrakt a srozumitelný failure stav. `event_id`/source event id chrání pouze
konkrétní podporované idempotentní cesty; není to obecný důkaz exactly-once
provideru.

## Databáze a provisioning

Aktuální source of truth databázových změn je migration historie po explicitním
provenance ověření. Trackovaný `supabase/schema.sql` je starší neúplný snapshot
a nesmí se používat jako čerstvý provisioning bez samostatného rozhodnutí.

`db push`, změna live migrací nebo provisioning účtů je vždy samostatně
schválená operace. Tento kontrakt sám o sobě nepotvrzuje, že lokální migrace
jsou aplikované v Preview nebo produkci.

## AI a externí služby

Aktuální produkt nepředstírá jednotný live AI Copilot. Training může používat
explicitně označený provider/simulaci; Next Best Action, Daily Brief a
Customer 360 jsou deterministické výpočty. E-mail, SMS, WhatsApp, webhook,
telephony a realtime monitoring jsou `unavailable`, dokud není zapojený,
serverově chráněný a samostatně ověřený provider.

Budoucí AI platforma může převzít z Velocity CRM vrstvy Gateway → Provider →
Task, strukturované výstupy, PII sanitizaci, cache a telemetry. Neznamená to
návrat živého Copilota do současného pilotního scope ani migraci Supabase na
Prisma.

## Ověřovací povinnost

Při změně domény musí dokumentace uvést, které vrstvy byly skutečně ověřené:
statické testy, browser, persistence, authorization/RLS, migrace a provider.
Absence chyby v buildu není důkazem žádné z těchto živých vrstev.
