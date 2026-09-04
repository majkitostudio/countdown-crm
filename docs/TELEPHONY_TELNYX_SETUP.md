# Telnyx telephony

Countdown CRM má připravenou první Telnyx integrační vrstvu, ale živá telefonie zůstává vypnutá, dokud není k voice connection přiřazené číslo a nejsou ověřené všechny environment a webhook hodnoty.

## Aktuální stav

- provider: Telnyx,
- účet: upgradovaný účet s dostupným kreditem pro vývojové testy,
- API v2 key: vytvořený v Telnyx dashboardu; tajná hodnota není v repozitáři,
- connection: vytvořená a aktivní SIP/WebRTC connection,
- číslo: v současnosti není aktivní číslo přiřazené ke connection,
- databáze: `telephony_credentials`, `telephony_call_sessions` a `telephony_call_events` jsou vytvořené s RLS,
- živý režim: řídí `NEXT_PUBLIC_TELNYX_ENABLED` a je defaultně vypnutý.

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
- browser softphone umí připravený outbound lifecycle, mute, hold a DTMF,
- při vypnutém flagu zůstává současný simulovaný softphone.

## Aktivace v pořadí

1. V Telnyx dashboardu dokonči číslo a přiřaď ho k voice connection.
2. Zkontroluj connection ID a vlož serverové proměnné do cílového environmentu.
3. Zkopíruj Telnyx account Public Key do `TELNYX_PUBLIC_KEY`.
4. Nastav veřejnou URL aplikace s cestou `/api/telephony/telnyx/webhook` a povol relevantní call lifecycle eventy.
5. Zapni `NEXT_PUBLIC_TELNYX_ENABLED=true` až po kontrole hodnot.
6. Proveď přihlášený outbound test: token → session → ringing/connected/ended → webhook → databázový read-back.
7. Pokud test selže, flag vypni a ověř session/event log; nesmí vzniknout falešný „completed“ call.

## Co zatím není součástí

Inbound routing, nahrávání, audio retention, přepis hovorů a post-call Gemini AI. Tyto vrstvy se přidají až nad ověřený call session/event kontrakt.

Nikdy do dokumentace ani commitu nevkládej API klíč, Public Key, token, heslo nebo osobní telefonní údaje.
