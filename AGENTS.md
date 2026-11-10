# Countdown CRM — projektová pravidla

Tento soubor obsahuje pouze pravidla specifická pro Countdown CRM a doplňuje globální pracovní instrukce. Produktový kontext je v [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md); aktuální stav a možnosti další práce v [docs/ROADMAP.md](docs/ROADMAP.md).

## Způsob práce

- Pro každou část práce samostatně vybírej a používej vhodné dostupné skills; nevyžaduj zvláštní souhlas s jejich použitím.
- Při každém uceleném kroku aktualizuj v témže commitu příslušnou existující autoritativní dokumentaci. Udržuj ji stručnou a nevytvářej duplicitní dokumenty.

## Rozhodnutí projektu

- Countdown je provozní CRM pro call centrum, které prodává doplňky stravy. Není to obecné CRM pro libovolný obor ani pouze Operator Console.
- Zachovávej obecný a konfigurovatelný model. Nehardcoduj konkrétní produkty, akce ani zdroje leadů do aplikace, migrací nebo SQL.
- Přísun leadů má být automatizovaný přes budoucí integraci. Aktuální databázový trigger zařadí každý vložený lead do fronty, ale sám o sobě neimplementuje příjem přes API/webhook.
- Produkční telefonie/VoIP a Telnyx jsou odloženy na neurčito. Nepřidávej náklady ani nové závislosti, dokud PM tuto prioritu znovu neotevře.
- AI může pomáhat s kontextem, tréninkem a kvalitou; není autoritou nad skutečným stavem hovoru, objednávky ani oprávnění.
- Countdown je nyní prototyp bez produkčního prostředí. Současná prostředí jsou vývojová či testovací; účty, objednávky, leady, kontakty a ostatní projektová data jsou podle zadání syntetická a slouží vývoji.

## Uživatelské rozhraní

- Titulky stránek, názvy menu, názvy sekcí, obecná tlačítka a štítky jsou anglicky.
- Popisy pod titulkem a běžný obsah stránky, včetně tabulek a hlášek, jsou česky.
- Při revizi obrazovky urči roli a četnost použití, rozhodni ponechat/sjednotit/odstranit, seřaď důležitost a zvaž vhodný alternativní koncept UI.

## Terminologie plánovaných hovorů

- **Callback** je pevně vázaný na konkrétního operátora.
- **Scheduled call** je naplánovaný hovor bez pevné vazby na operátora; přednostně ho dostane zadávající operátor, ale může ho převzít kdokoli dostupný. V UI používej „Schedule“ / „naplánovaný hovor“, nikdy „callback“ pro tento typ hovoru.
- Toto pravidlo se netýká programátorských callbacků ani historických migrací a testů. Staré databázové identifikátory v historických migracích nepřejmenovávej; měnilo by to historii, kterou testy ověřují.

## Technologie Next.js

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
