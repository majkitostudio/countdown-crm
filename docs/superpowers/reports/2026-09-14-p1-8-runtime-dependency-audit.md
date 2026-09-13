# P1.8 Runtime dependency and telephony audit

**Datum:** 2026-09-14  
**Rozsah:** lokální runtime audit, patch aktualizace bezpečných závislostí a autentizovaný browser průchod testovacím operátorem.

## Výsledek

P1.8 zůstává otevřené. Bezpečné patch aktualizace byly provedeny, ale živý Telnyx provider není připraven k zapnutí a audit stále obsahuje tři moderate nálezy v řetězci `@telnyx/webrtc` → `@peermetrics/webrtc-stats` → `uuid`.

Automatická oprava npm by nainstalovala `@telnyx/webrtc@1.0.9`, což je major downgrade z používané řady 2.x. Tento krok nebyl proveden bez kompatibilitního testu.

## Provedené změny

- `next` aktualizován z `16.3.2` na `16.3.5` kvůli kritickým advisory.
- bezpečně aktualizovány `sharp` a `js-yaml` v lockfile.
- po aktualizaci zůstaly pouze tři moderate nálezy v Telnyx/uuid větvi;
  high a critical nálezy zmizely.
- `npm audit fix --force` nebyl použit, protože by provedl neověřený major downgrade telefonní knihovny.

## Browser důkaz

V linked sandboxu byl vytvořen izolovaný P1.6 kontakt a aktivní assignment pro
testovacího operátora. Po doplnění testovací dostupnosti operátora:

1. Operator Console zobrazila správného přiřazeného zákazníka.
2. Start hovoru prošel přes assignment guard a fronta přešla do stavu
   `awaiting_outcome` s `recovery_required = true`.
3. Telefonní adaptér hovor neudržel do připojení; nevznikl žádný obchodní
   side effect — žádný call read-back ani objednávka.
4. Testovací assignment byl po průchodu uzavřen a dostupnost operátora vrácena
   na `offline`.

To je důkaz hranice runtime telefonie, nikoli důkaz živého Telnyx hovoru.

## Install skripty

`npm audit --json` označil k posouzení tři balíčky s install skripty:

- `@google/genai@2.15.0`
- `protobufjs@7.6.5`
- `unrs-resolver@1.12.2`

Auditní instalace byla provedena s `--ignore-scripts`; trvalá změna CI nebo
produkční instalace se bez samostatného posouzení těchto skriptů nezavádí.

## Ověření

- `npm test`: **125 test files, 571 tests passed**
- `npm run lint`: **pass**
- `npm run typecheck`: **pass**
- `npm run build`: **pass**, Next.js 16.3.5, 38 routes
- `npm audit --omit=dev`: **3 moderate**, pouze Telnyx/uuid řetězec
- lokální Supabase/pgTAP a lokální function-catalog parity nebyly spuštěny,
  protože Docker Desktop není v tomto prostředí dostupný.

## Co ještě chybí k uzavření P1.8

- rozhodnutí o kompatibilní aktualizaci nebo izolované mitigaci Telnyx/uuid;
- sandbox credentials a telefonní číslo pro živý provider;
- ověření Telnyx webhook podpisu, persistence a read-backu;
- autentizovaný browser průchod mute, hold, DTMF, hangup a recovery;
- opakovaný audit po rozhodnutí a potvrzení install skriptů v CI.
