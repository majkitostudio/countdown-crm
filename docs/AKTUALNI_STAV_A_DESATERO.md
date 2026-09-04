# Aktuální stav a To-Do

**Snapshot:** 4. 9. 2026
**Baseline:** `main` na commitu `b609e8d`
**Produktový status:** stabilizace před interním pilotem

Tento dokument je pracovní backlog a release checklist. Neříká, že celý produkt je production-ready; každá položka je uzavřená teprve po odpovídajícím ověření.

## Co je hotové

- hlavní Operator Console workflow: claim, call lifecycle, outcome, callback, recovery a objednávka,
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

- v Telnyx účtu zatím není aktivní číslo přiřazené ke connection,
- live Telnyx environment a veřejná webhook URL ještě nejsou ověřené end-to-end,
- inbound routing, nahrávání hovorů a přepis hovorů nejsou implementované,
- Gemini post-call AI pro přepis, verdikt a návrh poznámky není implementovaná,
- training a softphone fallback zůstávají simulací, dokud nebude výslovně zapnutá živá telefonní vrstva,
- fulfillment webhook a produkční payout nejsou součástí Wallet MVP.

## To-Do

### P1 — dokončit ověřitelný telefonní základ

- [ ] získat a přiřadit Telnyx číslo k vybrané voice connection,
- [ ] nastavit serverové `TELNYX_*` proměnné a `NEXT_PUBLIC_TELNYX_ENABLED=true` pouze v cílovém environmentu,
- [ ] nasadit veřejnou webhook URL `/api/telephony/telnyx/webhook` a ověřit podpisy i eventy,
- [ ] projít přihlášený outbound hovor v browseru a ověřit lifecycle v UI i v databázi po reloadu,
- [ ] doplnit negativní role/workspace scénáře pro telephony data.

### P1 — bezpečnost a pilotní důkaz

- [ ] dokončit testovací Team Leader provisioning, login, ověření role a cleanup,
- [ ] doplnit autentizovaný call → outcome/order → reload → SQL read-back pro kritické role,
- [ ] explicitně evidovat rozdíly migration history mezi repozitářem a každým cílovým prostředím.

### P1 — runtime stabilita před pilotem

- [ ] opravit a ověřit nedostupnost `/calendar` a `/wallet` v aktuálním cílovém workspace; rozlišit chybu datové vrstvy, chybějící migraci a rozdíl mezi lokálním/demo a linked prostředím,
- [ ] doplnit diagnostiku připravenosti workspace pro queue, calendar/reminders, wallet settings, published scripts a aktivní integrace,
- [ ] zajistit, aby selhání jedné podpůrné datové části neskrývalo dostupná data z ostatních zdrojů; například callbacky nesmí zmizet jen kvůli chybě osobních reminders.

### P1 — operátorský pracovní tok

- [ ] přidat `Operator Next Action`: podle aktuálního assignmentu a call lifecycle vždy jasně zobrazit jednu hlavní další akci bez možnosti ručního procházení lead directory,
- [ ] přidat `Callback Recovery Inbox`: due/overdue callbacky, přerušené hovory a potřebné návraty zobrazit přímo v pracovní ploše operátora při zachování callback affinity a serverového routingu,
- [ ] zrychlit post-call wrap-up tak, aby outcome, poznámka, další krok, callback a objednávka tvořily jeden krátký a jednoznačný tok chráněný proti dvojímu odeslání.

### P2 — operátorská čitelnost a vedení týmu

- [ ] zlepšit čitelnost Product Scriptu bez interaktivních kroků: statické sekční nadpisy, vizuální hierarchie, oddělení textu k přečtení od interních poznámek, lepší kontrast a scan-friendly layout; zachovat souvislou osnovu bez potvrzování a klikání během hovoru,
- [ ] přidat Team Leader Exception Queue pro overdue callbacky, stuck recovery, neuzavřené outcomes, dlouhé leases, failed workflows a chybějící publikované skripty,
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
