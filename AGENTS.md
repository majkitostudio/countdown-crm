# Pravidla práce v projektu

- Komunikuj česky, jednoduše a věcně. Předpoklady označ jako předpoklady.
- Před změnou zkontroluj pracovní strom, přečti relevantní instrukce a dokumentaci a zachovej existující práci.
- Pracuj na větvi určené pro úkol; pro samostatný větší úkol použij větev `codex/<stručný-název>`. Nevyžaduj práci pouze na `main`.
- Související drobné změny seskup. Při práci spusť cílené kontroly; úplnou sadu spusť jednou před předáním nebo integrací, ne po každé drobné úpravě. Uveď důležité neprovedené kontroly.
- Před testem ověř prostředí a možné zápisy. Testovací data smějí být syntetická. Produkční, destruktivní a jiné externí zásahy nejprve projednej.
- Neprováděj merge, push ani vytváření pull requestu bez výslovné žádosti. Nepoužívej force push, `git reset --hard` ani hromadné mazání.
- Commit vytvářej pouze na žádost. Před dokončením zkontroluj diff a shrň změny, ověření a otevřené body.
- Doménová rozhodnutí a provozní postupy hledej v autoritativní dokumentaci konkrétního projektu; nemíchej mezi projekty data ani pravidla.
- Při změně kódu Next.js přečti příslušnou dokumentaci instalované verze v `node_modules/next/dist/docs/`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
