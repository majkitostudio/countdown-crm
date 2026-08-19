# Operator Console First — Redesign Brief

**Datum:** 2026-08-19
**Status:** discovery a návrhový brief; bez implementace UI
**Priorita:** nejbližší hlavní produktová etapa po uzavření queue, assignmentu a callback routingu

## Rozhodnutí

Operator Console bude primární pracovní plocha produktu. Její pracovní model,
stavy a informační hierarchie budou určovat další operator-facing obrazovky.

Dashboard zůstává důležitou orientační a manažerskou plochou, ale nebude
určovat podobu Operator Console. Nemá zobrazovat všechny dostupné moduly se
stejnou vizuální vahou.

## Východisko a auditní důkaz

První audit proběhl nad skutečným autentizovaným lokálním během 2026-08-19.
Přijaté screenshoty jsou uloženy v:

- `output/operator-console-redesign-audit-2026-08-19/01-dashboard.png`
- `output/operator-console-redesign-audit-2026-08-19/02-operator-console.png`

Audit je vizuální a strukturální; sám o sobě nepotvrzuje kompletní keyboard,
screen-reader ani responsive audit.

## Hlavní zjištění

### Co funguje

- Dark design system je konzistentní a působí jako jeden produkt.
- Typografie, spacing, border treatment a ikony vytvářejí použitelný základ.
- Dashboard má jasný vstupní titul, KPI řadu a přímý odkaz do Operator Console.
- Operator Console má reálný pracovní kontext: stav operátora, aktuální lead,
  call action, produktový script, timeline a customer history.
- Error/unavailable stavy jsou v některých částech pravdivě označené.

### Hlavní problém: vizuální hierarchie

Současné UI často staví důležité, podpůrné a unavailable informace do podobně
velkých karet a se stejným kontrastem.

Na Dashboardu se vedle sebe objevují provozní KPI, `Active Operators`, přestože
presence data nejsou dostupná, Predictive Re-Order Engine, nedostupná hourly
activity, top operators a recent workspace activity.

Uživatel tak dostává široký přehled, ale ne dostatečně silný signál, co má
řešit jako první. Dashboard působí úplně, i když některé části jsou pouze
sekundární nebo unavailable.

V Operator Console je podobný problém v menší pracovní ploše: hlavní call
akce, aktuální lead, produktový script, AI návrh, timeline a customer history
jsou všechny přítomné současně. Operátor musí sám odhadnout, která část je
aktuální rozhodnutí a která je pouze kontext.

## Návrhový princip

Každá obrazovka musí mít jednu dominantní odpověď na otázku:

> „Co má uživatel udělat nebo pochopit právě teď?“

Informační hierarchie bude řízena podle důležitosti pro aktuální rozhodnutí,
ne podle toho, kolik dat je možné zobrazit.

### Prioritní vrstvy

| Vrstva | Význam | Příklady |
|---|---|---|
| P0 — právě teď | stav, který blokuje nebo řídí další akci | `Ready for Calls`, `Starting Call`, `In Call`, chyba completionu, splatný callback |
| P1 — další akce | nejbližší doporučený krok | `Call Client`, pokračovat v call flow, Schedule Callback, dokončit outcome |
| P2 — rozhodovací kontext | informace potřebná pro kvalitní akci | lead identity, telefon, produkt, objection branch, schválený script |
| P3 — podpora a historie | informace užitečná při dohledání, ne při prvním pohledu | timeline, starší orders, sekundární AI insighty, metriky |

P0 a P1 musí být rozpoznatelné během několika sekund. P2 má být dostupné bez
zahlcení. P3 má být odsunuto do sekundární vrstvy, draweru, collapsible sekce
nebo samostatné navigace.

## Cílový směr Operator Console

### Primární pracovní zóna

Horní a centrální část Console má obsahovat pouze:

- aktuální stav operátora a call session,
- aktuální lead,
- jednu hlavní akci nebo jasný důvod, proč akce není dostupná,
- nejbližší next best action,
- případný urgentní callback nebo recovery stav.

