# Countdown CRM — balíček dalších pracovních slice

**Datum:** 2. 9. 2026  
**Výchozí commit:** `c1799c1` (`main`, `fix: enforce manager-only wallet configuration`)
**Status:** slices 1–4 implementačně uzavřené; live manager/RLS evidence zůstává samostatnou bránou

Tento dokument vybírá několik konkrétních částí z historické roadmapy a
převádí je do nejbližšího doručitelného pořadí. Neznamená schválení live
migrací, produkčního deploye ani externí integrace. Pro obecný kontext platí
[`PROJECT.md`](../PROJECT.md); historické etapy zůstávají v
[`roadmap.md`](roadmap.md).

## Výchozí stav

Aktuální repo gate je zelený:

- `npm test` — 30 souborů, 126 testů;
- `npm run lint`;
- `npm run typecheck`;
- `npm run build`;
- build vygeneroval 25 statických stránek a aktuální route mapu.

To potvrzuje konzistenci repozitáře, ne live persistence, RLS, concurrency ani
napojení providerů. Poslední feature slice přidal Customer 360 retention,
vysvětlitelný Next Best Action, Team Leader Daily Brief a User Wallet MVP.

## Checkpoint po ověření slice 1–4 — 2. 9. 2026

Autentizovaný Operator průchod přes lokální aplikaci a připojený Supabase
workspace proběhl pro `claim → start → order → reload`. Po dokončení se nyní
zobrazí post-call souhrn i v případě, že není k dispozici další assignment;
regrese je pokrytá v `tests/workflow-ui-contract.test.ts`.

SQL read-back potvrdil vazby callu, objednávky, položky, status history a
queue eventu na stejný workspace, lead a operátora. Po reloadu byl order detail
dohledatelný jako `Completed` včetně položky a historie. Nová DB migrace navíc
automaticky zapsala `CALL_COMPLETED` a `ORDER_CREATED_FROM_CALL` do audit logu;
ověřovací pokus vložit položku v jiné měně byl odmítnut triggerem. Dočasná data
byla odstraněna a původní lead/queue stav obnoven.

Preview migration provenance je zapsaná jako `20260902130804`
(`completion_audit_and_currency_contract`) a `20260902130906`
(`harden_order_currency_updates`).

Lokální regresní suite pokrývá re-order deduplikaci poslední fulfilled
objednávkou, Wallet Settings boundary a oddělení analytics částek podle měny.
Živá relace byla Operator; pozitivní Team Leader/Administrator browser průchod
a plný RLS/concurrency důkaz proto zůstávají otevřené. Starší mismatch
`orders.currency = USD` versus položka `CZK` byl opraven na `CZK` a změna byla
zapsána jako `ORDER_CURRENCY_REMEDIATED`; následná kontrola vrátila
`currency_mismatches = 0`.

Poslední commit `c1799c1` zpřísnil databázové čtení wallet konfigurace na
Team Leadera/Administrátora pomocí workspace-manager guardu. UI, Server Action,
DAL a RPC tedy mají stejnou hranici; její pozitivní browser ověření je stále
čekající evidence, nikoli další implementační slice.

## Navržené pořadí

### 1. Pilot evidence gate pro call → outcome/order

**Typ:** důkazní/stabilizační slice, bez nové funkce.

Uzavřít největší otevřenou mezeru v současném baseline: autentizovaný průchod
`claim → start → outcome → order/callback → reload → timeline → SQL read-back`.
Součástí má být také negativní role/workspace scénář a kontrola, že selhaný
start nebo opakovaný submit nevytvoří falešný call či order.

**Akceptace:**

- Operator dokončí call-based order přes aktuální serverovou cestu;
- po reloadu je dohledatelný call, order, položky, audit a timeline;
- callback a neúspěšný/cancelovaný start mají očekávaný queue stav;
- Team Leader/Administrator projde povolenou obrazovku a Operator je
  odmítnut na chráněné mutaci;
