# Team Workspace a AI kontrola kvality — produktová specifikace

**Datum:** 16. 9. 2026  
**Stav:** schváleno k implementaci  
**Prostředí pro implementaci a důkaz:** Sandbox  
**Production:** beze změny

## Cíl

Přestavět současnou technickou Exception Queue na jednu přehlednou týmovou
pracovní plochu pro Team Leadera. Team Leader má pečovat o jeden nebo více
svěřených týmů, nikoli řešit technické problémy celého workspace.

Pracovní název stránky je `Team Workspace`. `Team Checkpoint` je kandidát pro
výchozí denní pohled, nikoli nutně pro celou stránku.

## Produktová rozhodnutí

### Jedna plocha, přepínatelné pohledy

Team Leader uvidí jednu týmovou pracovní plochu, ale vždy jeden jasný hlavní
pohled. Navržené pohledy jsou:

- `Daily Checkpoint`,
- `Kontrola kvality hovorů`,
- `Objednávky`,
- `Aktivní operátoři`,
- `Callbacky a týmová fronta`,
- odkaz na samostatné `Plánování směn`.

Technické workspace-global problémy, například selhání workflow nebo chybějící
produktový skript, zůstávají v administrátorském rozsahu a do týmové plochy
nepatří.

### Daily Checkpoint

Výchozí období je dnešek. Team Leader může přepnout na týden nebo vlastní
období.

Daily Checkpoint zobrazí především:

- nové objednávky vlastního týmu,
- prošlé callbacky vlastního týmu,
- aktuální výsledky po jednotlivých operátorech.

Výsledky obsahují minimálně počet prodejů, počet Failů, konverzi, Talk Time,
počet vytočených hovorů a počet hovorů spojených s klientem. Další statistiky se
přidají až po schválení jejich významu.

### Definice výsledků

- **Počet prodejů:** všechny započítané objednávky vlastního týmu ve zvoleném
  období, včetně objednávek vytvořených ručně i objednávek vzniklých po hovoru.
- **Konverze:** počet všech těchto prodejů dělený počtem Failů.
- **Nulový počet Failů:** konverze je nevypočitatelná; nesmí se vydávat za `0 %`
  ani `100 %`.
- **Talk Time:** celkový čas operátora v telefonním procesu za dané období,
  včetně vytáčení a vyzvánění u nepřijatých hovorů.
- **Talk Time procento:** Talk Time dělený délkou konkrétní naplánované směny
  operátora. Směna může mít například 8 nebo 12 hodin; nepoužívá se pevná délka
  pro všechny operátory.
- **Chybějící směna:** pokud směna není naplánovaná nebo ověřená, procento Talk
  Time je nedostupné, nikoli vymyšlená nula.

U ručně vytvořené objednávky se prodej započítá do výsledků a konverze, ale
objednávka sama nevytvoří bonus. Finančně se u ní smí započítat pouze provize.
Team Leader však může opravit zdroj objednávky. Zobrazované názvy budou
srozumitelné, například `Manual Creation` a `Post-call`; interní databázové
hodnoty se nemusí měnit jen kvůli textu v UI. Pokud Team Leader změní zdroj
z `Manual Creation` na `Post-call`, systém má jednorázově připsat bonus původnímu
operátorovi podle platného bonusového pravidla. Změna musí mít auditní stopu,
vyžadovat očekávanou revizi objednávky a nesmí vytvořit dvojitý bonus.

### Bonus při opravě zdroje objednávky

Bonus se u objednávky `Post-call` připíše okamžitě při vytvoření objednávky.
Platí tyto scénáře:

1. **Post-call → klient objednávku nepřevezme:** bonus se automaticky odečte
   z aktuálního nároku bez běžné Wallet položky, kterou by operátor viděl.
2. **Doručeno → výjimečné odstoupení od smlouvy:** objednávka byla nejprve
   úspěšně doručena a později je výjimečně označena jako `Anulováno`; Admin zadá
   částku odečtu a důvod. Odečet je viditelný ve Walletu.
3. **Manual → Post-call → Manual:** při první změně se bonus přičte původnímu
   operátorovi, při změně zpět se interně odečte. Operátor neuvidí ani jeden z
   těchto automatických korekčních pohybů jako běžnou Wallet transakci.
4. **Manual bez opravy zdroje:** objednávka nemá bonus, ale může se započítat do
   provize podle existujících pravidel.

Hlavním stavem pro nepřevzatý balíček je `Returned`. Tento stav se od výjimečného
`Anulováno` po doručení nesmí zaměňovat.

Systém musí oddělit aktuální nárok na bonus od viditelných Wallet transakcí.
Team Leader získává pouze oprávnění opravit zdroj objednávky; finanční korekce
ve Walletu zůstává výhradně Adminovi.
Automatické korekce musí mít interní auditní stopu, ale nesmějí se vydávat za
ruční finanční odečet Admina. Ruční odečet Admina při odstoupení od smlouvy je
naopak běžná viditelná Wallet korekce s částkou a důvodem.

Admin může v uživatelském rozhraní provést opravu nebo odebrání finančního
účinku, ale doporučená implementace nesmí fyzicky přepisovat ani mazat původní
neměnnou transakci. Zachová ji a přidá korekci s důvodem, autorem a časem.
Team Leader tuto finanční pravomoc nemá.

