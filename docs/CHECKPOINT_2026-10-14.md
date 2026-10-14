# Projektový checkpoint — 14. 10. 2026

Tento zápis je referenční bod vzniklý před velkým projektovým úklidem (proběhne
v samostatné session). Slouží k tomu, aby se dalo plynule navázat.

## Stav kódu

- **Fáze 0, 1, 2 a 3 jsou hotové a commitnuté.**
- Poslední commit: `98e17c2` — „Docs: Fáze 3 dokončena + poznámka k Fázi 5".
- Pracovní strom: **čistý**, žádné nezaevidované soubory.
- **Nic není pushnuté.**
- Ověřeno u Fáze 3: lint ✅, typecheck ✅, testy 175 souborů / 832 ✅, build ✅.

## Co je rozhodnuté (Fáze 4)

PM upřesnil organizační hierarchii:

- **Kampaň (P1–P4)** = typ práce, kterou operátoři volají:
  - P1 — doobjednávky z e-shopu, hot leads, top leads (odchozí linka)
  - P2 — klasické prodejní oddělení (odchozí linka)
  - P3 — retence, doobjednávky (odchozí linka)
  - P4 — poslední záchrana, podpora
- **Tým** = skupina operátorů pod kampaní; každý tým má jednoho Team Leadera.
  Týmů může být na kampani několik, např. P1A, P1B, P1C (písmeno = iniciála TL).
- **Operátor** pracuje v týmu, tým patří pod kampaň.
- **P1 a P2 v reálném workspace úplně chybí** → v přehledu je zobrazit prázdné (bez migrace).

## Co je otevřené (Fáze 4)

- Kam umístit přehled front: nový view v Team Workspace (doporučeno) vs. samostatná
  stránka `/queues` vs. `/reports`.
- Název pro P1–P4: „Kampaň" vs. „Oddělení" vs. jiný.
- Koncept: manažerský souhrn kampaní vs. seznam leadů (lead pool) vs. obojí.
- Datová nekonzistence: dnes jsou P3/P4 v datech vedené jako „týmy" a samostatná
  kampaň neexistuje; sjednotí se při migracích ve Fázi 5.

## Návrh Fáze 4 (k diskusi, žádný kód zatím)

1. Sdílený model oddělení P1–P4 (`src/lib/department.ts`) — data + rozpoznání,
   žádné produkty ani konkrétní zdroje.
2. Přehled front — DAL (`src/lib/dal/departmentQueues.ts`) — agregace
   `lead_queue_items` po odděleních, vždy 4 oddělení i s nulami.
3. Přehled front — UI panel — nový view v Team Workspace, funguje i s prázdnými daty.
4. Dokumentace + rozhodnutí.

Každý krok: `npm run test:changed` + commit. Bez migrace (aby to neblokovalo Fázi 5).

Vizuální náhled (statické HTML s ukázkovými daty, mimo repozitář):
`C:\Users\mikes\AppData\Local\Temp\opencode\phase-4-campaign-queues-mockup.html`
(Při úklidu temp se smaže; dá se znovu vygenerovat.)

## Fáze 5 čeká

- Čistý běh celého řetězce migrací na čisté DB — včetně
  `20261014120000_team_leader_exception_pickup_risk.sql` a
  `20261014130000_orders_pickup_risk_index.sql`.
- Kontrola duplicitních verzí v `scripts/verify-all-migrations.mjs`.
- „Migration parity".
- Reálné měření výkonu (`EXPLAIN`) u dotazů Fáze 3.

## Úklid (druhá session)

- Projít repozitář: mrtvé / duplicitní / zapomenuté soubory, staré mockupy, skripty.
- Pozor na starý git stash (`stash@{0}`, 11. 10. 2026) s `test-output.txt`
  a `vitest-run.log` — před smazáním potvrdit.
- Známé drobnosti k vyřešení:
  - Fáze objednávek se v UI ukazují dvakrát (přehledový pruh i počty u filtrů tabulky).
  - `/exceptions` je zároveň záložka v Team Workspace i samostatná položka v levém menu.
- Držet pravidla: kód a dokumentace v oddělených commitech, nic nepushovat.

## Kde přesně pokračovat

1. Dokončit rozhodnutí Fáze 4 (umístění, název, koncept).
2. Pak krok 1 návrhu: sdílený model oddělení P1–P4.
