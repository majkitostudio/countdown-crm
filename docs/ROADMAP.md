# Countdown CRM — stav a možné další kroky

Roadmapa zachycuje dohodnutý pracovní postup a další možné směry. Implementaci, testování a nasazení vždy eviduj jako odlišné stavy; položku odškrtni až po dokončení a odpovídajícím ověření.

## To-Do — obnovení práce na projektu

- [x] Ověřit dostupné vývojové a testovací prostředí, připojení databáze, testovací účty a syntetická data pro bezpečné testování čtení i zápisu.
  - Stav 11. 11. 2026: hotovo pro lokální aplikaci připojenou k ověřenému Supabase sandboxu. Přihlášení a čtení ověřeno pro role operator, team_leader a administrator; operátor úspěšně uložil nezměněnou syntetickou předvolbu. Lokální databáze samotná zůstává nespouštěná bez Dockeru; podrobnosti a omezení jsou v [provozním návodu](OPERATIONS.md).
- [ ] Spustit aplikaci, projít hlavní obrazovky za jednotlivé role a prověřit načítání Operator Console.
- [ ] Ověřit hlavní pracovní scénáře: lead a frontu, práci operátora, výsledek hovoru, objednávku a navazující práci vedoucího; zaznamenat ověřené nedostatky a otevřená produktová rozhodnutí.
- [ ] Postupně opravit potvrzené chyby a technický dluh podle dopadu, zejména překážky práce a rizika nesprávných dat.
- [ ] Průběžně prověřovat účel zastaralých či duplicitních souborů a udržovat stávající dokumentaci stručnou a aktuální.
- [ ] Provést úplnou revizi UI/UX podle rolí a četnosti použití: navigaci, typografii, barvy, rozložení, přístupnost, responzivitu a vhodné animace.
- [ ] Zopakovat celkové funkční, technické a vizuální review s důkazy o provedených kontrolách a jasně uvedenými omezeními.

## Poslední známý stav hlavní větve

Tento souhrn odpovídá stavu zaznamenanému do 20. 10. 2026 v hlavní větvi. Neprokazuje dnešní stav vzdálené databáze ani necommitnutou práci v jiných pracovních stromech.

- Fáze 0–6 byly v dokumentaci označeny jako hotové: pročištění; navigace a Admin Hub; sjednocení názvů, obrazovek a URL; objednávky; model P1–P4; migrace a databázové testy; vlastnictví záznamů a automatické zařazení leadů; Team Leader přehledy.
- Fáze 7 (QA, regrese a release gate) zůstávala částečná. V repozitáři jsou CI kontroly, ověřování migrací a Playwright smoke příkaz; jejich přítomnost sama nedokládá aktuální úspěšný běh ani ověřený provoz všech rolí.
- Poslední zaznamenaný linked migration parity byl 136 = 136 dne 19. 10. 2026. Stav sandboxu, platnost migračního tokenu a jeho parity je nutné znovu ověřit před jakoukoli další změnou vzdálené databáze.
- Přehledy Team Leaderů, Schedule a terminologie „scheduled call“ byly ve starší dokumentaci označené jako dokončené. Historická čísla testů a počet migrací nepovažuj za dnešní výsledek bez opětovného spuštění kontrol.

## Možné směry — bez schváleného pořadí

- Dokončit Fázi 7: vymezit důkazy pro regresi rolí, stavových toků, smoke průchodů a migrací.
- Prověřit ochranu proti opakovaným objednávkám a historii vratek.
- Zvážit, jak má Team Leader vidět leady bez potvrzeného týmu.
- Zvážit, zda a jak se Operator Console přizpůsobí odděleními řízenými profily.
- Kdykoli PM zvolí, prozkoumat AI podporu, plánování směn, produktovou kartu nebo přepracování trenažéru.
- Externí příjem leadů (API/webhook) je samostatná budoucí schopnost, nikoli podmínka nynější práce na CRM.

Tyto body nejsou schválené závazky ani doporučené pořadí. U každého před zahájením znovu potvrď účel, roli a požadovaný výsledek s PM.

## Před dalším databázovým nebo release krokem

1. Zkontrolovat aktuální větev a pracovní stromy; nepřebírat necommitnuté změny bez revize.
2. Spustit kontroly odpovídající změně podle [provozního návodu](OPERATIONS.md).
3. Linked databázi a její migrace ověřovat odděleně od lokálního běhu. Výsledek lokálního testu není důkazem stavu sandboxu ani produkce.
