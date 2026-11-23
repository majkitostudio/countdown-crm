---
description: Bezpečně ověř změny v Velocity CRM a stručně shrň výsledek.
---

Ověř aktuální změny v projektu Velocity CRM. Tento příkaz pouze kontroluje — neopravuj ani neupravuj soubory.

1. Zkontroluj `git status`, `git diff` (unstaged), `git diff --cached` (staged) a nové soubory z `git ls-files --others --exclude-standard`; relevantní nové soubory také přečti. Nikdy nevypisuj obsah `.env` ani jiné tajné hodnoty.
2. Podle rozsahu vyber přiměřené kontroly:
   - U změn aplikace obvykle spusť `npm run verify:all` (lint, typy, testy a build).
   - U úzké změny můžeš spustit jen relevantní testy a kontroly; stručně vysvětli proč.
   - U samotné dokumentace nebo OpenCode příkazů ověř diff a formát, aplikaci není nutné testovat.
3. **Bez výslovného požadavku nespouštěj** `npm run test:smoke`, kontroly linked databáze či migrací, seed/provision příkazy ani jiné kroky, které mohou kontaktovat nebo měnit sandbox či databázi. Nečti `.env.local`.
4. Pokud kontrola selže, uveď chybu a její dopad; v rámci tohoto příkazu nic neopravuj.

Na konci uveď přesné spuštěné příkazy, výsledek a také důležité kontroly, které spuštěné nebyly. Netvrď, že je něco ověřené, pokud kontrola skutečně neběžela.