### Sekundární kontext

Lead details, approved product script, objection handling a customer context
zůstanou přítomné, ale jejich váha se bude měnit podle stavu hovoru.

Před hovorem má být nejvýraznější identita leadu a bezpečný start callu. Během
hovoru má dominovat call state, aktivní script/objection branch a bezpečné
ovládání hovoru. Po hovoru má dominovat outcome, callback/order decision a
viditelný výsledek serverového zápisu.

### Historie a AI

Timeline, starší objednávky, customer history a doplňkové AI insights nesmí
konkurovat aktuální pracovní akci. Zůstanou dostupné jako kontext, ale jejich
vizuální váha bude nižší a jejich stav musí být pravdivě odlišitelný:

- persisted,
- unavailable,
- preview/simulation,
- loading,
- error.

## Cílový směr Dashboardu

Dashboard nebude „zvětšená navigace všech modulů“. Bude mít jasnou orientační
hierarchii:

1. nejdůležitější workspace/business signál,
2. stav provozu a výjimky,
3. několik vysvětlujících metrik,
4. detailní aktivita až níže nebo na samostatné stránce.

Pro operátora má být primární cesta Operator Console. Pro Team Leadera nebo
Administrátora může Dashboard zůstat orientačním vstupem, ale role a účel
obrazovky musí být v hierarchii zřejmé.

Nedostupný nebo neověřený údaj nesmí mít stejnou váhu jako živý provozní údaj.
Unavailable stav má být kompaktní a vysvětlitelný, ne dominantní dashboard
feature.

## Ne-cíle tohoto redesignu

- neměnit workspace authorization, RLS ani queue datový model,
- nepřidávat externí telephony/inbound provider,
- nepřidávat Google/Outlook synchronizaci ani notification kanály,
- nevyrábět nové AI funkce jen proto, aby byla obrazovka „chytřejší“,
- nemíchat redesign s plošným refaktorem celé aplikace,
- nepředstírat produkční telephony nebo realtime presence,
- nepřesouvat celý produkt do nového design systému bez důvodu.

## Navržené pracovní slices

1. **Information architecture a state map** — popsat, co Console ukazuje před
   hovorem, během hovoru, po hovoru, při callbacku, při pauze a při chybě.
2. **Primary action hierarchy** — oddělit dominantní pracovní akci od kontextu,
   historie a AI podpory.
3. **Operator Console layout pass** — upravit existující komponenty bez změny
   serverových kontraktů.
4. **Dashboard hierarchy pass** — podřídit Dashboard skutečným prioritám,
   rolím a dostupnosti dat.
5. **Authenticated interaction smoke** — ověřit, že redesign zachová start,
   cancel, completion, callback, reload, error a recovery flow.
6. **Accessibility and responsive pass** — ověřit focus order, labels, kontrast,
   target sizes, keyboard flow a chování při menší šířce.

## Akceptační kritéria pro první implementační slice

- Operátor během několika sekund pozná svůj aktuální stav.
- Operátor během několika sekund pozná, co má udělat dál.
- Dominantní call/outcome akce není vizuálně konkurována historií nebo sekundární
  AI funkcí.
- Chybějící, unavailable a simulované části jsou viditelně odlišné od živých
  persisted dat.
- Console zachová workspace authorization a serverové assignment kontroly.
- Call, cancel, completion, callback scheduling a reload nezmění význam.
- Každý kritický stav má loading, empty nebo error variantu podle skutečného
  datového výsledku.
- Dashboard zobrazí méně prioritních vrstev, ale zvýrazní důležitější signál.
- Návrh projde autentizovaným browser smoke a `npm run check`.

## Approval gate

Před úpravou komponent je nutné schválit konkrétní první slice, dotčené
komponenty, ne-cíle, rizika, acceptance criteria a ověřovací scénář. Tento
brief je návrhový základ, nikoli povolení k plošnému redesignu.