- přímý SQL read-back potvrdí workspace a actor attribution;
- testovací fixture data jsou po ověření odstraněna a výsledek je zapsán do
  nového checkpointu.

**Mimo scope:** live telephony, inbound provider, `db push` bez samostatného
schválení, změna call completion RPC.

### 2. Re-order truthfulness: poslední fulfilled objednávka

**Typ:** malý produktový korekční slice.

Upravit `getReorderOpportunities`, aby pro dvojici `lead_id + product_id`
vycházel pouze z poslední relevantní fulfilled objednávky. Starší objednávka
nesmí vytvořit urgentní nebo due-soon doporučení poté, co zákazník stejný
produkt objednal znovu. Zachovat současné omezení na `completed`/`delivered`,
14denní okno a explicitní heuristický label.

**Akceptace:**

- přibude regresní test pro starou a novější fulfilled objednávku stejného
  produktu;
- cancelled/returned záznam se sám nepovažuje za fulfilled objednávku a jeho
  vliv na předchozí nákup je pokrytý explicitním pravidlem;
- doporučení zůstane workspace-scoped přes existující DAL;
- Next Best Action a Customer 360 nezačnou tvrdit, že jde o predikci nebo live
  AI;
- repo gate projde včetně `git diff --check`.

### 3. Wallet boundary: nastavení do Settings, Wallet jako přehled

**Typ:** navazující produktový slice + live důkazní brána. Implementace je hotová.

Přesunout globální měnu, sazbu provize a bonus thresholds z manažerského panelu
na `/wallet` do administrační části `/settings`. Ve Wallet ponechat finanční
přehled a auditovanou ruční úpravu pro Team Leadera/Administrátora. Operator
nadále uvidí jen vlastní ledger.

Implementace musí zachovat stejné omezení v UI, Server Actions, DAL i RPC.
Fulfillment `delivered`/`returned` a měsíční settlement zůstanou service-role
hranice; tento slice nemá předstírat webhook ani bankovní payout.

**Akceptace:**

- Administrator nastavení uloží a po reloadu je vidí;
- Team Leader může provést pouze povolenou ruční auditovanou úpravu;
- Operator nevidí globální nastavení, týmové zůstatky ani mutation controls;
- role/RLS smoke potvrdí vlastní ledger a odmítnutí cizího ledgeru;
- změna pravidla nepřepíše immutable historické transakce;
- migration provenance pro aktuální Preview je doložená; pozitivní manažerský
  browser/RLS smoke zůstává před pilotem samostatnou bránou.

### 4. Analytics currency contract

**Typ:** rozhodovací/technický slice před širším pilotem. Implementace je hotová.

Rozhodnout a vynutit, zda workspace používá jednu měnu, nebo zda analytics
potřebují měnové rozlišení. Současný denní summary i hlavní analytics sčítají
částky jako čísla a část UI používá implicitní `$`, přestože Wallet podporuje
`CZK`, `EUR` a `PLN`.

**Akceptace:**

- buď je serverově vynucena jedna workspace měna a UI ji vždy zobrazuje,
  nebo analytics vrací částky po měnách;
- daily brief, KPI, export a wallet používají stejný kontrakt;
- test pokryje smíšené měny a zabrání tichému finančně zavádějícímu součtu;
- forecast zůstane `Unavailable`, dokud nebude existovat skutečný zdroj.

## Co nyní nevybírat z historické roadmapy

- live telephony/inbound a audio transcription;
- live supervisor monitoring a presence stream;
- e-mail, WhatsApp, SMS pay-link a fulfillment provider;
- obecný AI copilot nebo „predictive“ model bez uloženého zdroje;
- velký redesign mimo aktuální Operator Console workflow.

## Pracovní pravidlo

Implementace slices 1–4 je hotová a ověřená lokálním gate i Preview smoke.
Další krok je získat Team Leader/Administrator relaci pro pozitivní browser,
RLS a wallet persistence důkaz. Měnový mismatch je nyní opravený a chráněný
databázovými triggery, bez skrytého přepočtu.
