# Pravidla práce v projektu

- Komunikuj česky, jednoduše a věcně. Předpoklady označ jako předpoklady.
- Před změnou si přečti tyto pokyny a příslušnou část `docs/PROJECT.md`, zkontroluj větev i pracovní strom a zachovej existující práci.
- Drž se zadání. Neprováděj nesouvisející úpravy a nepřidávej další dokumenty, auditní deníky ani agentní složky bez výslovného důvodu.
- Udržuj dokumentaci v těchto třech souborech: `README.md`, `AGENTS.md` a `docs/PROJECT.md`. První odkazuje na projekt, tento soubor určuje způsob práce a projektový průvodce obsahuje platné informace i otevřené úkoly. Odstraň nahrazené a zastaralé stavy; nevytvářej jejich kopie ani časové dodatky.
- Před testem ověř jeho rozsah, prostředí a možné zápisy. Používej syntetická data. Produkci, externí zprávy, nasazení a jiné vnější změny nejprve výslovně domluv.
- Neprováděj push, merge, pull request ani commit bez výslovné žádosti. Nepoužívej `git reset --hard`, force push ani hromadné mazání.
- Po změně zkontroluj diff a spusť přiměřené kontroly. Uveď jen skutečně provedené kontroly a důležité neověřené body.
- Nikdy nevypisuj ani nekopíruj tajné hodnoty z `.env`, `.env.local` nebo správce tajemství. Rozlišuj lokální databázi, testovací sandbox a produkci.
- Při změně kódu Next.js si předem přečti příslušný návod instalované verze v `node_modules/next/dist/docs/`.

<!-- BEGIN:nextjs-agent-rules -->

## Pravidlo pro Next.js

Používaná verze Next.js se může lišit od běžně známých postupů. Před změnou kódu si přečti odpovídající návod v `node_modules/next/dist/docs/` a respektuj jeho upozornění na zastaralá API.

Tento blok znovu přidává `next dev`; jeho generování je v `node_modules/next/dist/server/lib/generate-agent-files.js`.

<!-- END:nextjs-agent-rules -->
