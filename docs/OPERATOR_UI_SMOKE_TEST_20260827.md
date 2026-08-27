# Countdown CRM — Operator UI smoke test

**Datum:** 27. 8. 2026
**Testovaný commit:** `f54be693cd2c7949d2622cbc4500ec9291bf4ebc`
**Testovaná relace:** přihlášený `Operator`, workspace kontext aktuálního účtu
**Rozsah:** read-only načtení pěti rout, reload každé routy a kontrola browser konzole

## Výsledek

Operator relace se načetla bez konzolových chyb. Po reloadu zůstal zachovaný
stejný Operator kontext. Admin-only odkazy a akce (Leads directory, Workflows,
Analytics, Audit Log, Live Monitor, Workspace Members a schema mutace) nebyly
v Operator navigaci dostupné.

| Routa | Načtení | Po reloadu | Pozorovaný stav |
|---|---|---|---|
| `/workspace` | prošlo | prošlo | Operator Console, aktuální lead, Call Client a read-only script; timeline se po načtení ustálila |
| `/leads` | prošlo | prošlo | explicitní unavailable: Operator nemá adresář leadů ani ruční správu leadů |
| `/orders` | prošlo | prošlo | 0 vlastních objednávek; dostupná cesta Create Order odpovídá operátorskému workflow |
| `/settings` | prošlo | prošlo | profil, audio preference a read-only schema; Save Preferences je operátorská preference, ne admin mutace |
| `/team` | prošlo | prošlo | explicitní unavailable: queue operations jsou pouze pro Team Leader/Administrator |

## Oprávnění a hranice důkazu

- Relace byla identifikována jako `Operator`; heslo, tokeny ani cookies nebyly
  čteny ani ukládány.
- Po reloadu zůstala role Operator a stejné workspace routování.
- Nebyly dostupné odkazy na administraci workflow, analytics, audit logu,
  monitoru, workspace členů ani Leads directory.
- Tento test není důkazem Supabase RLS, cross-workspace izolace, persistence
  zápisů, migration correctness ani skutečné telephony.
- Softphone a fallback script jsou v produktu explicitně označené jako
  simulované/pilotní chování.

## Otevřené nálezy

- Aktuální workspace používá historický testovací lead `Playwright Test Lead`.
  V tomto read-only průchodu nebyl měněn ani mazán.
- Pozitivní Operator UI smoke nenahrazuje negativní cross-workspace test ani
  přímé live RLS ověření.
- `/workspace` může při prvním renderu krátce zobrazit stav načítání pomalejších
  částí; po ustálení nebyl přítomen nekonečný spinner ani konzolová chyba.

## Doporučený další krok

Provést oddělené read-only/persistence ověření proti schválenému provisioning
targetu: role a workspace negativní scénáře, reload/logout-login a idempotence
kritických zápisů. Připravené databázové drafty zůstanou do té doby otevřené.
