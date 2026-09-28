# Countdown CRM — AI worklog

Stručný audit významné práce AI nástrojů. Nejde o přepis konverzací ani o aktuální produktovou dokumentaci.

## 2026-09-25 — AI memory layer

- Byla vytvořena sdílená AI dokumentace pro produktový směr, aktuální stav, rozhodnutí a otevřené otázky.
- Pozdější validace ukázala, že původní rozdělení do mnoha souborů vytvářelo zbytečnou duplicitu.

## 2026-09-26 — Konsolidace dokumentace

- Produktová vize byla rozšířena z úzkého operator-first popisu na komplexní CRM pro telemarketingové call centrum.
- Historické plány, specifikace, checkpointy a reporty byly shrnuty do `docs/HISTORY_COMPACT.md`.
- Aktuální zdroje byly sloučeny do `START_HERE.md`, `docs/PRODUCT_VISION.md` a `docs/PROJECT_GUIDE.md`.
- Zdrojový kód, databázové migrace a business logika nebyly touto dokumentační změnou záměrně měněny.

## Pravidlo AI práce

AI nástroj může pomáhat s analýzou, návrhem a omezenými změnami, ale pracovní repozitář, testy a ověřený diff zůstávají zdrojem pravdy. Žádná změna se nepovažuje za bezpečnou pouze na základě tvrzení AI nástroje.
