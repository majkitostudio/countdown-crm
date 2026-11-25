# Otevřená práce

Stručný seznam známé otevřené práce po kontrolách 21. a 22. 11. 2026. Pořadí není schválený harmonogram; před zahájením vyber rozsah s uživatelem. Historické důkazy a omezení jsou v [roadmapě](../ROADMAP.md), odložené možnosti v [Later](Later/To-Do-Later.md).

## Funkčnost, data a ověření

- [ ] Ověřit aktuální bezpečnostní hlášení k závislostem a naplánovat potřebné aktualizace. Při kontrole 21. 11. nebyl registr npm dostupný.
- [ ] Potvrdit úplnost starších záznamů v `audit_logs` po zavedení RPC `update_telephony_adapter_with_audit`. Čtyři změny adaptéru z 5. 9.–18. 11. mají aktéra i detail; pomocné přepnutí sandboxu na `simulation` při této kontrole obešlo RPC a auditní stopu, poté byl adaptér vrácen na `local_sip`. Podrobnosti jsou v [provozním záznamu](../OPERATIONS.md#sandboxový-průchod-a-opravy-22-11-2026).
- [ ] Vybrat stabilní adresu testovací aplikace a teprve potom nastavit Site URL/povolené Redirect URLs v sandboxu. Nynější Site URL `http://localhost:3000` nesouhlasí s aplikací na `127.0.0.1:3001`; obě funkce pro pozvání vynechávají `redirectTo`. Výchozí e-mailovou šablonu nelze upravit bez vlastního SMTP. Doručení a přijetí nové pozvánky v sandboxu proto zůstává neověřené. Místní pozvánka dorazila do Mailpitu, ale nastavení hesla čeká na uživatele. Opětovné poslání, zotavení po částečném selhání a oprávnění `provision:user` jsou ověřeny synteticky.
- [ ] Doplnit úplnou matici povolených a zamítnutých akcí všech tří rolí napříč týmy. Hlavní průchod lead–simulovaný hovor–objednávka–kontrola byl po změnách přístupů zopakován místně; role administrátora, vedoucího a operátora byly přihlášeny a zákaz administrace pro poslední dvě role ověřen. Úplný sandboxový průchod po migracích ani všechny akce a týmy ověřeny nebyly. [Výsledky a rozsah](../OPERATIONS.md).
- [ ] Prověřit první zahájení hovoru po ručním přiřazení. Při lokálním testu se poprvé objevilo `Operator is not available for a call`; po obnovení dostupnosti a bezpečném opakování simulovaný hovor proběhl. Zjistit, zda jde o krátké čekání na heartbeat, nebo závod v nastavení dostupnosti.
- [ ] Dokončit ověření přístupnosti, responzivity a ovládání: skutečná čtečka obrazovky, zvětšení na 200 % a úplná kontrola klávesnicí nebyly provedeny. Klávesnicová editace, uložení a publikace syntetické verze skriptu jsou ověřené.
- [ ] Ověřit chybějící a nedostupné údaje na relevantních obrazovkách a exportech, zejména Call Logs. Call Logs nyní zobrazuje hodnotu objednávky jako CZK; rozhodnout, zda produkt potřebuje měnu uloženou pro každý hovor zvlášť.
- [ ] V sandboxu ověřit trvalé vytvoření měsíční uzávěrky/účetního zápisu. Výpočet byl prověřen nad syntetickou objednávkou v transakci vrácené zpět; zápis uzávěrky zatím ověřen není. Doručení do P3, opakované doručení a vratka byly ověřeny na syntetické objednávce. Opakovaný nákup nadále posuzuje člověk; automatické vytváření objednávky není schválené.

## Prostředí a pracovní postup

- [ ] Průběžně udržovat dokumentaci aktuální a prověřovat účel podezřelých či duplicitních souborů; nic nemazat bez posouzení a dohody.

Podrobnosti a výsledky historických testů patří do datovaných podkladů, nikoli do tohoto seznamu. Pravidla údržby jsou v [Rules](../Rules.md).
