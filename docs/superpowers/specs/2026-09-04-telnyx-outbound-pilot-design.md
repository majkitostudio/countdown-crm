# Telnyx Outbound Pilot Design

**Status:** Návrh schválený pro plánování
**Datum:** 4. 9. 2026
**Vazba:** první bod aktivního To-Do — dokončit a ověřitelně zapnout outbound telefonii

## Cíl

Převést existující Telnyx foundation z připravené integrace na ověřitelný
pilotní outbound tok: autentizovaný uživatel otevře běžný `localhost`, zavolá
klientovi přes Telnyx WebRTC, UI pravdivě zobrazí lifecycle, server uloží
call session a webhook eventy a po reloadu lze stav dohledat v databázi.

Výsledek nesmí vytvořit falešný „connected“ nebo „completed“ stav. Pokud je
provider, browser media, webhook nebo databáze v chybě, operátor musí dostat
čitelný failure state a bezpečnou možnost ukončit nebo opakovat akci.

## Co už existuje

- serverové endpointy pro WebRTC token, CRM call session a Telnyx webhook,
- workspace-scoped role guardy a server-owned credentials,
- tabulky `telephony_credentials`, `telephony_call_sessions` a
  `telephony_call_events` s RLS,
- `WebRtcSoftphoneController` s fallback simulací, mute, hold a DTMF,
- podpisová kontrola Ed25519 a základní idempotentní event trail,
- automatické kontraktové testy pro čísla, podpis a softphone lifecycle.

## Navržený tok

1. Ověřený uživatel s povolenou rolí otevře `/workspace` v běžné aplikaci na
   `http://localhost:3000`.
2. Operátor zahájí outbound pouze pro lead dostupný v jeho workspace; pokud je
   volání navázané na queue item, assignment musí patřit aktuálnímu uživateli.
3. Server založí `telephony_call_sessions` se stavem `initiated`.
4. Server vydá krátkodobý WebRTC token bez vystavení API klíče browseru.
5. Browser počká na `telnyx.ready`, vytvoří Telnyx call a synchronizuje pouze
   skutečně pozorované stavy.
6. Telnyx doručí podepsané webhooky na veřejnou URL. Webhook handler uloží každý
   event jednou a session aktualizuje monotónně i při duplicitech nebo eventech
   doručených mimo pořadí.
7. UI zobrazí `dialing`, `ringing`, `connected`, `on_hold`, `ended` nebo
   `failed`; po ukončení pokračuje existující post-call outcome workflow.
8. Ověření zahrne browser, HTTP response, databázový read-back po reloadu a
   negativní scénáře pro role, workspace, podpis, replay a ztracenou konfiguraci.

## Stavový kontrakt

CRM používá malou doménovou množinu:

```ts
type CallStatus = "initiated" | "ringing" | "connected" | "held" | "ended" | "failed";
```

Provider eventy se mapují takto:

- `call.initiated` → `initiated`,
- `call.answered` → `connected`,
- `call.hold` → `held`,
- `call.unhold` → `connected`,
- `call.hangup` → `ended`.

Browser WebRTC stavy `trying`, `requesting` a `ringing` reprezentují průběh
dialingu; `active`, `held` a `hangup` se mapují na odpovídající CRM stav.
Neznámý stav nesmí být interpretován jako úspěch. Chyba SDK, media permission,
signaling close nebo vypršený token vede do `failed`, pokud ještě není session
terminální.

Povolené přechody musí být vynucené serverem a webhookem. `ended` a `failed`
jsou terminální; pozdě doručený `ringing` nebo `connected` je nesmí znovu otevřít.
Opakování stejného eventu je idempotentní.

## Role a hranice

- `operator` může vytvořit a aktualizovat vlastní call session pro lead, který
  je mu dostupný přes assignment.
- `team_leader` a `administrator` mohou používat vlastní ověřený outbound test
  v rámci svého workspace; nemohou upravovat session jiného operátora přes
  client-side znalost UUID.
- Žádná role nesmí číst ani měnit telephony data jiného workspace.
- Webhook nepoužívá user session; korelace je možná pouze přes podepsaný
  provider payload, existující session a bezpečnou vazbu na workspace.
- Provider secrets zůstávají v server environmentu a nikdy se nevracejí v
  diagnostics response ani necommitují.

## Failure states a observabilita

Každý failure state musí rozlišit alespoň:

- chybějící nebo neplatnou konfiguraci,
- neúspěšné vydání Telnyx credential/tokenu,
- browser media permission nebo WebRTC readiness problém,
- odmítnutí callu providerem,
- neúspěšnou synchronizaci CRM session,
- neověřený, replayovaný nebo nekorelovaný webhook.

Operátor uvidí krátkou akční zprávu bez tajných nebo zbytečně technických dat.
Server log zachová korelační ID a technický důvod. UI nikdy nesmí přepnout do
`connected` jen proto, že byla úspěšná HTTP žádost o zahájení hovoru.

## Mimo scope této fáze

- inbound routing,
- nahrávání, audio retention a transcript,
- Gemini post-call AI,
- Team Leader Exception Queue a Admin Workspace Readiness jako samostatné UI,
- automatické řešení provider incidentů,
- změna existujícího fallback softphonu na živou telefonii ve všech prostředích.

## Akceptační kritéria

- Telnyx číslo je přiřazené ke správné aktivní voice connection.
- Cílový environment má ověřené serverové proměnné a veřejnou webhook URL.
- Přihlášený testovací uživatel provede outbound hovor přes běžný localhost a
  vidí skutečný lifecycle bez simulovaných indikátorů.
- V databázi existuje jedna session a jedna řádka pro každý provider event;
  duplicate webhook nevytvoří duplicitní event.
- Stav session po reloadu odpovídá provider lifecycle a terminální stav se
  nedá pozdním eventem znovu otevřít.
- Neautentizovaný požadavek, cizí workspace, cizí assignment, neplatný podpis,
  replay a chybějící konfigurace mají očekávaný odmítnutý nebo failure stav.
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` a diff check
  projdou; ruční důkaz browser → API → DB je zapsaný v telephony dokumentaci.

## Externí kontrakty

Plán vychází z aktuálního Telnyx WebRTC JS SDK a Voice API dokumentace:

- [WebRTC JS SDK quickstart](https://developers.telnyx.com/development/webrtc/js-sdk/quickstart/index)
- [WebRTC JS Call reference](https://developers.telnyx.com/docs/voice/webrtc/js-sdk/classes/call)
- [WebRTC JS error handling](https://developers.telnyx.com/docs/voice/webrtc/js-sdk/error-handling)
- [Voice API webhooks](https://developers.telnyx.com/docs/voice/programmable-voice/voice-api-webhooks)
- [Receiving Programmable Voice webhooks](https://developers.telnyx.com/docs/voice/programmable-voice/receiving-webhooks)
- [Webhook signature verification](https://developers.telnyx.com/docs/messaging/messages/receiving-webhooks)
