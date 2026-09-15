# P2 Team Model — Sandbox setup

**Datum:** 14. 9. 2026
**Prostředí:** Supabase Sandbox `countdown-crm-sandbox-20260824`
**Rozsah:** první skutečné nastavení týmů podle produktového rozhodnutí

## Nastavení

V existujícím workspace byly vytvořeny a aktivovány:

- `P1` — prodejní oddělení,
- `P2` — retence,
- `P3` — zákaznické centrum.

Určený workspace Administrator byl převeden na workspace roli Team Leader
a dostal aktivní leader členství v P1. Jeden existující běžný Operator byl
přiřazen jako aktivní člen P1.

V rámci schváleného testovacího obsazení byly následně doplněny také:

- P2: `mikestudio+amalka@email.cz` jako Team Leader a `mikestudio+tom@email.cz` jako Operator,
- P3: testovací Team Leader `p17.teamleader.1789336266@example.test` a `countdown@majkito.com` jako Operator.

## Read-back

Databázový read-back potvrdil:

- všechny tři týmy mají stav `active`,
- P1 má jedno aktivní leader členství,
- P1 má jedno aktivní operator členství,
- workspace role Team Leadera odpovídá jeho týmovému leader členství,
- workspace role Operátora odpovídá jeho týmovému member členství.

## Hranice tohoto setupu

- nastavení bylo provedeno pouze v Sandboxu,
- Production projekt nebyl změněn,
- pět schválených testovacích leadů a jejich pět queue položek má vlastnictví P1,
- tři starší leady zůstávají bez týmu kvůli nejasnému obchodnímu zařazení,
- současný workspace-wide routing a Team Leader scope zůstávají beze změny,
- žádný nový lead, hovor ani objednávka nebyly vytvořeny,
- tento setup není důkazem týmového routingu ani cross-team denial.

## Další krok

Následuje test týmového routingu a cross-team přístupu. Teprve po ověření,
že P1/P2/P3 dostávají pouze vlastní práci, bude možné omezit Team Leaderovi
pohled pouze na jeho tým.
