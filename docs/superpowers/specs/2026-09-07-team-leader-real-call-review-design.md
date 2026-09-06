# Team Leader Review reálného hovoru — návrh

## Cíl

Team Leader nebo administrátor otevře konkrétní skutečně uložený hovor, uvidí jeho skutečný výsledek, operátorskou poznámku, dostupný přepis a přesně zaznamenaný prodejní skript a zapíše vlastní hodnocení. Oprava hotového hodnocení nikdy nepřepíše minulost: vznikne nová revize a původní i nové znění zůstane viditelné v historii hovoru i v auditu.

## Rozsah

Tento krok rozšiřuje existující tok, nevytváří novou paralelní frontu hodnocení:

1. hlavním vstupem je stávající Exception Queue;
2. cílem je detail konkrétního hovoru na adrese `/calls/[callId]/review`;
3. stejný detail lze pro Team Leadera a administrátora otevřít také ze stávajícího seznamu hovorů;
4. stránka `/training/reviews` zůstává oddělená a nadále představuje pouze tréninkové simulace.

Exception Queue dnes u starších položek neuchovává vždy jednoznačný odkaz na konkrétní hovor. Takový odkaz se nesmí dopočítat stylem „vezmeme poslední hovor zákazníka“. U staré položky bez přesné vazby se zobrazí, že konkrétní hovor nebyl zaznamenán, a nabídne se otevření zákazníka nebo seznamu hovorů. Pro budoucí telefonní session vznikne přesná vazba session → uložený hovor, takže relevantní položka může otevřít správný review detail.

## Pravdivost dat

Review čte pouze data uložená v CRM:

- hovor z `calls`;
- výsledek z `calls.outcome`;
- důvod neúspěchu z `calls.fail_reason`;
- operátorskou poznámku z `calls.operator_note`;
- termín zpětného volání z `calls.callback_scheduled_at`;
- přepis z `calls.transcript`;
- identitu operátora a zákazníka z existujících vazeb;
- zdroj telefonní session (`telnyx`, `local_sip`, `simulation`), pokud byl přesně zaznamenán;
- snapshot skriptu zachycený při založení telefonní session.

Chybějící data se nezastupují odhadem ani ukázkovým obsahem. Uživatelské rozhraní používá jasné stavy „nezaznamenáno“ nebo „nedostupné“.

„Skutečný hovor“ v tomto návrhu znamená řádek z produkční tabulky `calls`, nikoliv tréninkovou session. Pokud tento řádek vznikl přes simulační telefonní adaptér, UI jej pravdivě označí jako simulaci a nebude jej vydávat za živý Telnyx hovor. U starých hovorů bez vazby na telefonní session bude zdroj označen jako nezaznamenaný.

Přepis má tři pravdivé podoby:

- strukturovaný JSON přepis se zobrazí jako jednotlivé repliky;
- starší neprázdný text se zobrazí jako „starší nestrukturovaný přepis“;
- prázdná hodnota se zobrazí jako „přepis nebyl zaznamenán“.

Současný parser zahazuje starší neprázdný text, pokud nejde převést na JSON. V tomto slicu se opraví tak, aby se existující text neztrácel. Review nevytváří přepis ani audiozáznam.

## Zachycení použitého skriptu

Přesný skript se zachytí na serveru při založení telefonní session, tedy ještě před vytočením hovoru. Zachycení až při ukončení hovoru není přijatelné, protože administrátor může během hovoru publikovat novou verzi.

Do `telephony_call_sessions` se přidají tato pole:

- `completed_call_id` — přesný odkaz na později vytvořený řádek v `calls`;
- `script_source` — `published_version`, `built_in_fallback` nebo `unavailable`;
- `script_product_id` a `script_product_title`;
- `script_version_id` a `script_version_number`, pokud byla použita publikovaná databázová verze;
- `script_snapshot_html` — přesný bezpečný HTML obsah zobrazený operátorovi;
- `script_captured_at`.

Staré session zůstanou v těchto polích prázdné. Nebudou zpětně doplněny současnou verzí skriptu. Review u takového hovoru zobrazí: „Verze použitého skriptu nebyla u tohoto hovoru zaznamenána.“

Nová session vznikne následovně:

