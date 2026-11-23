---
description: Proveď nezměnovou revizi aktuálních změn v Velocity CRM.
---

Proveď read-only revizi změn v projektu Velocity CRM; žádné soubory neupravuj a nespouštěj testy ani aplikaci.

1. Zkontroluj `git status`, `git diff` (unstaged), `git diff --cached` (staged) a nové soubory z `git ls-files --others --exclude-standard`; relevantní nové soubory také přečti. Nečti ani nevypisuj `.env` a tajné hodnoty.
2. Pokud uživatel zadal rozsah v `$ARGUMENTS`, drž se ho. Jinak reviduj aktuální změny pracovního stromu. Když nejsou žádné, nevybírej si svévolně starý commit — stručně požádej o konkrétní rozsah.
3. Projdi celé změny a potřebný okolní kód. Zvaž správnost, regresní chyby, bezpečnost, krajní případy, testy a podle změny také přístupnost či české UI. Použij dostupný odpovídající skill; pro změny rozhraní například `interface-review`.
4. Uváděj jen konkrétní a doložitelné nálezy, nejdřív nejzávažnější. Ke každému připoj závažnost, soubor a řádek, co se může pokazit a proč. Odděl ověřený problém od nejistoty. Neopakuj obecné pochvaly.
5. Pokud nic nenajdeš, řekni to výslovně a uveď případné neověřené oblasti. Nepředstírej, že revize zdrojového kódu ověřila běh aplikace.
