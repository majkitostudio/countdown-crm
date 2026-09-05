# Operator Workflows Through Priority 5 — Design

**Datum:** 5. 9. 2026  
**Stav:** schválený směr pro navazující implementační plán

## Jednoduše řečeno

Countdown CRM už umí základní technickou práci call centra: přihlášení,
frontu, klienta, hovor, výsledek, callback, objednávku, kalendář, Wallet a
role. Další práce proto nemá přidávat další široké moduly. Má spojit existující
části do pěti krátkých a pravdivých pracovních smyček:

1. operátor po hovoru rychle a jednoznačně uzavře výsledek,
2. před hovorem dostane krátký kontext klienta,
3. Team Leader uvidí pouze případy, které vyžadují zásah,
4. každá role začne na ploše odpovídající její práci,
5. administrátor i Team Leader dostanou pravdivý provozní a auditní kontext.

Živý Telnyx provider, ověřené Telnyx číslo, nahrávky, transcription a Gemini
zůstávají mimo tento návrh. Fallback softphone může sloužit pro lokální a
autentizované ověření, ale nesmí být označovaný jako živá telefonie.

## Proč to děláme

Review odhalilo, že hlavní riziko není nedostatek dalších obrazovek, ale mezera
mezi „funkce existuje“ a „člověk ji během směny dokončí bez přemýšlení“. Dnes
se operátor musí po hovoru rozhodovat mezi několika ovládacími prvky, Team
Leader vidí frontu místo výjimek a administrátor nemá jediný přehled zdraví
workspace.

## Navržené části

### 1. Post-call wrap-up

Stávající serverová atomická completion zůstává zdrojem pravdy. Upraví se
hlavně pracovní tok v Operator Console tak, aby měl jednu viditelnou sekci
„Uzavřít hovor“:

- výsledek hovoru,
- poznámka, pokud je relevantní,
- důvod a poznámka u negativního výsledku,
- další krok,
- callback nebo objednávka pouze tehdy, když je potřebná,
- jedno potvrzení chráněné proti dvojímu odeslání.

Výsledek musí po uložení vést k jasné další akci. Nezavádí se nové AI
rozhodování ani nový provider.

### 2. Conversation Brief

Brief je serverem sestavený, deterministický read model. Nebude v něm volání
LLM. Z dostupných workspace-scoped dat složí:

- jméno a základní identifikaci klienta,
- důvod, proč je lead právě teď v aktuální práci,
- poslední kontakt a výsledek,
- poslední relevantní poznámku,
- aktivní nebo slíbený callback,
- schválený produktový kontext,
- bezpečný doporučený další krok.

Pokud některý zdroj selže, brief označí konkrétní část jako nedostupnou. Nesmí
si vymyslet důvod kontaktu, výsledek ani slib.

### 3. Team Leader Exception Queue

Exception Queue bude odvozená fronta, ne další persistentní kopie dat. Zdrojem
budou existující tabulky a serverové DAL:

- queue items ve stavech `awaiting_outcome`, `paused` nebo s vypršeným lease,
- overdue a problémové callbacky,
- failed workflow executions,
- chybějící aktivní Product Script pro používaný produkt.

Každá položka bude mít pevný typ, důvod, závažnost, stáří, vlastníka a povolenou
akci. První akce budou pouze ty, které už systém bezpečně umí: otevřít lead,
uvolnit/reassign/reopen assignment, otevřít callback nebo workflow detail.
Nebudeme přidávat ruční mazání ani obecný „resolve“ bez serverového významu.

### 4. Role-aware plochy a navigace

Společný shell zůstane, ale výchozí práce se změní podle role:

- `operator` začíná v Operator Console,
- `team_leader` začíná v týmovém přehledu s Exception Queue,
- `administrator` začíná ve Workspace Readiness.

Navigace bude definovaná na jednom místě a bude použitelná pro Sidebar i
command palette. Viditelnost v UI nebude bezpečnostní hranice; každá route i
Server Action dál použije existující workspace/role guardy.

Stav operátora `Ready / In call / Break` bude pro operátora zapisovaný přes
stávající serverovou presence akci. Team Leader a administrátor dostanou místo
lokálního směnového přepínače odkaz na svůj provozní kontext.

### 5. Workspace Readiness, reálný Team Leader Review a audit

Workspace Readiness bude admin-only read model s kontrolami:

- migration/schema synchronizace,
- RLS a role boundary evidence,
- stav queue,
- Calendar a Wallet dostupnost,
- publikovaný Product Script,
- workflow health,
- Telnyx konfigurace a flag s jasným stavem „externě neověřeno“,
- poslední kritické chyby.

Výsledky budou `Ready`, `Needs attention` nebo `Blocked`. Neaktivní Telnyx
číslo nebude maskované jako chyba aplikace; bude uvedené jako externí blocker.

Training review zůstane samostatně označený jako review simulací. Pro reálné
hovory vznikne oddělená Team Leader Review plocha, která zobrazí call, lead,
operátora, čas, délku, výsledek, použitý skript a dostupné poznámky. Ruční
coaching feedback se uloží do nové malé `call_reviews` tabulky se workspace a
reviewer hranicí.

Auditní log dostane strukturovaný kontext změny: cíl změny, identifikátor
entity, původní stav, nový stav a důvod. Citlivé údaje a credentials se do
tohoto kontextu neukládají. Stávající textové záznamy zůstanou čitelné i bez
nových polí.

## Datový tok a hranice

```text
Operator Console
  -> existing atomic call completion
  -> Post-call wrap-up result
  -> Conversation Brief from workspace-scoped read models

Existing queue / callbacks / workflows / scripts
  -> Exception Queue read model
  -> Team Leader safe action
  -> existing RPC + audit context

workspace role
  -> role-aware home + navigation
  -> Workspace Readiness or Team Leader Review
```

Kritické mutace zůstanou v serverových DAL, Server Actions nebo RPC. UI nebude
obcházet RLS ani rozhodovat o workspace. Každý nový read model bude mít čistý
typ a pure mapping test; každá nová migrace bude nejdřív ověřená lokálně a
proti linked targetu.

## Ověřovací kritéria

Každá etapa končí těmito důkazy:

- unit/contract testy pro nový stav a mapování,
- lint, typecheck a relevantní build,
- role a cross-workspace negative testy,
- browser ověření, pokud jde o pracovní tok,
- reload a databázový read-back u každé nové persistence,
- dokumentace aktualizovaná podle skutečného výsledku.

Celkový plán je hotový, když:

- operátor uzavře hovor jedním srozumitelným wrap-up tokem,
- brief je viditelný před dalším hovorem a nevymýšlí data,
- Team Leader vidí akční výjimky a umí použít pouze povolené zásahy,
- role začínají na pravdivých pracovních plochách,
- administrátor vidí stav workspace a Team Leader může reviewovat skutečné
  hovory,
- audit vysvětlí kdo/co/kdy/proč bez úniku citlivých údajů,
- Telnyx i Gemini zůstanou zřetelně oddělené jako pozdější práce.