1. klient pošle pouze ID právě vybraného produktu, nikdy vlastní HTML;
2. server ověří, že produkt patří do stejného workspace;
3. server načte právě publikovanou verzi skriptu;
4. pokud publikovaná verze neexistuje, zachytí přesný vestavěný fallback, který aplikace skutečně zobrazí;
5. pokud produkt nebyl vybrán, protože operátor žádný skript neviděl, uloží stav `unavailable`; neexistující nebo cizí ID produktu session odmítne;
6. telefonní session vrátí zachycený snapshot klientovi a panel operátora pro aktivní hovor zobrazí právě tento vrácený obsah.

Tím je zajištěno, že uložený snapshot je totožný s textem, který operátor během hovoru viděl. Pozdější publikování nebo archivace verze již starý snapshot nezmění.

Při dokončení hovoru existující idempotentní databázový tok doplní `telephony_call_sessions.completed_call_id`. Opakované dokončení stejné session musí vrátit stejný hovor a nesmí změnit zachycený skript.

## Datový model hodnocení

Vznikne jedna append-only tabulka `call_review_revisions`. „Append-only“ znamená, že se hotové řádky neupravují ani nemažou; oprava je nový řádek.

Každá revize obsahuje:

- `id`;
- `workspace_id`;
- `call_id`;
- `revision_number` začínající jedničkou;
- `verdict` — povinný lidský verdikt jako krátký text, maximálně 200 znaků;
- `coaching_note` — povinné vysvětlení nebo coaching, 3 až 4 000 znaků;
- `correction_reason` — u první revize prázdný, u každé opravy povinný, 3 až 1 000 znaků;
- `reviewer_id`;
- `created_at`;
- `supersedes_revision_id` — odkaz na bezprostředně předchozí revizi.

V tomto kroku se nevymýšlí pevný seznam obchodních známek ani kategorií verdiktu. Až bude schválená hodnoticí metodika, může se krátký text nahradit nebo doplnit strukturovaným scorecardem bez přepisování historických revizí.

První odeslání vytvoří revizi 1. Oprava vytvoří revizi 2, potom 3 atd. Formulář posílá číslo revize, ze které vycházel. Pokud mezitím jiný vedoucí uloží změnu, databáze starý formulář odmítne a vyžádá nové načtení. Tím se zabrání tichému přepsání práce kolegy.

## Oprávnění a bezpečnost

- Hodnocení a jeho historii smí načíst, vytvořit nebo opravit pouze role `team_leader` a `administrator` ve stejném workspace jako hovor.
- Operátor nesmí otevřít review stránku, načíst tabulku revizí ani uložit hodnocení přímým voláním serverové akce či databáze.
- Uživatel z jiného workspace nesmí zjistit existenci hovoru ani hodnocení.
- Přímé `UPDATE` a `DELETE` nad `call_review_revisions` nejsou povoleny žádné aplikační roli.
- Nová tabulka má zapnuté RLS a explicitní oprávnění. Politiky kontrolují roli i workspace, ne pouze skutečnost, že je uživatel přihlášený.
- Uložení revize proběhne jednou databázovou operací včetně auditního záznamu. Operace používá `SECURITY INVOKER`; oprávnění, pořadí revizí a neměnnost chrání RLS, omezené granty, validační trigger a unikátní omezení.

V první verzi je celý review detail včetně historie pouze manažerský. Případné budoucí zpřístupnění hotového coachingu operátorovi bude samostatné rozhodnutí s vlastními pravidly viditelnosti.

## Audit

Každé dokončení nebo oprava zapíše ve stejné databázové transakci také řádek do existujícího `audit_logs`:

- první revize používá akci `CALL_REVIEW_COMPLETED`;
- další revize používá akci `CALL_REVIEW_CORRECTED`;
- `target_resource` jednoznačně obsahuje ID hovoru a revize;
- `details` obsahuje přesný JSON předchozího a nového stavu, identitu hodnotitele a důvod opravy.

Zdrojovou historií je `call_review_revisions`; audit je nezávislá stopa, že ke změně došlo. Auditní obrazovka přestane u těchto událostí zobrazovat jen zkrácený řetězec a umožní otevřít celý původní i nový obsah.

## Uživatelský tok

### Exception Queue

