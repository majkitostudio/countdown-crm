# Countdown CRM — pracovní workflow

Tento dokument popisuje jednoduchý způsob, jak držíme projekt čitelný.

## Jednotky práce

- **Cíl** je větší produktová oblast.
- **Slice** je malá část cíle s vlastním výsledkem a ověřením.
- **Commit** je focused checkpoint jedné související změny.
- **Branch/worktree** odděluje jednu práci od stabilního `main` a od ostatních
  změn.
- **Checkpoint** je kvalitativní kontrola přibližně po 15 commitech nebo dříve,
  pokud se změna dotýká bezpečnosti, databáze nebo hlavního workflow.

## Každý nový implementační úkol

1. Nejprve se ověří složka, branch, HEAD, remote divergence, pracovní strom,
   relevantní `AGENTS.md` a aktuální status.
2. Zapíše se cíl, rozsah, ne-cíle, riziko, akceptace a plán ověření.
3. Práce běží na pojmenované feature/fix/docs branchi; `main` zůstává stabilní.
4. Změna se drží v jednom tématu. Nesouvisející pracovní strom se nemění.
5. Před delivery se znovu ověří přesný seznam souborů, diff a Git divergence.

## Povinný základní gate

Před deploy handoffem nebo uzavřením běžné implementace:

```text
npm test
npm run check
git diff --check
```

`npm run check` pokrývá lint, typecheck a production build. U docs-only změny
se aplikační testy neopakují jako nový runtime důkaz; uvede se přesný diff a
odkaz na poslední relevantní ověřený baseline.

## Rozšířený checkpoint

Přibližně po 15 commitech, případně dříve u rizikové změny, se kontroluje:

- aktuální status proti skutečnému checkoutu a remote;
- testy, lint, typecheck, build a diff;
- browser průchod s reálným autorizovaným účtem;
- persistence po reloadu a read-only SQL kontrola;
- role, cross-workspace a RLS hranice;
- migrace a jejich provenance;
- UX, produktový směr a otevřená rizika;
- aktualizace `PROJECT_STATUS.md` a nový neměnný checkpoint záznam.

Účelem checkpointu není tvrdit, že všechno je hotové. Jeho výstupem je
pravdivé rozdělení na hotové, ověřené, otevřené a budoucí.

## Evidence se nesměšuje

| Vrstva | Co dokazuje | Co nedokazuje |
|---|---|---|
| Statické testy | kontrakt funkcí, typů, UI a migrací | živou databázi nebo skutečné oprávnění |
| Browser | chování konkrétní relace a role | SQL persistence nebo obecné RLS |
| Persistence | data přežila reload a lze je dohledat | cross-workspace bezpečnost |
| Authorization/RLS | odmítnutí či povolení konkrétní identity a targetu | celý produktový workflow |
| Build/deploy | sestavení a dostupnost aplikace | autentizaci, persistence, RLS nebo provider efekt |

Demo auth, smyšlené účty, vymyšlená data a předstírané důkazy se nepoužívají.
Fixture test je vždy označený jako lokální nebo rollback-scoped.

## Git delivery

- Stageují se pouze explicitně vyjmenované cesty; nepoužívá se `git add .` ani
  `git add -A`.
- Malý ověřený slice končí focused commitem a pushnutou branchí.
- Širší, rizikový nebo review-sensitive slice končí draft PR.
- Merge se provádí pouze při jasném targetu, čistých kontrolách a bez
  nevyřešeného konfliktu.
- Po delivery report vždy uvádí branch, commit, push/PR/merge stav a zbývající
  důkazní mezeru.

## Jak číst status

Pro dnešní rozhodování začni v [`PROJECT_STATUS.md`](PROJECT_STATUS.md).
Pro budoucí práci použij [`roadmap.md`](roadmap.md). Staré dokumenty a
checkpointy slouží k dohledání historie, ne k přebírání starých slibů.
