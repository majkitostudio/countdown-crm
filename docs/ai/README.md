# Countdown CRM — AI memory layer

`docs/ai/` je sdílená projektová paměť pro AI nástroje i lidi pracující na Countdown CRM. Obsahuje stručný kontext, významná rozhodnutí, otevřené otázky, produktový směr a auditní stopu AI práce. Nenahrazuje zdrojový kód, databázové migrace, testy ani aktuální ověření cílového prostředí.

## Který dokument použít

- aktuální stav projektu → [CURRENT_STATE.md](CURRENT_STATE.md)
- významná rozhodnutí → [DECISIONS.md](DECISIONS.md)
- otevřené otázky a rozpory → [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md)
- produktová identita a směr → [PRODUCT_DIRECTION.md](PRODUCT_DIRECTION.md)
- historie významné práce AI agentů → [AI_WORKLOG.md](AI_WORKLOG.md)

## Pravidla práce

1. Načti pouze dokumenty relevantní pro konkrétní úkol. Při větší změně směru načti více dokumentů.
2. `CURRENT_STATE.md` ber jako rychlý kontext, ne jako důkaz místo kódu, migrací nebo testů. Před implementací ověř kritické údaje v repozitáři.
3. Významnou práci zapiš stručně do `AI_WORKLOG.md` podle chronologické šablony. Drobné editace a běžné příkazy samostatný záznam nepotřebují.
4. Do `DECISIONS.md` zapisuj jen explicitně přijatá produktová, UX, architektonická nebo technická rozhodnutí s dopadem na další práci. Návrh není rozhodnutí.
5. Do `OPEN_QUESTIONS.md` zapisuj důležité nevyřešené otázky, skutečné rozpory a neověřené skutečnosti; nepoužívej ho jako kompletní TODO seznam.
6. Při vyřešení otázku nemaž. Zachovej ji a označ `RESOLVED` nebo `DEFERRED`, včetně stručného zdroje řešení.
7. Při konfliktu informací nepředstírej jistotu. Uveď konflikt jako `UNKNOWN`, napiš zdroje a urč, co je potřeba ověřit.
8. Používej klasifikaci `FACT`, `DECISION`, `PLAN`, `PROPOSAL`, `UNKNOWN`. Nikdy nepřeváděj `PROPOSAL` na `DECISION` bez explicitního rozhodnutí.
9. Po významné práci aktualizuj relevantní dokumenty této sdílené paměti.

Tato dokumentace je společná paměť mezi ChatGPT, Google Gemini / Google AI Studio, Codexem, Cursorem a dalšími nástroji. Každý agent odpovídá za to, že do ní nepřenese domněnku jako fakt.
