# Otevřená práce

Stručný seznam známé otevřené práce při reorganizaci dokumentace 17. 11. 2026. Pořadí není schválený harmonogram; před zahájením vyber rozsah s uživatelem. Historické důkazy a omezení jsou v [roadmapě](../ROADMAP.md), odložené možnosti v [Later](Later/To-Do-Later.md).

## Funkčnost, data a ověření

- [ ] Podle dopadu řešit potvrzené překážky práce a rizika nesprávných dat; konkrétní problém a rozsah vždy nejprve ověřit.
- [x] Nasadit do sandbox preview aplikaci s RPC `update_telephony_adapter_with_audit` a se zákazem přímých zápisů auditu. Obě migrace (`20261118120000`, `20261118130000`) už jsou v sandbox DB a lokální aplikace `901c22a` proti ní prošla; starší preview `5acc9ff` po migracích nezapíše nastavení telefonie ani audit. Ve Vercelu ověřeno: branch `work/clean-baseline`, commit `4d35417`, status Ready. Historické audity zůstávají bez zpětného ověření.
- [ ] Dokončit ověření zakládání pracovníků a částečných selhání. Nové dokončení pozvánky prošlo lokálně s upraveným odkazem; ověřit celý tok se skutečně odeslanou novou šablonou a nastavit ji i v sandboxu se správnou Site URL. Bezpečné opětovné zaslání prošlé pozvánky zatím chybí.
- [ ] Dokončit funkční, technické a vizuální review hlavních tras a bezpečných scénářů za administrátora, Team Leadera a operátora. Smoke a `/console` mohou mít vedlejší účinky; prostředí a syntetická data je nutné předem potvrdit.
- [ ] Dokončit revizi UI/UX podle rolí a četnosti použití, včetně responzivity, klávesnice, 200% zvětšení a skutečné čtečky obrazovky.
- [ ] Bezpečně ověřit klávesnicovou editaci a uložení návrhu skriptu; nepublikovat mimo schválená syntetická data.
- [ ] Dokončit sjednocení zobrazení prázdných, chybějících a nedostupných hodnot a ověřit odpovídající datové stavy včetně Call Logs a případných exportů.
- [ ] Na bezpečných syntetických datech runtime ověřit P3, vratky a návazné záznamy. Opakovaný nákup nadále posuzuje člověk; automatické vytváření objednávky není schválené.
- [ ] Vyjasnit měnový údaj u Call Logs: starší úkol požaduje jeho doplnění, pozdější rozhodnutí používá pro jednotlivý hovor výchozí CZK a změnu modelu nepovažuje za nutnou. Bez rozhodnutí neměnit datový model.

## Prostředí a pracovní postup

- [ ] Průběžně udržovat dokumentaci aktuální a prověřovat účel podezřelých či duplicitních souborů; nic nemazat bez posouzení a dohody.

Podrobnosti a výsledky historických testů patří do datovaných podkladů, nikoli do tohoto seznamu. Pravidla údržby jsou v [Rules](../Rules.md).
