# Local Telephony Verification

**Datum:** 2026-09-05  
**Rozsah:** workspace adapter, admin-only `/telephony`, lokální Asterisk/SIP laboratoř, Local SIP session lifecycle a bezpečná diagnostika  
**Prostředí:** `http://localhost:3000`, lokální Supabase, Docker Compose, skutečná přihlášená testovací operator session

## Výsledek jednou větou

Implementace Local SIP je v repozitáři připravená a lokální Asterisk běží zdravě. Admin flow Settings → Local SIP → `/telephony` je ověřený, konzole hlásí Asterisk `Available` a interní test se bezpečně dostane až k SIP registraci/volání. Skutečný spojený browserový audio hovor 1001 ↔ 1002 zatím není potvrzený, protože je otevřený pouze jeden SIP browser endpoint.

## Co je implementováno

- Aktivní adapter je uložený serverově na úrovni workspace v `workspace_telephony_settings`; `localStorage` není zdroj pravdy.
- Změnu adapteru může provést pouze administrátor; Telnyx zůstává viditelný, ale blokovaný.
- `/telephony` má serverový admin guard a při neaktivním Local SIP odkazuje přímo na `/settings#telephony-adapter`.
- Local SIP používá sdílený CRM session lifecycle a zapisuje bezpečné stavové eventy.
- Browserový adapter používá SIP.js `0.21.2`, runtime bootstrap má pětiminutovou platnost a SIP hodnoty se neukládají do CRM ani `localStorage`.
- Asterisk je localhost-only, má pouze interní endpointy 1001/1002 a interní dialplan bez SIP trunku/PSTN; PJSIP hesla se při startu Dockeru generují do ignorovaného runtime souboru.
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

`npx supabase migration list` po aplikaci migrací ukázal vzdálenou historii včetně `20260905052514` a `20260905150000`.

Autentizovaný/CLI read-back lokální databáze potvrdil:

- tabulky `workspace_telephony_settings` a `telephony_call_sessions` existují,
- `workspace_telephony_settings` obsahuje `workspace_id`, `active_adapter`, `updated_by`, `created_at`, `updated_at`,
- existují tři očekávané policy pro workspace read a admin insert/update,
- existuje `telephony_sessions_provider_call_id_idx`.

Aktuální pokus `npx supabase db diff --local` byl zablokovaný při startu shadow databáze, protože Docker hlásil obsazený port `54320`. Žádný kontejner této aplikace tento port v době kontroly nepoužíval a cizí lokální služba nebyla zastavována. Předchozí kontrola po aplikaci telephony migrace hlásila nulový schema diff; aktuální opakování je v tomto reportu označené jako blocker, ne jako PASS.

## Browser flow

Ověřeno ve skutečné session na `http://localhost:3000`:

1. Administrátorská session byla rozpoznána jako `Administrator`.
2. `/settings#telephony-adapter` se načetl bez build chyby; `Local SIP` byl vybrán a uložil se serverově.
3. Nastavení zobrazilo proklik `Open Local SIP console` na `/telephony`; `Telnyx adapter` zůstal disabled.
4. `/telephony` zobrazilo `Active adapter: Local SIP`, `Asterisk status: Available`, interní linky `1001 / 1002` a hranice Local only / Public PSTN disabled / Recording disabled / Telnyx blocked.
5. Tlačítko interního testu vytvořilo Local SIP session a bezpečné eventy. Test prošel přes bootstrap a SIP registraci, ale skončil očekávaně jako `failed`, protože druhý endpoint `1002` nebyl připojený; aplikace nevytvořila veřejný hovor.
6. Po testu se konzole vrátila do `idle` bez původní chyby rekurzivního odpojování.

## Co zatím není potvrzené

- skutečný browserový audio hovor 1001 → 1002,
- registrace endpointů po připojení dvou browserových SIP klientů,
- Operator Console Local SIP hovor až po post-call wrap-up a databázový read-back,
- aktuální `db diff` kvůli obsazenému shadow DB portu 54320.

Tyto body nejsou vydávané za hotové. K jejich dokončení je potřeba druhý browserový SIP endpoint připojený jako linka `1002`; samotná jedna admin session může ověřit pouze bootstrap, registraci prvního endpointu a bezpečný failure path.

## Bezpečnostní hranice

Do tohoto reportu nebyly zapsány žádné API klíče, Public Key, SIP hesla, runtime credentialy ani osobní telefonní údaje. Lokální SIP hesla zůstávají pouze v ignorovaném Docker environmentu a runtime bootstrap není ukládán do CRM, localStorage, auditů ani diagnostického read modelu.

**Navazující plán:** [Local Telephony Settings and SIP Console plan](../plans/2026-09-05-local-telephony-settings-and-console.md)
