# Local Telephony Verification

**Datum:** 2026-09-05  
**Rozsah:** workspace adapter, admin-only `/telephony`, lokální Asterisk/SIP laboratoř, Local SIP session lifecycle a bezpečná diagnostika  
**Prostředí:** `http://localhost:3000`, lokální Supabase, Docker Compose, skutečná přihlášená testovací operator session

## Výsledek jednou větou

Implementace Local SIP je v repozitáři připravená a lokální Asterisk běží zdravě. Automatické kontroly jsou zelené a neadmin flow je ověřený. Pozitivní admin flow a skutečný browserový audio hovor 1001 ↔ 1002 zatím nejsou potvrzené, protože aktuální browser session je operator a není připojený druhý SIP endpoint.

## Co je implementováno

- Aktivní adapter je uložený serverově na úrovni workspace v `workspace_telephony_settings`; `localStorage` není zdroj pravdy.
- Změnu adapteru může provést pouze administrátor; Telnyx zůstává viditelný, ale blokovaný.
- `/telephony` má serverový admin guard a při neaktivním Local SIP odkazuje přímo na `/settings#telephony-adapter`.
- Local SIP používá sdílený CRM session lifecycle a zapisuje bezpečné stavové eventy.
- Browserový adapter používá SIP.js `0.21.2`, runtime bootstrap má pětiminutovou platnost a SIP hodnoty se neukládají do CRM ani `localStorage`.
- Asterisk je localhost-only, má pouze interní endpointy 1001/1002 a interní dialplan bez SIP trunku/PSTN.
- Local SIP lab route přijímá pouze interní 1001/1002; skutečné číslo leada se do lokální ústředny neposílá.
- `/telephony` má stav Asterisku, endpointy, aktivní relace, poslední bezpečné eventy a kontrolovaný test 1001 → 1002.

## Automatické ověření

| Kontrola | Výsledek |
|---|---|
| `npm test` | 60 testovacích souborů, 216 testů — PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS; Next build zkompiloval nové API routes i `/telephony` |
| `git diff --check` | PASS |
| Focused telephony suite | 12 souborů, 33 testů — PASS |

Focused suite pokrývá adapter settings, RLS kontrakt, Local SIP bootstrap, provider selection, session lifecycle, Docker kontrakt, admin panel kontrakt, route authorization a regresi Telnyx/simulace.

## Docker / Asterisk read-back

`docker compose -f docker-compose.telephony.yml ps` potvrdil:

- container `countdown-crm-asterisk` je `Up` a `healthy`,
- SIP UDP, RTP UDP a HTTP/WebSocket porty jsou publikované pouze na `127.0.0.1`,
- image je `andrius/asterisk:22.10.1_debian-trixie`.

Asterisk CLI read-back potvrdil:

- endpointy `1001` a `1002` existují,
- oba endpointy jsou před připojením browseru `Unavailable`, což odpovídá očekávanému stavu,
- dialplan obsahuje pouze interní volání `1001` ↔ `1002`,
- `chan_pjsip`, `res_pjsip_transport_websocket`, `res_http_websocket` a `res_rtp_asterisk` jsou `Running`.

## Supabase read-back

`npx supabase migration list --local` ukázal shodnou lokální i vzdálenou historii včetně migrace `20260905052514`.

Autentizovaný/CLI read-back lokální databáze potvrdil:

- tabulky `workspace_telephony_settings` a `telephony_call_sessions` existují,
- `workspace_telephony_settings` obsahuje `workspace_id`, `active_adapter`, `updated_by`, `created_at`, `updated_at`,
- existují tři očekávané policy pro workspace read a admin insert/update,
- existuje `telephony_sessions_provider_call_id_idx`.

Aktuální pokus `npx supabase db diff --local` byl zablokovaný při startu shadow databáze, protože Docker hlásil obsazený port `54320`. Žádný kontejner této aplikace tento port v době kontroly nepoužíval a cizí lokální služba nebyla zastavována. Předchozí kontrola po aplikaci telephony migrace hlásila nulový schema diff; aktuální opakování je v tomto reportu označené jako blocker, ne jako PASS.

## Browser flow

Ověřeno ve skutečné session na `http://localhost:3000`:

1. `/settings#telephony-adapter` se načetl bez build chyby po oddělení klientských sdílených typů od `server-only` modulu.
2. Session má roli `operator`, proto admin-only Telephony adapter sekce není dostupná.
3. Přímé otevření `/telephony` zobrazilo bezpečný stav `Telephony administration unavailable` s textem, že přístup má pouze workspace Administrator.
4. `/workspace` se načetl s existujícím leadem a tlačítkem `Call Client`.

## Co zatím není potvrzené

- pozitivní admin flow: přepnutí Local SIP v Settings → proklik `/telephony`,
- skutečný browserový audio hovor 1001 → 1002,
- registrace endpointů po připojení dvou browserových SIP klientů,
- Operator Console Local SIP hovor až po post-call wrap-up a databázový read-back,
- aktuální `db diff` kvůli obsazenému shadow DB portu 54320.

Tyto body nejsou vydávané za hotové. K jejich dokončení je potřeba admin přihlášení a druhý browserový SIP endpoint, například druhá lokální browser session s linkou 1002.

## Bezpečnostní hranice

Do tohoto reportu nebyly zapsány žádné API klíče, Public Key, SIP hesla, runtime credentialy ani osobní telefonní údaje. Lokální SIP hesla zůstávají pouze v ignorovaném Docker environmentu a runtime bootstrap není ukládán do CRM, localStorage, auditů ani diagnostického read modelu.

**Navazující plán:** [Local Telephony Settings and SIP Console plan](../plans/2026-09-05-local-telephony-settings-and-console.md)
