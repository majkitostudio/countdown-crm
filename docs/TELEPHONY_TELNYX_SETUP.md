# Telnyx telephony

Countdown CRM má připravenou první Telnyx integrační vrstvu, ale živá telefonie zůstává vypnutá, dokud není k voice connection přiřazené číslo a nejsou ověřené všechny environment a webhook hodnoty.

## Aktuální stav

- provider: Telnyx,
- účet: upgradovaný účet s dostupným kreditem pro vývojové testy,
- API v2 key: vytvořený v Telnyx dashboardu; tajná hodnota není v repozitáři,
- connection: vytvořená a aktivní SIP/WebRTC connection,
- číslo: živé ověření je odložené; zakoupené číslo vedené pro Středočeský kraj čeká na refundaci a nové číslo pro Moravskoslezský kraj bude potřeba ověřit podle skutečné adresy,
- databáze: `telephony_credentials`, `telephony_call_sessions` a `telephony_call_events` jsou vytvořené s RLS,
- živý režim: řídí `NEXT_PUBLIC_TELNYX_ENABLED` a je defaultně vypnutý.

## Dočasná validační cesta mimo Telnyx

Pro současné ověření telefonního workflow bude sloužit **lokální SIP ústředna
v Dockeru**, předběžně Asterisk. Bez veřejného čísla a bez SIP trunku bude
fungovat jako integrační laboratoř se dvěma interními testovacími endpointy.
Umožní ověřit call lifecycle, napojení na CRM session, ukončení hovoru,
post-call wrap-up a auditní kontext.

Volba aktivního adapteru patří do serverového workspace nastavení v Admin
Settings, nikoli do `localStorage` prohlížeče. Sekce má stabilní odkaz
`/settings#telephony-adapter`. Při aktivním Local SIP se z této sekce zobrazí
proklik na `/telephony`; pokud Local SIP aktivní není, administrátorská
stránka `/telephony` nabídne proklik zpět přímo na tuto volbu.

Lokální ústředna je nyní **implementovaná jako lokální validační laboratoř**.
Jejím účelem není nahradit Telnyx, ale umožnit vývoj a ověření chování
Countdownu v době, kdy není možné ověřit Telnyx číslo. Veřejné volání na mobil
z ní nebude fungovat: Local SIP přijímá pouze interní testovací endpointy
1001/1002 a nemá SIP trunk ani PSTN routing.

Správa je dostupná pouze administrátorovi na `/telephony`, pokud je v Admin
Settings vybraný `Local SIP`. Konzole ukazuje stav Asterisku, interní endpointy,
aktivní relace, bezpečné poslední eventy a umožňuje interní test 1001 → 1002.
Operator Console v Local SIP režimu také používá pouze interní 1002; skutečné
telefonní číslo leada se do lokální ústředny neposílá.

Pro browserové připojení server vydá krátkodobý pětiminutový runtime bootstrap.
Heslo je načtené pouze pro běh aktuálního klienta, neukládá se do CRM ani do
`localStorage`, auditů, diagnostiky nebo commitu. Lokální hodnoty jsou v
ignorovaném `docker/asterisk/.env`; vzor je v `docker/asterisk/.env.example`.

Budoucí hranice má zůstat provider-neutrální:

```text
Countdown telephony service
        ↓
Telnyx adapter / local SIP adapter
        ↓
provider nebo lokální testovací ústředna
```

Dokud nebude výslovně dokončený živý Telnyx pilot, zůstává `NEXT_PUBLIC_TELNYX_ENABLED=false`.

## Environment

```env
TELNYX_API_KEY=...
TELNYX_CONNECTION_ID=...
TELNYX_DEFAULT_CALLER_NUMBER=+420...
TELNYX_PUBLIC_KEY=...
NEXT_PUBLIC_TELNYX_ENABLED=false
```

`TELNYX_API_KEY` a `TELNYX_PUBLIC_KEY` patří pouze na server. API klíč se neposílá do browseru; server vydává krátkodobý WebRTC token. `TELNYX_DEFAULT_CALLER_NUMBER` musí být číslo z Telnyx přiřazené k dané connection. Osobní Vodafone číslo tuto roli nenahrazuje.

## Co je v kódu

