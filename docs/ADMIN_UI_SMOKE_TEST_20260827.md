# Countdown CRM — Administrator UI smoke test

**Datum:** 27. 8. 2026
**Testovaný commit:** `2e84262d7c1105894d1143a55ab857cbcd3ed393`
**Testovaná relace:** přihlášený `Administrator`, workspace kontext aktuálního účtu
**Rozsah:** read-only načtení pěti rout a reload každé routy

## Výsledek

Všechny testované stránky se načetly a po reloadu zachovaly stejný workspace
kontext i administrátorská oprávnění. Browser konzole po ustálení stránky
neobsahovala nové chyby ani varování. Během testu nebylo nic vytvořeno,
změněno ani smazáno.

| Routa | Načtení | Po reloadu | Pozorovaný stav |
|---|---|---|---|
| `/workspace` | prošlo | prošlo | Operator Console, aktuální lead, produktový script fallback; timeline bez záznamů |
| `/leads` | prošlo | prošlo | 4 leady, 4 kontakty, tabulkový přehled |
| `/orders` | prošlo | prošlo | 9 objednávek; seznam se načetl bez chyby |
| `/settings` | prošlo | prošlo | schema, preference a administrátorské akce viditelné Administratorovi |
| `/team` | prošlo | prošlo | queue položka, členové workspace a autorizovaná akce Reopen |

## Oprávnění a hranice důkazu

- Relace byla identifikována jako `Administrator`; tajné údaje nebyly čteny ani
  zapisovány do reportu.
- Administrační akce byly viditelné pouze v odpovídajícím admin kontextu.
- Tento průchod nepotvrzuje, že Operator tyto akce neuvidí nebo nemůže zavolat.
- Tento průchod není důkazem Supabase RLS, cross-workspace izolace, migrací,
  persistence po logout/login ani skutečného workflow zápisu.
- `/workspace` používá simulovaný softphone a explicitní runtime fallback pro
  chybějící publikovaný script; není to důkaz živé telephony nebo AI.

## Otevřené nálezy

- `/orders` obsahuje historické testovací záznamy s textem `Playwright Test Lead`
  a některé řádky mají `Unknown operator`. V tomto read-only testu nebyly měněny;
  jejich původ a případné odstranění patří do samostatného datového rozhodnutí.
- Negativní Operator a cross-workspace scénáře stále čekají na odpovídající
  přihlášené relace.

## Doporučený další krok

Provést oddělený Operator smoke test se skutečným účtem a následně bezpečně
ověřit persistence, negativní role/workspace scénáře a RLS proti schválenému
databázovému provisioning targetu.
