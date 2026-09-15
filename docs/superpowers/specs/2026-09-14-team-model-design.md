# P2 Team Model — Teams, Memberships and Team Leader Scope

**Datum:** 14. 9. 2026
**Stav:** schválený směr před implementací
**Produkt:** Countdown CRM

## Cíl

Doplnit skutečné týmy uvnitř workspace tak, aby Team Leader neviděl celý workspace,
ale pouze své týmy. Administrator bude spravovat týmy, členství a přiřazení
uživatelů. Operátor bude patřit do jednoho aktivního týmu.

Tým není pouze vizuální filtr. Musí být součástí serverových pravidel, routingu
leadů, týmových přehledů a historických výsledků.

## Produktová pravidla

1. Workspace představuje firmu nebo provozní celek.
2. Tým je oddělení uvnitř workspace.
3. Operátor má nejvýše jeden aktivní tým.
4. Team Leader může vést jeden nebo více týmů.
5. Tým má alespoň jednoho aktivního Team Leadera, jakmile je uveden do provozu.
6. Administrator vidí všechny týmy v aktuálním workspace a není povinným členem týmu.
7. Uživatel bez týmu může existovat, ale je označený jako `Needs team assignment`.
8. Uživatel bez týmu nesmí být použitý pro nový týmový routing leadů.
9. Team Leader vidí pouze své aktivní týmy.
10. Operator vidí pouze svou vlastní pracovní smyčku a data, ke kterým má již
    oprávnění podle současných assignment pravidel.
11. Přesun uživatele mezi týmy je administrátorská změna s auditní stopou.
12. Historické hovory a objednávky si zachovají tým platný v okamžiku události.
13. Archivovaný tým nepřijímá nové leady, ale zůstává dostupný pro historii.
14. Data bez potvrzeného týmového přiřazení se nezapočítávají do týmových výsledků.

## Datový model

### `teams`

- `id`
- `workspace_id`
- `name`
- `slug`
- `status`: `active | archived`
- `created_at`, `updated_at`

`slug` je unikátní v rámci workspace. Tým nelze použít přes jiný workspace.

### `team_memberships`

- `team_id`
- `workspace_id`
- `user_id`
- `membership_role`: `member | leader`
- `active_from`, `active_until`
- `created_at`, `updated_at`

Aktivní operátor může mít pouze jedno aktivní členství v jednom workspace.
Team Leader může vést více týmů. Členství musí vždy odkazovat na existujícího
člena stejného workspace.

`workspace_members.role` zůstává hlavní workspace rolí. `membership_role`
určuje pouze vztah člověka ke konkrétnímu týmu; nenahrazuje workspace roli.

## Týmové vlastnictví provozních dat

V první datové vlně se tým přidá k:

- `leads` jako aktuální vlastnictví leadu,
- `lead_queue_items` jako tým routingu,
- `calls` jako historický snapshot týmu,
- `orders` jako historický snapshot týmu.

Pozdější callbacky, výjimky, Analytics a Daily Brief musí používat stejný
team scope. Žádná obrazovka nesmí označovat workspace agregaci za týmový výsledek.

## Přechod ze současného stavu

Migrace nesmí hádat tým z e-mailu, jména ani starých dat.

1. Nejprve vzniknou `teams` a `team_memberships` bez změny viditelnosti.
2. Administrator dostane Users & Permissions a stav `Needs team assignment`.
3. Stávající leady a queue položky mohou dočasně zůstat bez týmu a budou viditelné
   pouze jako nevyřešená administrátorská položka.
4. Po přiřazení lidí a aktivních leadů se zapne týmové omezení Team Leadera.
5. Do té doby se týmová data nesmí vydávat za úplná.

## Oprávnění

### Administrator

- vytváří, upravuje a archivuje týmy,
- přiřazuje a odebírá členy,
- mění Team Leadera,
- vidí všechny týmy workspace,
- řeší uživatele a data bez týmu.

### Team Leader

- vidí pouze týmy, kde má aktivní roli `leader`,
- vidí pouze operátory a queue položky těchto týmů,
- nesmí číst ani měnit data jiného týmu,
- nesmí si rozšířit scope změnou URL nebo cizím UUID.

### Operator

- není členem administrace týmů,
- zůstává v Operator Console,
- může zpracovávat pouze vlastní assignment,
- nesmí si otevřít cizí tým ani cizí assignment.

## Akceptační kritéria

- Administrator vytvoří tým a přiřadí Team Leadera.
- Administrator přiřadí operátora právě do jednoho aktivního týmu.
- Operátor bez týmu je viditelný jako nevyřešený stav.
- Team Leader týmu A vidí tým A a nevidí tým B.
- Team Leader týmu A nemůže načíst tým B přímou URL ani cizím ID.
- Queue routing nepřidělí lead operátorovi z jiného týmu.
- Historický hovor a objednávka si zachovají tým okamžiku vzniku.
- Archivovaný tým nepřijímá nové leady.
- Každá změna členství a vedení týmu je auditovatelná.
- RLS a serverové guardy odmítnou cross-workspace i cross-team scénáře.
- Týmové výsledky výslovně oddělují data bez týmového přiřazení.

## Mimo rozsah první vlny

- více paralelních týmů pro jednoho operátora,
- automatické rozdělování leadů mezi týmy podle AI,
- týmové bonusy a payout logika,
- nový Results dashboard před ověřením datového scope,
- změna globálního profilu uživatele,
- automatická migrace starých leadů do domyšlených týmů.

## Důkazní plán

- databázové testy constraintů a RLS,
- serverové testy DAL a team scope,
- autentizovaný browser průchod Administrator → Team Leader A → Team Leader B → Operator,
- pozitivní i negativní cross-team a cross-workspace scénáře,
- reload a SQL read-back členství, týmového assignmentu, hovoru a objednávky,
- linked migration history a read-only ověření cílového prostředí,
- cleanup testovacích členství a dat.
