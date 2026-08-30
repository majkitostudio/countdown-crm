# Operator Console — state map a informační architektura

**Datum:** 2026-08-30
**Status:** návrhový podklad pro první UI slice
**Rozsah:** pouze hierarchie informací a pracovních stavů; bez změny komponent,
serverových kontraktů, queue modelu, autorizace nebo databáze

## Jedna dominantní otázka

Operator Console má v každém okamžiku odpovědět na: **„Co mám teď udělat?“**

P0 je aktuální stav nebo blokace, P1 je nejbližší akce, P2 je rozhodovací
kontext a P3 je podpůrná historie. P0 a P1 musí být rozpoznatelné během několika
sekund; P3 nesmí vizuálně konkurovat pracovní akci.

## Stavová mapa

| Stav | P0 — právě teď | P1 — další akce | P2 — kontext | P3 — podpora |
|---|---|---|---|---|
| `loading` | Načítání workspace | žádná | skeleton nebo prázdný stav | skryto |
| `load_error` | Workspace data nejsou dostupná | zkusit znovu podle skutečné chyby | důvod chyby | skryto |
| `waiting_assignment` | Čeká se na přiřazení | žádná; routing přidělí kontakt | vysvětlení routing služby | skryto |
| `ready` | Aktuální lead a stav `Ready for assignment` | `Call client` | jméno, telefon, schválený script, next best action | timeline, notes, discovery otázky |
| `dialing` / `ringing` | Probíhá vytáčení | `Cancel dial` | lead identity | historie odsunutá |
| `in_call` / `on_hold` | Aktivní simulovaný hovor a čas | `End call`, mute/resume | aktivní script a objection branch | timeline a notes sekundární |
| `awaiting_outcome` | Je nutný explicitní výsledek | `Call later`, `Schedule callback`, `Not interested`, `Create order` | stav recovery, pokud existuje | historie sekundární |
| `callback_modal` | Zadání termínu callbacku | uložit nebo zrušit | lead a termín | skryto |
| `completion_pending` | Ukládá se výsledek | žádná; akce jsou zamčené | `Saving outcome` | skryto |
| `recovery_required` | Přerušený hovor čeká na recovery | dokončit outcome nebo bezpečně pokračovat podle serverového stavu | důvod přerušení | skryto |
| `post_call_summary` | Výsledek zápisu hovoru/objednávky | pokračovat na další lead nebo zavřít summary | outcome, order status, automation status | transcript unavailable, detailní historie |

## Pravidla podle fáze hovoru

### Před hovorem

Dominantní je lead identity, připravenost a bezpečná akce `Call client`.
Script je bezprostřední kontext. Timeline, notes a discovery otázky zůstávají
dostupné, ale nesmí působit jako další hlavní pracovní fronta.

### Během hovoru

Dominantní je call state, časovač a bezpečné ovládání hovoru. Script a právě
zvolená objection branch mají být dostupné bez hledání. Vedlejší historie nesmí
odvádět pozornost od `End call`, mute/resume nebo pravdivého označení simulace.

### Po hovoru

Dominantní je povinný outcome. Po úspěšném serverovém completion se zobrazí
summary s oddělenými výsledky outcome, orderu a automation. `Saving outcome`,
chyba, `Unavailable`, `Simulation` a úspěch jsou samostatné stavy; žádný z nich
se nesmí maskovat jako jiný.

### Callback a recovery

Callback je krátký rozhodovací dialog, nikoli další dashboard. Při přerušení
hovoru musí UI říct, že lead zůstává přiřazený pro recovery. Zavření dialogu
neznamená release ani dokončení assignmentu.

## Co se v prvním UI passu nemění

- serverové role, workspace scoping, RLS a queue/assignment kontrakty;
- význam akcí `Call client`, `Cancel dial`, `End call`, outcome a callback;
- rozlišení `persisted`, `unavailable`, `simulation`, `loading` a `error`;
- Product Script, timeline, notes ani order business logika;
- telephony provider, realtime presence a širší redesign Dashboardu.

## Akceptace tohoto návrhového slice

- Každý výše uvedený stav má jednu dominantní P0 odpověď a nejvýše jednu
  bezprostřední P1 akční skupinu.
- P2 informace zůstávají dostupné, ale P3 historie a podpůrné insighty nejsou
  vizuálně silnější než aktuální pracovní akce.
- Loading, empty, error, unavailable a simulation mají odlišný význam.
- Následující UI slice může upravit existující layout bez změny serverového
  kontraktu.

## Ověření

Tento slice je dokumentační. Ověření spočívá v kontrole přesnosti mapy proti
`src/app/workspace/page.tsx` a existujícím workspace komponentám. Browser smoke,
persistence, authorization, RLS a accessibility testy patří až k příslušným
navazujícím slicům a nyní se nespouštějí.
