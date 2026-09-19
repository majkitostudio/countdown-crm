# Team Workspace `/team` — ověřovací průchod v Sandboxu

Datum: 18. 9. 2026

## Rozsah

Ověření proběhlo pouze proti lokální aplikaci (`http://localhost:3000`) napojené
na Sandbox `lpvypihpxhyjljikfzqo` (workspace `9015a0bf-bb9e-4900-bb3b-b769c4c71f0b`).
Production nebyla použita ani změněna. Použité dočasné účty (Administrator a
Team Leader) schválil uživatel a po ověření byly smazány včetně všech dočasných
artefaktů; přihlašovací údaje nejsou v tomto reportu zaznamenány.

## Ověřeno

|Role|Ověřené chování|
|---|---|
|Administrator|`/team` → badge `Administrator access`, `Povolené týmy: P1, P2, P3`; Daily Checkpoint s pravdivými stavy (Nové objednávky 0, Prošlé callbacky 0, Aktivní operátoři 6, Prodeje dnes 0); tabuly Kontrola kvality hovorů, Objednávky a Callbacky funkční; rest-api read-back = 8 leadů (5× P1).|
|Team Leader|`/team` → badge `Team Leader access`, `Povolené týmy: P1` (pouze vlastní tým); Aktivní operátoři 2 (`contact`, `Review Test Operator`) oproti 6 u Admina; Callbacky a týmová fronta = `Zobrazeno 5 z 5 položek fronty` s filtrem jen na P1 operátory; rozsah se zachoval po reloadu; REST read-back vrací pouze 5 P1 leadů a 5 queue položek.|
|Operator|`/team` → `Team operations unavailable` („Queue operations are available to Team Leaders and Administrators only."); `/leads` → `Lead management unavailable` (operátoři nemají adresář leadů).|

## Rozsah a odmítnutí (cross-team)

- REST čtení `leads` jako Team Leader (RLS s týmovým rozsahem) vrací právě 5
  leadů týmu P1; dotaz na lead bez týmu (`Bruno Tarasov`) podle `id` vrací
  prázdné pole, tedy týmové hranice platí i na úrovni databáze.
- Operátor nemá ke `/team` ani k adresáři leadů přístup; přímá URL je odmítnuta
  srozumitelnou hláškou, nikoli falešnými daty.
- Nuance: přímá URL detailu leadu mimo pracovní frontu
  (`/leads/<id>` → RPC `get_workspace_lead_detail`) zobrazí Team Leaderovi
  kontrolní `Read-only contact view` bez autorizace hovoru („Opening this URL
  does not authorize a call."). Toto NENÍ únik týmové fronty — queue a
  rozsahy zůstávají týmově omezené; call authorizace dál vychází z aktuální
  frontové položky.

## Prázdné stavy a `unavailable`

- Daily Checkpoint: prázdné stavy pro nové objednávky i prošlé callbacky
  („Dnes nejsou v tomto týmovém rozsahu žádné nové objednávky.", „V tomto
  týmovém rozsahu nejsou žádné prošlé callbacky.").
- `Konverze` a `Talk %` se zobrazují jako `—` (nedostupné), nikoli jako nula,
  s poznámkou, že Talk Time procento se zobrazí až po zavedení ověřeného
  plánování směn. Směny jsou prezentovány jako samostatná část systému.
- Kontrola kvality hovorů: `Zobrazeno 0 z 0 kontrol`, prázdný výsledek
  „Pro zvolené filtry nejsou žádné výsledky." a poznámka, že kontrola probíhá
  pouze u reálných hovorů. Tréninkové relace tedy žádný výsledek kontroly
  nevytvoří (v Sandboxu trénink existuje, kontrola zůstává prázdná).

## Čištění

Smazáni oba dočasní uživatelé (členství v `team_memberships` se kaskádovitě
odstranila s řádky `workspace_members`), zastaven lokální dev server a smazány
dočasné skript, přihlašovací soubor, screenshoty a logy. Žádný citlivý údaj
nezůstal v repozitáři.

## Výsledek

Ověřovací průchod je úspěšný. `/team` je správně omezeno na role
`team_leader`/`administrator`, Team Leader vidí výhradně svůj tým (P1) ve
všech datových vrstvách (UI, queue, REST/RLS), prázdné a `unavailable` stavy
jsou pravdivé, operátor je jednoznačně odmítnut a rozsah přežije reload.
Pokus o čtení leadu mimo tým je na úrovni RLS odmítnut; jediná otevřená
cesta je záměrná read-only karta kontaktu bez autorizace hovoru. Team
Workspace vlna je tímto bezpečně uzavřena.

## Repo kontroly

- `npm run lint` — prošlo bez chyb.
- `npm run typecheck` — prošlo bez chyb.
- Automatizovaný testovací baseline (140 souborů, 642 testů) je zaznamenaná
  jako prošlá ve Fázi 5 plánu Team Workspace; tento průchod nezměnil žádný
  aplikační kód, pouze markdown dokumentaci.