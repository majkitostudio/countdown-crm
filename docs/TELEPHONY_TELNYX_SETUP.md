# Telnyx telephony foundation

The workspace keeps the existing browser simulation until `NEXT_PUBLIC_TELNYX_ENABLED=true` is configured. In live mode, each operator receives a short-lived Telnyx WebRTC JWT from the server; the Telnyx API key is never sent to the browser.

## Required environment

```env
TELNYX_API_KEY=...
TELNYX_CONNECTION_ID=...
TELNYX_DEFAULT_CALLER_NUMBER=+420...
TELNYX_PUBLIC_KEY=...
NEXT_PUBLIC_TELNYX_ENABLED=true
```

`TELNYX_DEFAULT_CALLER_NUMBER` must be a Telnyx number assigned to the selected voice connection. It is not the operator's personal Vodafone number.

## Telnyx setup

1. Buy or port a Telnyx number and assign it to the voice connection.
2. Copy the connection ID and create an API key in Mission Control.
3. Copy the account Public Key to `TELNYX_PUBLIC_KEY`.
4. Configure the webhook URL as `/api/telephony/telnyx/webhook` on the deployed app and enable call events, including initiated, ringing, answered and hangup.
5. Apply `supabase/migrations/20260903090000_telnyx_telephony_foundation.sql`.

The integration currently covers outbound browser calling, hold/mute/DTMF, provider lifecycle events, signed webhook verification and idempotent event storage. Inbound routing, recordings and AI transcription will build on the stored session/event contract in the next slice.
