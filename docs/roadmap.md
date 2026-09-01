# Countdown CRM — budoucí roadmapa

Tento dokument obsahuje pouze budoucí práci. Aktuální stav a skutečně uzavřené
slices jsou v [`PROJECT_STATUS.md`](PROJECT_STATUS.md); historické návrhy jsou
v checkpoint indexu.

## Priorita 1 — uzavřít interní pilotní bránu

### Slice 1: Call/order browser + persistence

- autorizovaný workflow od workspace přes claim/start až po outcome nebo order;
- reload a read-only SQL read-back;
- pravdivý recovery/error stav při nedostupném audio provideru;
- bez tvrzení o úspěchu, pokud se efekt neuložil.

### Slice 2: Role, workspace a RLS

- schválený sandbox target a migration provenance;
- pozitivní Operator/Team Leader/Administrator cesty podle jejich scope;
- negativní cizí workspace a přímé server/RPC odmítnutí;
- oddělené live RLS a browser důkazy.

### Slice 3: Nové produktové slices

- browser, reload persistence a role evidence pro Wallet, Daily Brief,
  Next Best Action a Customer 360;
- fulfillment event a monthly settlement pouze přes schválenou service-role
  hranici;
- žádný demo účet ani historický backfill bez explicitního schválení.

## Priorita 2 — provozní spolehlivost

- doplnit skutečný provider contract pro podporované workflow actions;
- retry, idempotence a failure observability pro externí delivery;
- rozšířit live recovery/concurrency scénáře pro queue a call completion;
- udržet auditní stopu ve stejné transakci nebo v explicitním recovery modelu.

## Priorita 3 — budoucí rozšíření po pilotu

- neutrální `CustomerContext`/`LeadContext` kontrakt pro summary,
  recommendation, retention a training;
- production-safe AI Gateway/Provider/Task vrstva se strukturovanými výstupy,
  PII sanitizací, cache a telemetry;
- skutečná telephony, messaging a realtime supervisor monitoring;
- širší multi-tenant hardening a veřejný release gate.

## Trvale mimo aktuální scope

- návrat live Copilota pouze kvůli dojmu pokročilosti;
- nahrazení Supabase/Auth/RLS jiným stackem bez samostatného architektonického
  rozhodnutí;
- označení historického commitového katalogu za dnešní plán;
- tvrzení o pilot-ready nebo production-ready stavu bez důkazní matice.
