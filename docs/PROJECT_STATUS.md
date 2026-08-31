# Countdown CRM — aktuální projektový status

**Ověřeno:** 31. 8. 2026
**Repo baseline:** `main` / `origin/main` / `e307aa7`
**Release status:** stabilizace před bezpečným interním pilotem

Tento dokument je jediný aktuální zdroj pravdy pro rozhodování o směru
projektu. Historické audity, staré roadmapy a commitové katalogy jsou podklady,
nikoli dnešní důkaz.

## Krátký stav

Countdown CRM má funkční workspace-scoped základ: autentizaci, role, frontu
leadů, lifecycle hovoru, objednávky, Product Scripts, workflow/Blueprint
infrastrukturu, training, reminders a týmové přehledy. Nejnovější slices
Wallet, Next Best Action, Team Leader Daily Brief a Customer 360 jsou v kódu a
mají statické testy; jejich živá persistence, browser role průchod a RLS se
samostatně nedokládají.

Produkt není označený jako obecně produkčně připravený. Hlavní otevřená brána
je autentizovaný call/order průchod s reloadem a SQL read-backem, doplněný o
negativní role/cross-workspace a živý RLS důkaz.

## Co je potvrzené

### Repo a automatické kontroly

| Vrstva | Stav | Důkaz |
|---|---|---|
| Testy | prošlo | `npm test`: 29 souborů / 121 testů |
| Kvalitativní gate | prošlo | `npm run check`: lint, typecheck, production build |
| Diff kontrola | prošlo | `git diff --check` |
| Git baseline | čistý před tímto docs branchem | `main` a `origin/main` na `e307aa7` |

### Implementovaný produktový základ

- Auth přes Supabase a serverové ověření uživatele, membership a workspace
  role (`operator`, `team_leader`, `administrator`).
- Serverem řízená fronta leadů, claim, start/cancel/recovery, heartbeat,
  outcome, callback a objednávkový lifecycle.
- Workspace-scoped Products, Leads, Calls, Orders, notes, reminders,
  Product Scripts, training sessions, review, workflows, Blueprints a EAV
  custom objects.
- Operator má u custom objects stabilní `forbidden/unavailable` hranici;
  manager/admin mutace jsou chráněné serverovou rolí.
- Workflow engine rozlišuje `success`, `failure`, `simulation` a
  `unavailable`; browserová testovací simulace není produkční event source.
- Wallet MVP (`c9fa3b8`) používá immutable ledger, server-authoritative
  fulfillment boundary a service-role settlement boundary. Nemá zatím
  připojený fulfillment provider ani live persistence/RLS smoke.
- Next Best Action (`ddc3886`) je deterministický výběr z callbacků a reorder
  příležitostí; není to live AI rozhodnutí.
- Team Leader Daily Brief (`70e7e96`) a Customer 360 retention playbook
  (`e307aa7`) skládají přehled z již autorizovaných workspace dat; nejsou
  důkazem nového live datového zdroje.

## Důkazní matice

| Oblast | Potvrzeno | Zůstává otevřené |
|---|---|---|
| Repo gate | 29/29 souborů, 121/121 testů; lint/typecheck/build prošly | nic v tomto baseline |
| Admin browser + reload | lead note se po reloadu vrátila; odpovídající SQL row byla načtena v Preview/Sandbox | call/order completion cesta |
| Call/telephony | aplikace pravdivě vrátila `Audio session could not be initialized` | živý audio/telefonní provider a plný outcome průchod |
| Operator authorization | custom-object denial na `/objects/deals` po reloadu, bez controls/dat a s čistou konzolí | pozitivní manager smoke a přímý live RLS denial |
| RLS | lokální rollback-scoped pgTAP: 46/46; společný policy test: 58/58 | live cross-workspace denial a aplikace aktuální policy migrace do schváleného targetu |
| Blueprint | Preview/Sandbox apply + reload + SQL read-back; produkční infrastruktura načtena bez aktivace blueprintu | produkční aktivace a širší pilotní persistence |
| Wallet/NBA/Daily Brief/Customer 360 | kód a focused statické testy | authenticated browser, reload persistence a live RLS pro nové plochy |

Browser, persistence, authorization a RLS jsou samostatné brány. Zelený build
ani test existence nenahrazuje živý důkaz.

## Otevřené priority

1. **P1 — pilotní workflow důkaz:** s autorizovaným účtem projít workspace,
   claim/start, outcome nebo order, reload a SQL read-back; zachytit také
   negativní role/cross-workspace scénář.
2. **P1 — provisioning a RLS rozhodnutí:** explicitně schválit target a postup
   pro aktuální policy/wallet migrace. Bez schválení se `db push` neprovádí.
3. **P2 — workflow provider boundary:** skutečné externí e-mail/SMS/webhook a
   exactly-once/retry nejsou součástí interního MVP.
4. **P2 — živé týmové funkce:** monitor, telephony sentiment, live presence a
   další externí integrace zůstávají `unavailable`, dokud nemají odpovídající
   zdroj a ověření.

## Co teď neplánujeme vydávat za hotové

- live AI Copilot, automatické AI skóre nebo sentiment z telephony;
- živou ústřednu, inbound provider, e-mail/SMS/WhatsApp dispatch;
- produkční payout nebo bankovní převod z Walletu;
- live supervisor monitoring bez skutečného realtime zdroje;
- pilot-ready nebo production-ready stav pouze na základě kódu, buildu,
  preview nebo lokálních fixture testů.

## Nejbližší pracovní krok

Po dokumentační konsolidaci následuje jeden samostatný slice: autentizovaný
pilotní call/order průchod s odděleným browser, persistence, authorization a
RLS evidence. Tento status se aktualizuje po každém kvalitativním checkpointu,
ne po každém drobném commitu.

## Pravidla pravdivosti

1. `success` znamená dokončený a ověřený efekt; `simulation`, `unavailable`,
   `failure` a `forbidden` zůstávají odlišné stavy.
2. Workspace a role se určují na serveru, ne z hodnot dodaných klientem.
3. Zápis je pro pilot důkazem až po reloadu a podle potřeby read-only SQL
   kontrolou.
4. Lokální testovací fixture není live databáze a browser smoke není RLS důkaz.
5. Každý další slice má vlastní branch, focused commit, ověření a jasný Git
   handoff. Podrobný postup je v [`WORKFLOW.md`](WORKFLOW.md).

## Zdrojová mapa

- Proces práce: [`WORKFLOW.md`](WORKFLOW.md)
- Aktuální architektura: [`architecture.md`](architecture.md)
- Budoucí práce: [`roadmap.md`](roadmap.md)
- Historické checkpointy a důkazy: [`checkpoints/README.md`](checkpoints/README.md)
- Dřívější snapshot s desaterem: [`AKTUALNI_STAV_A_DESATERO.md`](AKTUALNI_STAV_A_DESATERO.md)
