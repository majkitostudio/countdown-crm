# Otevřená práce

Stručný seznam známé otevřené práce po kontrolách 21. a 22. 11. 2026, doplněný 24. 11. o stav přejmenování a nasazení. Pořadí není schválený harmonogram; před zahájením vyber rozsah s uživatelem. Historické důkazy a omezení jsou v [roadmapě](../ROADMAP.md), odložené možnosti v [Later](Later/To-Do-Later.md).

- [ ] **Rozhodnout o nasazení této větve do testovacího prostředí:** lokální browser QA proběhlo nad sandboxem; `dev.majkito.com` je ale připnutá na `codex/velocity-crm-rebrand`, zatímco tento pracovní strom je na `codex/countdown-qa-branch-workflow` a odpovídající nasazení nemá. Pokud má být změna ověřena i na testovací doméně, nejdřív vybrat cílovou větev a postup nasazení. Podrobnosti jsou v [provozním záznamu](../OPERATIONS.md#stav-přejmenování--24-11-2026).

## Funkčnost, data a ověření

- [ ] Ověřit aktuální bezpečnostní hlášení k závislostem a naplánovat potřebné aktualizace. Při kontrole 21. 11. nebyl registr npm dostupný.
- [ ] Potvrdit úplnost starších záznamů v `audit_logs` po zavedení RPC `update_telephony_adapter_with_audit`. Čtyři změny adaptéru z 5. 9.–18. 11. mají aktéra i detail; pomocné přepnutí sandboxu na `simulation` při této kontrole obešlo RPC a auditní stopu, poté byl adaptér vrácen na `local_sip`. Podrobnosti jsou v [provozním záznamu](../OPERATIONS.md#sandboxový-průchod-a-opravy-22-11-2026).
- [ ] Ověřit Site URL a povolené Redirect URLs sandboxu, odkazy v pozvánkách a jejich přijetí na `dev.majkito.com`. Vercel doménu potvrzuje, nastavení Supabase po přejmenování však nebylo zkontrolováno. Při kontrole 22. 11. místní Site URL `http://localhost:3000` nesouhlasila s aplikací na `127.0.0.1:3001` a funkce pro pozvání vynechávaly `redirectTo`; jde o historický nález. Místní pozvánka byla ověřena přes Mailpit, doručení a přijetí v sandboxu nikoli. Změna místního `supabase/config.toml` vzdálenou šablonu neupravuje.
- [ ] Doplnit úplnou matici povolených a zamítnutých akcí všech tří rolí napříč týmy a poté uzavřít závěrečný checkpoint. Před během potvrdit aktuální adresu aplikace a cíl sandboxu. Hlavní průchod a omezené kontroly rolí jsou zaznamenány v [provozních výsledcích](../OPERATIONS.md); úplná matice zatím ověřena nebyla.
- [ ] Prověřit první zahájení hovoru po ručním přiřazení. Při lokálním testu se poprvé objevilo `Operator is not available for a call`; po obnovení dostupnosti a bezpečném opakování simulovaný hovor proběhl. Zjistit, zda jde o krátké čekání na heartbeat, nebo závod v nastavení dostupnosti.
- [ ] Ověřit zákazníkův vzdálený zvuk a hlasitost přes SIP/Telnyx během skutečného hovoru. Místní simulace potvrdila zastavení tónu po spojení, zachování plovoucího ovládání při přechodu na Objednávky a zavěšení z jiné stránky; neposkytuje ale vzdálený zvuk zákazníka. Obnova výsledku po obnovení stránky byla následně uložena přes UI. [Záznam](../OPERATIONS.md#ověření-obnovy-ovládání-hovoru--22-11-2026).
- [x] Ověřit v browseru průchod tlačítka „Vytvořit objednávku“ z panelu obnovy po přerušeném hovoru. Lokální kontrola potvrdila formulář v režimu hovoru i výchozí zemi `CZ`; objednávka nebyla odeslána. Rozsah a omezení jsou v [provozním záznamu](../OPERATIONS.md#ověření-toku-objednávky--24-11-2026).
- [ ] Dokončit ověření přístupnosti, responzivity a ovládání: skutečná čtečka obrazovky, zvětšení na 200 % a úplná kontrola klávesnicí nebyly provedeny. Klávesnicová editace, uložení a publikace syntetické verze skriptu jsou ověřené.
- [ ] Ověřit chybějící a nedostupné údaje na relevantních obrazovkách a exportech, zejména Call Logs. Call Logs nyní zobrazuje hodnotu objednávky jako CZK; rozhodnout, zda produkt potřebuje měnu uloženou pro každý hovor zvlášť.
- [ ] V sandboxu ověřit trvalé vytvoření měsíční uzávěrky/účetního zápisu. Výpočet byl prověřen nad syntetickou objednávkou v transakci vrácené zpět; zápis uzávěrky zatím ověřen není. Doručení do P3, opakované doručení a vratka byly ověřeny na syntetické objednávce. Opakovaný nákup nadále posuzuje člověk; automatické vytváření objednávky není schválené.

## Prostředí a pracovní postup

- [ ] Průběžně udržovat dokumentaci aktuální a prověřovat účel podezřelých či duplicitních souborů; nic nemazat bez posouzení a dohody.

Podrobnosti a výsledky historických testů patří do datovaných podkladů, nikoli do tohoto seznamu. Pravidla údržby jsou v [Rules](../Rules.md).
