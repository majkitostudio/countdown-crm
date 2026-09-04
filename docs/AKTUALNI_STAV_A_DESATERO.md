# Aktuální stav a To-Do

**Snapshot:** 4. 9. 2026
**Baseline:** `main` na commitu `83e4362`
**Produktový status:** stabilizace před interním pilotem

Tento dokument je pracovní backlog a release checklist. Neříká, že celý produkt je production-ready; každá položka je uzavřená teprve po odpovídajícím ověření.

## Co je hotové

- hlavní Operator Console workflow: claim, call lifecycle, outcome, callback, recovery a objednávka,
- `Operator Next Action`: stavová hlavní další akce bez ručního procházení lead directory,
- první slice `Callback Recovery Inbox`: due/upcoming callbacky přímo v Operator Console se serverovým routingem,
- karta klienta s plným a kompaktním režimem,
- recent context řádek s posledním kontaktem, výsledkem, objednávkou a callbackem,
- callback modal s počátečním fokusem, klávesou `Escape`, obnovou fokusu a přístupným chybovým stavem,
- klávesové zkratky pro rychlé operátorské akce; při psaní do formuláře se neaktivují,
- Product Scripts s draft/publish/archive hranicí a sanitizací,
- role a workspace hranice v serverové vrstvě a Supabase RLS,
- Customer 360, deterministický Next Best Action, Team Leader Daily Brief a Wallet MVP,
- Telnyx foundation: serverové credentials, krátkodobý WebRTC token, call session/event persistence, podepsaný webhook a idempotentní event trail,
- Telnyx tabulky a RLS migrace jsou aplikované v linked Supabase prostředí.

## Co hotové není

- Telnyx live pilot je dočasně odložený kvůli ověření telefonního čísla mimo repo; live environment a veřejná webhook URL proto ještě nejsou ověřené end-to-end,
- inbound routing, nahrávání hovorů a přepis hovorů nejsou implementované,
- Gemini post-call AI pro přepis, verdikt a návrh poznámky není implementovaná,
- training a softphone fallback zůstávají simulací, dokud nebude výslovně zapnutá živá telefonní vrstva,
- fulfillment webhook a produkční payout nejsou součástí Wallet MVP.

## To-Do

### P1 — bezpečnost a pilotní důkaz

- [ ] dokončit testovací Team Leader provisioning, login, ověření role a cleanup,
- [ ] doplnit autentizovaný call → outcome/order → reload → SQL read-back pro kritické role,
- [ ] explicitně evidovat rozdíly migration history mezi repozitářem a každým cílovým prostředím.

### Vzdálené To-Do — Telnyx (externě blokované)

Telnyx integrační základ je v repozitáři připravený, ale živé ověření teď není
aktivní pracovní blok. Zakoupené číslo vedené pro Středočeský kraj neodpovídá
adrese žadatele, proto probíhá žádost o refundaci. Po potvrzení refundace bude
zakoupené číslo pro Moravskoslezský kraj potřeba ověřit a teprve potom navázat
na connection a projít pilotní důkaz.

- [ ] dokončit refundaci nevhodného krajského čísla,
- [ ] zakoupit a ověřit Telnyx číslo odpovídající skutečné adrese,
- [ ] přiřadit ověřené číslo k vybrané voice connection,
- [ ] nastavit serverové `TELNYX_*` proměnné a `NEXT_PUBLIC_TELNYX_ENABLED=true` pouze v cílovém environmentu,
- [ ] nasadit veřejnou webhook URL `/api/telephony/telnyx/webhook` a ověřit podpisy i eventy,
- [ ] projít přihlášený outbound hovor v browseru a ověřit lifecycle v UI i v databázi po reloadu,
- [ ] doplnit negativní role/workspace scénáře pro telephony data.

Do dokončení těchto externích kroků zůstává živý Telnyx flag vypnutý a
simulovaný softphone je jediný dostupný fallback.

### P1 — runtime stabilita před pilotem

- [ ] opravit a ověřit nedostupnost `/calendar` a `/wallet` v aktuálním cílovém workspace; rozlišit chybu datové vrstvy, chybějící migraci a rozdíl mezi lokálním/demo a linked prostředím,
- [ ] doplnit diagnostiku připravenosti workspace pro queue, calendar/reminders, wallet settings, published scripts a aktivní integrace,
- [ ] zajistit, aby selhání jedné podpůrné datové části neskrývalo dostupná data z ostatních zdrojů; například callbacky nesmí zmizet jen kvůli chybě osobních reminders.

### P1 — operátorský pracovní tok

- [x] přidat `Operator Next Action`: stavová hlavní další akce je v Operator Console a respektuje assignment, call lifecycle i recovery,
- [x] přidat první slice `Callback Recovery Inbox`: due/upcoming callbacky jsou v Operator Console a zůstávají omezené serverovým routingem; hlubší automatické recovery a claim callbacku jsou další krok,
- [x] přejmenovat negativní outcome na `Fail` a při jeho uzavření vyžadovat konkrétní důvod i krátkou poznámku; důvod a poznámka se ukládají odděleně pro další reporting,
- [ ] zrychlit post-call wrap-up tak, aby outcome, poznámka, další krok, callback a objednávka tvořily jeden krátký a jednoznačný tok chráněný proti dvojímu odeslání.