- `POST /api/telephony/telnyx/token` vydává krátkodobý token po ověření uživatele a konfigurace,
- `POST/PATCH /api/telephony/telnyx/session` zakládá a synchronizuje CRM call session,
- `POST /api/telephony/telnyx/webhook` ověřuje podpis a ukládá provider eventy idempotentně,
- `GET /api/telephony/adapter` vrací workspace aktivní adapter bez cache,
- `GET /api/telephony/local/status` vrací bezpečný stav Asterisku, aktivní relace a poslední eventy,
- `POST /api/telephony/local/test-call` povoluje pouze interní test 1001 ↔ 1002,
- `POST/PATCH /api/telephony/local/session` zakládá a synchronizuje Local SIP session,
- `GET /api/telephony/local/bootstrap` vydává krátký runtime bootstrap pro browserové SIP připojení,
- `docker compose -f docker-compose.telephony.yml up -d` spouští lokální Asterisk s endpointy 1001/1002,
- browser softphone umí připravený outbound lifecycle, mute, hold a DTMF,
- při vypnutém flagu zůstává současný simulovaný softphone.

## Aktivace v pořadí

1. Dokonči refundaci nevhodného krajského čísla a následně ověř nové číslo pro správný kraj podle skutečné adresy.
2. V Telnyx dashboardu přiřaď ověřené číslo k voice connection.
3. Zkontroluj connection ID a vlož serverové proměnné do cílového environmentu.
4. Zkopíruj Telnyx account Public Key do `TELNYX_PUBLIC_KEY`.
5. Nastav veřejnou URL aplikace s cestou `/api/telephony/telnyx/webhook` a povol relevantní call lifecycle eventy.
6. Zapni `NEXT_PUBLIC_TELNYX_ENABLED=true` až po kontrole hodnot.
7. Proveď přihlášený outbound test: token → session → ringing/connected/ended → webhook → databázový read-back.
8. Pokud test selže, flag vypni a ověř session/event log; nesmí vzniknout falešný „completed“ call.

## Co zatím není součástí

Inbound routing, nahrávání, audio retention, přepis hovorů a post-call Gemini AI. Tyto vrstvy se přidají až nad ověřený call session/event kontrakt.

Lokální Docker ústředna sama o sobě není důkazem připravenosti produkční
telefonie. V ověřovacím reportu se musí uvést, co bylo skutečně otestováno a
co zůstává mimo rozsah.

## Pilotní ověření přes standardní localhost

Pilotní důkaz se provádí v běžící aplikaci na `http://localhost:3000`, se
skutečným Auth uživatelem a skutečnými workspace daty. `NEXT_PUBLIC_ALLOW_DEMO_AUTH=true`
se pro tento důkaz nepoužívá. Nezakládej testovací produkt, lead ani hovor
jen proto, aby vypadal náhled naplněně; pokud cílový workspace data nemá,
ověření se označí jako blokované.

### Předpoklady

- testovací Telnyx číslo je přiřazené ke správné aktivní voice connection,
- connection má nastavenou veřejnou URL `/api/telephony/telnyx/webhook`,
- jsou povolené relevantní call lifecycle eventy,
- cílový environment má ověřené serverové proměnné a
  `NEXT_PUBLIC_TELNYX_ENABLED=true`,
- přihlášený uživatel má v workspace dostupný lead; queue-bound lead musí být
  přiřazený právě tomuto uživateli.

### Pozitivní důkaz

1. Spusť aplikaci standardním `npm run dev` a otevři `http://localhost:3000/workspace`.
2. Přihlas se jako skutečný `operator`, `team_leader` nebo `administrator` v
   cílovém workspace.
3. Zahaj outbound a zaznamenej posloupnost `token → session initiated →
   call.initiated → ringing/trying → connected → hold/unhold → hangup`.
4. Po ukončení zkontroluj, že UI zobrazilo skutečný stav a následný outcome
   workflow; nesmí se objevit simulované audio indikátory v live režimu.
5. Po reloadu ověř `telephony_call_sessions` a `telephony_call_events`:
   workspace, lead, operator, provider IDs, status, timestampy, délku a jeden
   event řádek pro každý unikátní `provider_event_id`.

### Negativní důkaz

Ověř alespoň neautentizovaný token/session request, lead z cizího workspace,
queue item přiřazený jinému operátorovi, neplatný podpis, starý timestamp,
duplicitní webhook, opožděný event po `call.hangup` a chybějící Telnyx
konfiguraci. Očekávané výsledky jsou `401`, `404`, `409`, `503` nebo bezpečný
`200` no-op podle typu scénáře; žádný scénář nesmí vytvořit falešný úspěšný
hovor nebo session znovu otevřít po terminálním stavu.

### Evidence

Do ověřovacího reportu zapiš datum, cílové prostředí, roli, stav provideru,
route, očekávanou a skutečnou odpověď, databázový read-back a případný
blocker. Nezapisuj API klíče, Public Key, tokeny ani osobní telefonní čísla.

Nikdy do dokumentace ani commitu nevkládej API klíč, Public Key, token, heslo nebo osobní telefonní údaje.
