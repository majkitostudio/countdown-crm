# Countdown CRM — průvodce projektem

## Co projekt řeší

Countdown je provozní CRM na míru pro call centrum, které prodává doplňky stravy. Propojuje práci operátorů, Team Leaderů a administrátorů kolem leadů, hovorů, objednávek, produktů, týmů, kvality, tréninku a reportingu. Projekt se průběžně stabilizuje a rozvíjí; není cílem tlačit ho k prodeji nebo dokončení MVP.

**Operator Console je klíčová pracovní plocha operátora, ne celý produkt.** Nové funkce mají mít jasnou roli a pracovní účel. Data a chování mají zůstat pravdivé: rozhraní nesmí předstírat výsledek, dostupnost integrace ani uložení, které systém nepotvrdil.

## Organizační model

- **Workspace** je oddělené prostředí firmy včetně jejích dat, produktů, integrací a uživatelů.
- **Department P1–P4** označuje typ práce. V současném datovém modelu se oddělení odvozuje z týmu; nejde o samostatnou databázovou entitu.
- **Team** sdružuje operátory pod Team Leaderem a patří k oddělení. Výchozí název týmu je department a iniciála příjmení Team Leadera, například `P1K`.
- **Administrátor** spravuje celý Workspace. **Team Leader** vede svůj tým, pomáhá operátorům a sleduje provoz. **Operátor** pracuje s přidělenou frontou svého týmu.

## Zamýšlený tok práce P1–P4

- **P1 — Senior Sales / Hot Leads:** prioritní nebo náročnější odchozí práce zkušených operátorů.
- **P2 — Standard Sales:** běžná odchozí práce. Konkrétní zdroj ani nabídka se neurčují v kódu.
- **P3 — Retence a péče:** návrat zákazníka do fronty 21 dní po doručení objednávky (`orders.delivered_at`).
- **P4 — Záchrana:** vybrané recyklovatelné neúspěchy z P1/P2 po 24 hodinách, vratky určené k Re-shipu a zásilky na výdejně déle než 3 dny bez hovoru. Ne každý neúspěšný hovor se recykluje; důvody určené k uzavření zůstávají uzavřené.
- Po úspěšné objednávce nebo záchraně pokračuje zákaznický tok až po doručení; do P3 vstupuje po uplynutí 21 dní.

Tento model popisuje zamýšlené směrování, ne požadavek mít nyní reálný zdroj leadů. Databázový trigger zajistí, že nový lead vložený do databáze dostane položku fronty. Samotný kontrakt externího příjmu (API/webhook, validace, deduplikace a zdroj) zůstává samostatnou budoucí možností.

Záznam bez potvrzeného týmu (`team_id IS NULL`) je záměrný stav čekající na administrátora, nikoli chybný záznam. Potvrzení týmu u leadu a položky fronty se doplňuje oběma směry, aniž by přepsalo již potvrzený tým.

## Produktové principy

- Zobrazuj práci podle skutečných rolí a workflow, ne podle struktury databázových tabulek.
- Uživatelské chyby formuluj česky a bezpečně; interní technické zprávy z databáze nevypisuj přímo do rozhraní.
- Pohyb používej jen k objasnění změny nebo návaznosti a vždy respektuj předvolbu omezeného pohybu.
- Nezaváděj obecné moduly, vlastní entity ani další obrazovky bez konkrétního pracovního přínosu.
- Skutečný zdroj leadů ani produkční telefonie nejsou podmínkou pro iteraci nad ostatními částmi systému.
- Nezaměňuj návrh nebo historický audit za schválené zadání. Stav implementace ověřuj v kódu a testech; stav nasazení ověř zvlášť.

## Hlavní obrazovky a cesty

Hlavní pracovní trasy (nejde o úplný seznam všech rout): `/console` · `/leads` · `/orders` · `/products` · `/schedule` · `/team` · `/team/exceptions` · `/team/reviews` · `/call-logs` · `/reports` · `/audit` · `/training` · `/wallet` · `/automations` · `/admin`.

Navazující detailní a správní trasy: `/leads/[leadId]` · `/orders/new` · `/orders/[orderId]` · `/orders/[orderId]/edit` · `/call-logs/[callId]/review` · `/team/reviews/[sessionId]` · `/settings` · `/settings/scripts` · `/admin/users` · `/admin/ownership` · `/admin/settings`.

Kořenová cesta `/` uživatele přesměruje podle role: operátora na `/console`, Team Leadera na `/team/exceptions` a administrátora na `/reports`. `/telephony` je administrátorská místní testovací konzole SIP/Asterisk, nikoli produkční VoIP. Přihlašovací a obnovovací stránky nejsou v seznamu pracovních obrazovek.

Technický postup a bezpečné příkazy jsou v [provozním návodu](OPERATIONS.md). Read-only důkaz linked databáze popisuje [runner P0.3](P0_3_REMOTE_DB_RUNNER.md). Otevřenou práci najdeš v [To-Do](To-Do/To-Do.md), odložené možnosti v [Later](To-Do/Later/To-Do-Later.md) a pravidla dokumentace v [Rules](Rules.md).
