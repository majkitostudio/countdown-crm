# Velocity CRM — projektová pravidla

Tento soubor doplňuje globální instrukce. Před prací se řiď také [pravidly práce s projektem a dokumentací](docs/Rules.md). Produktový kontext je v [průvodci](docs/PROJECT_GUIDE.md), otevřená práce v [To-Do](docs/To-Do/To-Do.md).

## Způsob práce

- Pro každou část práce samostatně vybírej a používej vhodné dostupné skills; nevyžaduj zvláštní souhlas s jejich použitím.
- Když se změní dokumentovaný stav nebo rozhodnutí, aktualizuj příslušnou autoritativní dokumentaci spolu se změnou. Při případném commitu zahrň dokumentaci do téhož commitu; commit vytvářej jen na žádost uživatele.

## Rozhodnutí projektu

- Velocity je provozní CRM pro call centrum, které prodává doplňky stravy. Není to obecné CRM pro libovolný obor ani pouze Operator Console.
- Zachovávej obecný a konfigurovatelný model. Nehardcoduj konkrétní produkty, akce ani zdroje leadů do aplikace, migrací nebo SQL.
- Přísun leadů má být automatizovaný přes budoucí integraci. Aktuální databázový trigger zařadí každý vložený lead do fronty, ale sám o sobě neimplementuje příjem přes API/webhook.
- Produkční telefonie/VoIP a Telnyx jsou odloženy na neurčito. Existující závislosti a místní testovací konzole tím nejsou popřeny. Nepřidávej náklady ani nové závislosti, dokud PM tuto prioritu znovu neotevře.
- AI může pomáhat s kontextem, tréninkem a kvalitou; není autoritou nad skutečným stavem hovoru, objednávky ani oprávnění.
- Velocity má produkční nasazení; vývoj a testování probíhají v odděleném sandboxu. Účty, objednávky, leady, kontakty a ostatní data ve vývojovém/testovacím prostředí jsou podle zadání syntetická. Produkční prostředí je samostatné; zásahy do něj nejprve projednej.
- Uživatel předem souhlasí s opakovanou read-only kontrolou evidence migrací v propojeném testovacím sandboxu; na tuto kontrolu se již neptej. Nejprve ověř cíl a nezaměňuj kontrolu za aplikaci migrací či jiný zápis.
- Uživatel předem souhlasí s potřebnými změnami databáze a testy se zápisem ve vývojových a testovacích prostředích projektu; před zásahem ověř cíl, rozsah a dopady. Destruktivní zásahy a zásahy mimo tato prostředí dál nejprve projednej.

## Uživatelské rozhraní

- Rozhraní je česky, včetně navigace, tlačítek, stavů, hlášek a přístupných názvů. Názvy značek, technické zkratky a interní identifikátory nepřekládej; obsah uložený uživateli nepřepisuj.
- Při revizi obrazovky urči roli a četnost použití, rozhodni ponechat/sjednotit/odstranit, seřaď důležitost a zvaž vhodný alternativní koncept UI.

## Terminologie plánovaných hovorů

- **Callback** je pevně vázaný na konkrétního operátora.
- **Scheduled call** je naplánovaný hovor bez pevné vazby na operátora; přednostně ho dostane zadávající operátor, ale může ho převzít kdokoli dostupný. V UI používej „naplánovaný hovor“ (v navigaci „Plán hovorů“), nikdy „callback“ pro tento typ hovoru.
- Toto pravidlo se netýká programátorských callbacků ani historických migrací a testů. Staré databázové identifikátory v historických migracích nepřejmenovávej; měnilo by to historii, kterou testy ověřují.

## Technologie Next.js

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
