# Team Checkpoint (Macaly layout) — ověření v Sandboxu (20. 9. 2026)

**Prostředí:** lokální `next dev 16.3.5` proti Sandboxu `lpvypihpxhyjljikfzqo`
(workspace `9015a0bf-bb9e-4900-bb3b-b769c4c71f0b`).
**Production:** beze změny.
**Účel:** ověřit implementaci Team Checkpointu podle Macaly předlohy
(commit `ef4caa6`): pořadí Asistence → KPI → Výsledky → Konec směny →
Callbacky + Kvalita v checkpoint tabu, klikací řádky do detailu operátora.

## Účty

Ověřeno jako persistentní **administrátor**, **Team Leader (tým P1)** a
**operátor**. Hesla administrátora a obou Team Leaderů byla protočena a
předána mimo repozitář. Účty zůstávají pro příští testy; otevřená testovací
data nezůstala žádná (ověřovací průchod je read-only, žádný seed).

## DB read-back (RLS, Team Leader vs. administrátor)

| Kontrola | Team Leader (P1) | Administrátor |
|---|---|---|
| Leady | 5, všechny tým P1 | plný workspace |
| Lead bez týmu | 0 z 3 existujících | 3 |
| Hovory (s `duration_seconds`) | 5, žádné bez délky | — |
| Callback okna (`waiting_callback`) | prošlé 0 · naplánované 0 | — |

Team scope drží ve všech vrstvách; prázdné stavy se nevydávají za data.

## Browser smoke (12/12 PASS)

| Krok | Výsledek |
|---|---|
| TL checkpoint: badge, `Povolené týmy: P1`, asistence, KPI, výsledky, předání, sekce Callbacky + Kvalita, `Naplánované v období` | PASS |
| Detail operátora z klikacího řádku (Zpět, Poslední hovory, objednávky, kvalita) | PASS |
| Taby Kvalita / Objednávky / Operátoři / Fronta | PASS |
| Reload drží rozsah | PASS |
| Bez browser chyb | PASS |
| Admin: `Administrator access`, týmy P1+P2+P3 | PASS |
| Operátor: `/team` i `/leads` odmítnuty | PASS |
| Mobil 390 px: stohování, bez horizontálního scrollu | PASS |

Vizuální kontrola screenshotů (1440 px + 390 px): neutrální zinc systém,
`warning` jen pro pozornost, `danger` jen pro SOS; žádný cirkus.

## Repo kontroly

- `npm test`: 147 souborů, 687 testů — PASS.
- `npm run lint`, `npm run typecheck`, `npm run build` — PASS.

## Co tento důkaz nepotvrzuje

- Production se neměnila; žádná migrace nebyla potřeba (změna je aplikační).
- Naplněný overdue odznak (> 5 min) a claim → resolve flow byly prokázány
  v předchozím průchodu (`2026-09-19-team-checkpoint-verification.md`);
  v tomto běhu byla fronta asistence prázdná (pravdivý prázdný stav).
- Živá telefonie, nahrávání a přepis zůstávají externě blokované.