Položka spojená s přesně známým hovorem nabídne akci „Otevřít hodnocení hovoru“. Přesná vazba vznikne pouze přes shodu `lead_queue_items.id` → `telephony_call_sessions.queue_item_id` → `telephony_call_sessions.completed_call_id`. Pokud některý článek chybí, UI to řekne a nebude vybírat hovor podle podobnosti nebo času.

### Seznam hovorů

Team Leader a administrátor mohou z existujícího detailu uloženého hovoru otevřít stejnou review adresu. Operátor tuto akci neuvidí.

### Detail hodnocení

Stránka `/calls/[callId]/review` zobrazí:

1. datum, délku hovoru, operátora a zákazníka;
2. skutečný outcome, důvod neúspěchu, callback a operátorskou poznámku;
3. strukturovaný, starší textový nebo nedostupný přepis;
4. zachycený skript včetně produktu a čísla verze, případně pravdivé upozornění, že verze nebyla zaznamenána;
5. formulář lidského verdiktu a coachingu;
6. nejnovější hodnocení a úplnou časovou historii předchozích revizí.

U neexistujícího nebo cizího hovoru stránka neprozradí data. Při konfliktu souběžných oprav zobrazí výzvu k novému načtení. Neúspěšné uložení nesmí v UI předstírat, že bylo hodnocení dokončeno.

## Hranice AI

V tomto slicu se žádná AI analýza neimplementuje a nevzniká pro ni nová tabulka. Databázovou operaci pro uložení verdictu může volat jen ověřený přihlášený Team Leader nebo administrátor.

Budoucí AI může dodat oddělený, jasně označený návrh míst k pozornosti. Nesmí zapisovat `verdict`, odeslat review formulář ani vytvořit revizi. Konečný verdikt a coaching vždy vytvoří člověk.

## TDD a ověření

Každé nové chování vznikne cyklem RED → GREEN → REFACTOR:

1. failing test pro zachování staršího textového přepisu;
2. databázové testy pro schéma, neměnnost, pořadí revizí, konflikt a přesný audit;
3. RLS testy pro Team Leadera, administrátora, operátora a cizí workspace;
4. testy zachycení publikované verze, fallbacku a stavu `unavailable` při založení session;
5. testy, že změna publikované verze po zahájení hovoru nemění snapshot;
6. testy přesného propojení session s dokončeným hovorem a idempotentního opakování;
7. testy datové vrstvy a serverových akcí review;
8. testy manager-only stránky, formuláře, opravy a historie;
9. testy vstupu z Exception Queue a seznamu hovorů bez odhadování starých vazeb;
10. testy úplného zobrazení auditní změny.

Před dokončením musí projít databázové pgTAP testy, aplikační testy, lint, TypeScript kontrola a produkční build. Následuje ruční ověření rolí v prohlížeči, načtení po reloadu a databázový read-back. Supabase migrace se nejdřív ověří lokálně; do připojeného sandboxu se použije až čistá, zkontrolovaná migrace a následně se spustí bezpečnostní a výkonnostní advisories.

## Mimo rozsah

Tento krok nezahrnuje:

- samostatnou frontu `/call-reviews`;
- nové AI hodnocení nebo AI tabulky;
- automatické vytváření transcriptu či audiozáznamu;
- zpětné hádání skriptu nebo vazby Exception Queue na hovor;
- scorecard, bodování nebo pevné obchodní kategorie bez schválené metodiky;
- zobrazování coachingu operátorovi;
- obecnou přestavbu auditního systému mimo úplné zobrazení událostí call review.

## Akceptační kritéria

Funkce je hotová pouze tehdy, když platí všechno následující:

- review vždy pracuje s konkrétním existujícím řádkem `calls`;
- starý hovor bez zachyceného skriptu nikdy nezobrazí současnou ani odhadnutou verzi;
- nový hovor uchová přesný serverový snapshot skriptu z okamžiku zahájení session;
- outcome, poznámka a transcript se zobrazují bez domýšlení;
- neprázdný starší textový transcript se neztratí;
- pouze Team Leader nebo administrátor stejného workspace může hodnotit;
- oprava vloží novou revizi a původní řádek zůstane nezměněný;
- historie i audit ukazují přesné staré a nové znění;
- souběžná oprava založená na zastaralé revizi je odmítnuta;
- Exception Queue nepřiřadí starému záznamu hovor odhadem;
- AI nemá cestu k vytvoření verdictu;
- všechny automatické i ruční ověřovací brány projdou.
