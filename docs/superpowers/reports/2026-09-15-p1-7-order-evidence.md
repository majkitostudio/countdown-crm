# P1.7 — Důkaz ruční a post-call objednávky

**Datum:** 15. 9. 2026
**Prostředí:** linked Sandbox `countdown-crm-sandbox-20260824`
**Production:** bez změny

## Co bylo ověřeno

Tento důkaz uzavírá adresní a objednávkovou část P1:

- ruční vytvoření objednávky z Operator Console;
- uložení kompletní doručovací adresy jako neměnného snapshotu objednávky;
- zobrazení stejné adresy po obnovení detailu objednávky;
- post-call dokončení hovoru s výsledkem `order_placed`;
- vytvoření hovoru, objednávky, položky, adresy, týmového snapshotu a auditu v jednom serverovém toku;
- odstranění všech dočasných testovacích záznamů.

## Ruční objednávka — browser

Přihlášený testovací Team Leader vytvořil objednávku pro dočasného zákazníka
v P3 s produktem `Wallet Test CZK Product` za `1800 CZK`.

Browser ověřil:

- detail objednávky se stavem `In-Progress`;
- zákazníka a produkt;
- částku `1800 CZK`;
- doručovací adresu:
  - P1.7 Evidence Recipient;
  - Testovací 123;
  - Byt 4;
  - 70200 Ostrava, CZ;
- obnovení stránky bez ztráty adresy.

Původní zápis byl nejprve odmítnutý kvůli konfliktu mezi RLS kontrolou a
historickým týmovým snapshotem. Oprava v migracích
`20260915010000_historical_snapshot_rls_order_fix.sql` a
`20260915011000_order_creation_team_snapshot_fix.sql` zajistila, že server
určí tým leadu před zápisem a adresní varianta funkce vrátí řádek až po uložení
snapshotu.

## Post-call objednávka — autentizovaný serverový průchod

Browserový pokus o skutečné spojení hovoru se v místním prostředí nedostal přes
mikrofon. To je očekávaná hranice testovacího prostředí: aplikace přechod do
hovoru nepředstírala a bezpečně přešla do recovery.

Samotný post-call tok byl proto ověřen přes stejnou autentizovanou serverovou
hranici, kterou používá Operator Console, s testovací call session označenou
jako připojenou. Průchod použil skutečný P3 tým a skutečného P3 operátora.

Výsledek:

- call outcome: `order_placed`;
- hovor uložen s outcome `order_placed` a délkou 62 sekund;
- objednávka vytvořena se stavem `completed`;
- částka `1800 CZK` a produkt uloženy v `order_items`;
- adresa uložena jako:
  - P1.7 Post-call Recipient;
  - Post-call 456;
  - Byt 5;
  - 70200 Ostrava, CZ;
- hovor i objednávka dostaly týmový snapshot P3;
- telephony session se navázala na dokončený hovor;
- frontová položka přešla do `closed`;
- audit obsahuje událost vytvoření objednávky z dokončeného hovoru.

## SQL read-back a úklid

SQL read-back potvrdil všechny výše uvedené údaje v Sandboxu. Po ověření byly
odstraněny:

- ruční i post-call objednávka včetně položek a historie;
- dočasný lead;
- dočasná queue položka a queue události;
- testovací telephony sessions a call;
- completion request a související auditní záznamy;
- dočasné členství testovacího operátora v P3.

Závěrečný cleanup read-back:

- objednávky: `0`;
- lead: `0`;
- calls: `0`;
- telephony sessions: `0`;
- queue položka: `0`;
- dočasné členství v P3: `0`;
- Sandbox telephony adapter vrácen na původní `local_sip`;
- v Production nalezeno `0` záznamů s testovacími ID.

## Poznámka k browser důkazu

Ruční tok má kompletní browser důkaz včetně reloadu. Post-call business tok má
kompletní autentizovaný serverový a SQL důkaz; poslední vizuální krok skutečného
spojení hovoru zůstává závislý na přístupu browseru k mikrofonu a lokální
telefonii. Nejde o chybu uložení objednávky ani o oprávnění uživatele.
