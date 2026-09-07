# P0.3 — vzdálený databázový runner

## K čemu slouží

Runner ověří, že linked Supabase sandbox skutečně odpovídá bezpečnostním
kontraktům P0.2. Kontroluje katalog databáze, nikoli data zákazníků.

Lokální pgTAP není důkaz linked sandboxu. Lokální test běží v lokální databázi;
runner posílá stejný verzovaný read-only dotaz do konkrétního linked projektu.

## Co runner dokazuje

- pět veřejných RPC je `SECURITY INVOKER`,
- pět privilegovaných implementací je v `private` a má `SECURITY DEFINER`,
- veřejné i privátní funkce mají očekávaný prázdný `search_path`,
- ACL nepovoluje anonymní nebo veřejné vykonání a zachovává očekávaný
  `authenticated` přístup,
- `pgtap` není v `public`,
- výsledek pochází z explicitně zadaného linked project refu.

## Co runner nedokazuje

Runner není produkční readiness test. Nedokazuje produkční databázi, browser,
Auth session tří rolí, živý Telnyx, UI autorizaci ani business mutaci.
Nespouští migrace, reset databáze ani write testy.

## Identita a secrets

Použijte samostatný scoped Supabase access token pouze pro linked sandbox.
Token musí být omezený na jeden projekt a potřebné `Database: Read` oprávnění.
Classic/full-account token není vhodná náhrada pro automatizaci.

Token vytvořte mimo repozitář a vložte ho až při běhu. Nikdy ho neukládejte do
`.env` v projektu, Dockerfile, Docker build argů, GitHub logu ani `NEXT_PUBLIC_*`.
Runner záměrně odmítne `SUPABASE_SECRET_KEY` a
`SUPABASE_SERVICE_ROLE_KEY`.

Potřebné runtime proměnné:

```text
P0_3_LINKED_PROJECT_REF=<jediný linked sandbox project ref>
SUPABASE_ACCESS_TOKEN=<scoped runner token z secret manageru>
```

Hodnoty nikdy nevypisujte do konzole. Runner v reportu používá pouze krátký
fingerprint project refu a nevrací token ani URL credential.

## Spuštění mimo Docker

Z důvěryhodného hostitele, kde jsou runtime proměnné nastavené mimo Git:

```powershell
npm run verify:linked-security
```

Příkaz používá `supabase db query --linked` a pinned CLI `2.116.0`. Read-only
SQL je verzovaný v `scripts/p0-3-remote-db-evidence.sql` a runner odmítne
zápisová SQL slova ještě před připojením.

## Spuštění v Dockeru

```powershell
docker build -f docker/p0-3-runner/Dockerfile -t countdown-crm-p0-3-runner .
docker run --rm `
  --env P0_3_LINKED_PROJECT_REF `
  --env SUPABASE_ACCESS_TOKEN `
  countdown-crm-p0-3-runner
```

Secret se předává až při `docker run`; při buildu se nepoužívá `ARG` ani
`ENV` s tokenem.

## Bezpečný výstup

Úspěch vrací JSON podobný tomuto tvaru:

```json
{
  "status": "passed",
  "target": "linked-sandbox",
  "mode": "read-only",
  "projectRefFingerprint": "0123456789ab",
  "checks": { "total": 8, "passed": 8, "failed": [] }
}
```

Při chybě se vypíše stabilní kód, například:

- `MISSING_P0_3_LINKED_PROJECT_REF` — chybí project ref,
- `MISSING_SUPABASE_ACCESS_TOKEN` — chybí runner token,
- `FORBIDDEN_APPLICATION_CREDENTIAL` — byl nabídnut app/service-role klíč,
- `CLI_QUERY_FAILED` — linked CLI dotaz selhal,
- `INVALID_EVIDENCE_PAYLOAD` — odpověď nemá očekávaný bezpečný tvar,
- `EVIDENCE_CHECK_FAILED` — některý databázový kontrakt je porušený.

Raw CLI výstup se do chyby ani reportu nekopíruje.

## Rozdíl prostředí

| Prostředí | Příkaz / důkaz | Co znamená |
|---|---|---|
| Lokální runtime | `npx supabase test db` | Test lokální databáze; není to linked důkaz. |
| Linked sandbox | `npm run verify:linked-security` | Skutečný read-only katalogový důkaz konkrétního sandboxu. |
| Produkce | runner se nepoužívá | Produkční readiness a autorizace vyžadují vlastní schválený proces. |

P0.3 je dokončené až po skutečném linked běhu, jehož sanitizovaný report je
uložený v `docs/superpowers/reports/`.