### P2 — operátorská čitelnost a vedení týmu

- [x] zlepšit čitelnost Product Scriptu bez interaktivních kroků: statické sekční nadpisy, vizuální hierarchie, oddělení textu k přečtení od interních poznámek, lepší kontrast a scan-friendly layout; zachovat souvislou osnovu bez potvrzování a klikání během hovoru,
- [ ] přidat předhovorový `Conversation Brief`: problém klienta, poslední relevantní kontakt, předchozí výsledek, callback promise a doporučený bezpečný další krok na jedné ploše,
- [ ] rozšířit schválené objection cards a FAQ o bezpečné formulace pro zdravotně citlivá témata; nesmí jít o diagnózu, léčebný slib ani improvizované tvrzení,
- [ ] přidat Team Leader Exception Queue pro overdue callbacky, stuck recovery, neuzavřené outcomes, dlouhé leases, failed workflows a chybějící publikované skripty; každá položka musí mít důvod, prioritu, vlastníka a bezpečnou další akci,
- [ ] vytvořit role-aware `Attention Layer`: operátor vidí další akci u klienta, teamleader týmové výjimky a admin stav workspace; nepřidávat další obecný dashboard bez akčního kontextu,
- [ ] přidat Team Leader Review pro hovor, transcript, outcome, použitý skript a ruční coaching feedback; AI může navrhovat místa k pozornosti, ale nesmí sama vydávat definitivní verdikt,
- [ ] přidat Admin `Workspace Readiness`: telefonie, webhook, migration history, RLS/role hranice, publikované skripty, callbacky, wallet a poslední kritické chyby se stavem `Ready`, `Needs attention` nebo `Blocked`,
- [ ] rozšířit správu Product Scriptů o diff draft/published, autora, účinnost, preview operátorského zobrazení a rollback předchozí verze,
- [ ] role-aware úvodní plochy: operátorova práce, teamleaderovy výjimky a adminovo zdraví workspace; zachovat společný shell a serverové role,
- [ ] přidat úzké Alert Center pouze pro akční upozornění s možností odložení a dohledatelným vyřešením; nebudovat obecný notifikační chat,
- [ ] rozšířit auditní log o kontext změny, předchozí/nový stav a vazbu na entitu pro změny rolí, skriptů, callbacků, outcomes, objednávek a telefonie,
- [ ] doplnit responsive layout pro menší displeje, nebo explicitně zdokumentovat desktop-only podporu,
- [ ] sjednotit jazyk UI a zkontrolovat označení `AI`, `live`, `simulation` a `Unavailable`, aby odpovídala skutečnému zdroji dat a nepůsobila jako neověřený příslib.

### P2 — AI po stabilizaci telefonie

- [ ] uložit bezpečný zdroj nahrávky nebo audio streamu s vazbou na call session,
- [ ] přidat serverovou Gemini transcription boundary bez vystavení klíče v browseru,
- [ ] po přepisu generovat editovatelný návrh verdiktu a poznámky pro operátora,
- [ ] oddělit retention, přístupová práva a případné mazání audio/transcript dat.

## Desatero pro práci na projektu

1. Každá změna má jasný cíl, hranici scope a způsob ověření.
2. Jeden commit řeší jednu tematickou věc.
3. UI stav není důkaz persistence; kritické zápisy ověřujeme po reloadu a v databázi.
4. Workspace a role se vynucují serverem a RLS, ne pouze skrytím tlačítka.
5. Žádná migration nebo změna live dat bez explicitního cíle a kontroly migration history.
6. Simulace, fallback a `Unavailable` musí být v UI pravdivě označené.
7. Nevymýšlíme latency, AI skóre, online stav, webhook nebo úspěšný hovor bez skutečného zdroje.
8. Před předáním spouštíme testy, lint, typecheck, build a kontrolu diffu.
9. Chybu opravujeme v příčině; nemažeme test ani bezpečnostní pravidlo jen kvůli zelenému běhu.
10. Po změně aktualizujeme tento stavový dokument, pokud se změnil scope, důkaz nebo blocker.

## Kdy lze říct „interní pilot je připravený“

- hlavní workflow projde skutečný Auth uživatel a zápisy přežijí reload,
- negativní role a cross-workspace scénáře jsou ověřené,
- Telnyx outbound call má ověřenou session, webhook lifecycle a bezpečné failure states,
- simulované plochy jsou zřetelně oddělené od živých dat,
- testy, lint, typecheck, build a databázové ověření mají známý výsledek,
- dokumentace odpovídá skutečnému runtime.

Do té doby je správný status: **stabilizační práce / interní pilot v přípravě**.