Současný Wallet bonus při doručení a reversal při vrácení je potřeba upravit tak,
aby nevznikl dvojitý bonus ani konflikt s novým okamžitým nárokem. Širší změna
payout logiky zůstává mimo rozsah.

Plánování směn je samostatný rozsáhlý systém. Tato změna ho neimplementuje.
Team Workspace může zobrazit stručný stav nebo odkaz, ale nesmí vytvořit malou
náhradní tabulku za směnový kalendář.

## AI kontrola kvality hovorů

### Rozsah

Kontrola se spouští u všech uložených **reálných** hovorů bez ohledu na výsledek:
úspěšné, neúspěšné, prodejní i neprodejní. Tréninkové hovory jsou vyloučené,
protože mají vlastní hodnocení a nesmějí ovlivnit obchodní výsledky ani frontu
kontroly reálných hovorů.

Team Leaderovy filtry určují, které výsledky uvidí. Neurčují, které hovory se
budou kontrolovat.

### Co se kontroluje

Poznámka má zachytit:

- problémy a potřeby klienta,
- důležité zjištěné informace,
- cíl nebo očekávání klienta,
- všechny nabídnuté varianty a ceny,
- reakci klienta na jednotlivé nabídky,
- konečný výsledek, důvod rozhodnutí a další krok nebo předání.

První filtry mohou hledat krátkou poznámku, krátký hovor, konkrétní důvod Failu
a úspěšný hovor nebo objednávku s podezřením na neúplnou poznámku.

### Úloha AI

AI pouze vytipuje případy doporučené ke kontrole a vysvětlí důvod. Nesmí:

- měnit výsledek hovoru nebo objednávku,
- vracet poznámku operátorovi,
- vytvářet nový workflow,
- rozhodovat o chybě operátora,
- diagnostikovat zdravotní stav,
- vydávat medicínský nebo právní závěr.

Team Leader si chybu zapamatuje a řeší ji běžnou zpětnou vazbou.

Výsledek má rozlišovat alespoň:

- pravděpodobně v pořádku,
- doporučeno zkontrolovat,
- nelze vyhodnotit.

U doporučení musí být uložený srozumitelný důvod, například že chybí reakce na
část nabídnutých cen. Nedostupnost AI se nesmí převést na stav „v pořádku“.

### Bezpečnost AI

- Gemini se volá pouze ze serveru.
- API klíč nesmí být v prohlížeči, v `NEXT_PUBLIC_*` proměnné ani v repozitáři.
- Poznámky mohou obsahovat citlivé zdravotní informace; zachová se workspace a
  team scope i auditní stopa.
- U kontroly reálných poznámek se nepoužije automatický fallback na jiného AI
  poskytovatele bez samostatného schválení.
- První ověření proběhne pouze nad Sandboxem nebo anonymními testovacími daty.

## Role a rozsah

- Team Leader vidí pouze své aktivní týmy.
- Administrator může vidět celý workspace podle stávajících administrátorských
  pravidel.
- Operator tuto pracovní plochu nepoužívá a nemůže si rozšířit rozsah URL nebo
  cizím ID.
- Historické hovory, objednávky a callbacky zachovají týmový rozsah podle
  existujícího týmového modelu.

## Mimo rozsah

- implementace samostatného plánování směn,
- živá telefonie, Telnyx a nahrávání hovorů,
- automatické vracení poznámek operátorům,
- automatické hodnocení nebo sankcionování operátorů,
- AI kontrola tréninkových hovorů,
- širší změna bonusové nebo payout logiky mimo cílenou opravu zdroje objednávky,
- automatické nahrazení ručního odečtu Admina při odstoupení od smlouvy,
- změny Production,
- technické workspace-global výjimky v Team Workspace.

## Akceptační kritéria

1. Team Leader otevře jednu pracovní plochu a přepíná mezi jasně oddělenými
   pohledy.
2. Daily Checkpoint zobrazí pouze týmové nové objednávky, prošlé callbacky a
   dnešní výsledky operátorů.
3. Tabulka výsledků obsahuje pro každého operátora prodeje, Faily, konverzi,
   Talk Time, vytočené a spojené hovory.
4. Talk Time procento používá individuální délku ověřené směny a při chybějící
   směně je nedostupné.
5. AI kontrola se spustí u každého uloženého reálného hovoru a ne u tréninku.
6. AI výsledek je pouze doporučení ke kontrole a nemění obchodní data.
7. Team Leader může výsledky AI filtrovat podle typu výsledku, důvodu, délky
   hovoru a kvality poznámky; později si může uložit vlastní kontrolní pohled.
8. Workflow/product globální problémy Team Leader nevidí jako své týmové úkoly.
9. Cross-team a cross-workspace přístupy selžou na serveru nebo RLS vrstvě.
10. Team Leader může opravit zdroj objednávky pouze přes autorizovanou serverovou
    hranici; změna je auditovaná a opakování nevytvoří dvojitý bonus.
11. Post-call bonus se připíše okamžitě, nepřevzatá objednávka ho zruší interně,
    odstoupení po doručení řeší viditelným ručním odečtem Admin.
12. Nedostupný zdroj nebo AI je zobrazen jako nedostupný stav, nikoli jako nula.
