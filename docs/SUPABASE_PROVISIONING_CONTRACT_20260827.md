# Countdown CRM — bezpečný provisioning Supabase

**Ověřeno:** 27. 8. 2026  
**Repozitář:** `origin/main` na commitu `f79acf3`  
**Kontrolovaný cíl:** testovací sandbox Supabase, ref `lpvypihpxhyjljikfzqo`  
**Typ dokumentu:** provozní hranice a důkaz migrací; žádná změna databáze

## Krátký závěr

Lokální migration soubory jsou zdroj plánovaného schématu aplikace. Live
databáze a její tabulka historie nejsou zdroj návrhu, ale jsou závaznou
kontrolou toho, co už bylo na konkrétním cíli provedeno. Tyto dvě věci nyní
nejdou bezpečně posouvat běžným `db push`, protože v repozitáři chybí část
historie, kterou sandbox uvádí jako již aplikovanou.

Nová migrace pro atomické business mutace proto zatím není nasazená. Nebyla
provedena žádná oprava historie, žádný `db pull`, žádný `migration repair` a
žádný zápis do databáze.

## Aktuální důkaz driftu

V checkoutu z `origin/main` je **51** lokálních SQL migrací. Read-only příkaz:

```text
npx supabase migration list --linked --project-ref lpvypihpxhyjljikfzqo
```

ukázal 20 verzí, které jsou na remote, ale nemají odpovídající lokální soubor:

```text
20260810071051  20260810071052  20260810071112  20260810071115
20260810071138  20260810071243  20260810071327  20260810071346
20260810104508  20260818162302  20260822134103  20260822134130
20260823010004  20260823041802  20260824100836  20260824104323
20260824104408  20260824104450  20260824104747  20260824112120
```

Stejný stav potvrdil i bezpečný dry-run z větve s novou migrací:

```text
npx supabase db push --dry-run --linked --project-ref lpvypihpxhyjljikfzqo
LegacyDbPushMissingLocalError:
Remote migration versions not found in local migrations directory.
```

Dry-run skončil před aplikací. To je důležitý výsledek, ne neúspěšně provedená
migrace.

## Co je a není zdroj pravdy

- **Zdroj návrhu pro další práci:** verzované migration soubory v repozitáři,
  aplikační kód a schválené SQL změny.
- **Důkaz nasazení na konkrétním cíli:** skutečné schéma a migration history
  daného Supabase projektu.
- **Není dovoleno:** přepsat nebo smazat remote history jen proto, aby CLI
  přestalo hlásit drift; pustit `db pull` přímo do produktového checkoutu;
  aplikovat novou migraci přes ručně obcházený příkaz a tvrdit, že je součástí
  běžného provisioning procesu.

Prakticky to znamená: historie není návrhový dokument, ale nelze ji při
deployi ignorovat.

## Dopad na PR #21

PR #21 (`fix/atomic-business-audit`) obsahuje migraci
`20260826190619_atomic_business_mutations_audit.sql` a lokální testy jsou
zelené. Live sandbox ale podle read-only kontroly tyto dvě RPC zatím nemá.
PR proto nesmí být označen jako live ověřený ani jako připravený k použití na
tomto cíli jen na základě úspěšného buildu.

## Jediný doporučený další krok

Založit samostatný schema-reconciliation task, který nejprve pouze načte a
uloží porovnání skutečného remote schématu s verzovanými migracemi. Tento task
musí pro každou remote-only verzi určit, zda jde o přejmenování, historický
artefakt nebo chybějící změnu. Teprve potom lze po review rozhodnout o přesném
způsobu provisioning úpravy a jejím rollbacku.

Do té doby zůstávají schema apply, migration repair a merge PR #21 oddělené od
tohoto dokumentu. Není bezpečné vyřešit drift rychlým označením historie jako
`applied` nebo přímým SQL zápisem mimo standardní migraci.

## Stav ověření

- Git/worktree: čistý nový worktree z `origin/main`; změna je pouze tento
  dokument.
- Supabase CLI: dostupné; cílový projekt byl zadán explicitním refem.
- Read-only migration list: provedeno.
- Read-only `db push --dry-run`: provedeno; zastaveno na známém driftu.
- Live schema write, migration apply, repair a pull: **neprovedeno**.
- Tajné hodnoty, session cookies a testovací data: do dokumentu nevloženy.
