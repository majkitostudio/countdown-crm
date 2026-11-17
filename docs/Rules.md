# Pravidla práce a dokumentace

Tato pravidla doplňují globální instrukce a [projektový AGENTS.md](../AGENTS.md); nenahrazují bezpečnostní postupy v [provozním návodu](OPERATIONS.md).

## Před prací a po ní

- Přečti relevantní instrukce, ověř stav pracovního stromu a zachovej cizí rozpracované změny. Nejasné zadání, destruktivní nebo externí zásah a rozšíření rozsahu nejprve projednej s uživatelem.
- Zvol kontroly podle dopadu změny. Výsledek i nespouštěné důležité kontroly přiznej; zdrojový test nenahrazuje běh aplikace a lokální běh nedokládá vzdálené nasazení. Před testem ověř prostředí a vedlejší účinky; testy se zápisem a vzdálené zásahy vyžadují předchozí dohodu.
- Zkontroluj diff. Commit vytvoř jen na žádost uživatele; pokud se při změně upravuje dokumentace, zahrň ji do stejného commitu.

## Kam co patří

| Soubor | Účel |
|---|---|
| [PROJECT_GUIDE.md](PROJECT_GUIDE.md) | Produktový kontext, role a platná produktová rozhodnutí. |
| [OPERATIONS.md](OPERATIONS.md) | Aktuální provozní postupy a bezpečnostní hranice; historické výsledky jen zřetelně označené. |
| [To-Do](To-Do/To-Do.md) | Stručný přehled otevřené práce a nevyřešených rozhodnutí, bez automatického závazku k pořadí. |
| [Later](To-Do/Later/To-Do-Later.md) | Odložené či zatím neschválené možnosti, které se nemají samovolně realizovat. |
| [ROADMAP.md](ROADMAP.md), [audit](REVIEW-2026-11-15.md) | Historické podklady a důkazy; nejsou aktuálním seznamem úkolů. |

## Jak udržovat aktuální stav

- Každá informace má jedno hlavní místo; ostatní soubory na ně odkazují. Při změně zdokumentovaného stavu uprav příslušný dokument, nikoli automaticky všechny.
- Do To-Do zapisuj jen otevřenou práci nebo rozhodnutí. Uveď podstatu, důležité omezení a případně odkaz na důkaz; nerozepisuj tam deník pokusů, výpisy testů ani opravené chyby. Hotové položky odstraň z aktivního seznamu až po odpovídajícím ověření; trvalá rozhodnutí a důležitá omezení zachovej na správném místě.
- Neúspěšný test sám o sobě není nový úkol. Přetrvávající potvrzenou chybu či nedostatečné ověření zaznamenej stručně jako otevřený problém; detailní diagnostiku ulož jen tehdy, je-li skutečně potřebná, do zřetelně datovaného záznamu mimo To-Do.
- U důležitého výsledku rozliš datum, prostředí, rozsah, výsledek a omezení. Neprezentuj historické výsledky jako současné ani implementaci jako nasazení. Rozpor nebo neověřený stav výslovně označ.
- Nezařazuj nové nápady mezi schválené závazky bez rozhodnutí uživatele. Odložené věci nepovažuj za úkol k okamžité realizaci.
- Historické podklady nemaž jen proto, že zestárly; označ jejich platnost a při přesunu oprav odkazy. Nepřepisuj historii migrací.

Context7 slouží k dohledání aktuální dokumentace knihoven a technologií podle příslušných instrukcí. Projektovou dokumentaci samočinně nesleduje ani neaktualizuje; za její údržbu při práci odpovídá agent.
