# Projektový checkpoint — 14. 10. 2026

Tento zápis je referenční bod vzniklý před velkým projektovým úklidem (proběhne
v samostatné session). Slouží k tomu, aby se dalo plynule navázat.

## Stav kódu

- **Fáze 0, 1, 2 a 3 jsou hotové a commitnuté.**
- Poslední commit: `98e17c2` — „Docs: Fáze 3 dokončena + poznámka k Fázi 5".
- Pracovní strom: **čistý**, žádné nezaevidované soubory.
- **Nic není pushnuté.**
- Ověřeno u Fáze 3: lint ✅, typecheck ✅, testy 175 souborů / 832 ✅, build ✅.

## Co je rozhodnuté (Fáze 4)

PM upřesnil organizační hierarchii:

- **Department (P1–P4)** = typ práce, kterou operátoři volají (anglicky „Department Pn“):
  - P1 — doobjednávky z e-shopu, hot leads, top leads (odchozí linka)
  - P2 — klasické prodejní oddělení (odchozí linka)
  - P3 — retence, doobjednávky (odchozí linka)
  - P4 — poslední záchrana, podpora
- **Tým** = skupina operátorů pod departmentem; každý tým má jednoho Team Leadera.
  Výchozí název týmu = department + iniciála příjmení TL (např. P1K = P1 + Kačmář).
- **Operátor** pracuje v týmu, tým patří pod department.
- **P1 a P2 v reálném workspace úplně chybí** → v přehledu je zobrazit prázdné (bez migrace).

## Fáze 4 — doplněná rozhodnutí (15. 10. 2026)

- Umístění přehledu front: **nový view v Team Workspace**.
- Název pro P1–P4: **Department** (anglicky); slovo „kampaň“ se nepoužívá.
- Koncept: **obojí** — manažerský souhrn oddělení + seznam leadů.
- Datová nekonzistence: dnes jsou P3/P4 v datech vedené jako „týmy“ a samostatný
  department neexistuje; sjednotí se při migracích ve Fázi 5.

## Návrh Fáze 4 (k diskusi, žádný kód zatím)

1. Sdílený model oddělení P1–P4 (`src/lib/department.ts`) — data + rozpoznání,
   žádné produkty ani konkrétní zdroje.
2. Přehled front — DAL (`src/lib/dal/departmentQueues.ts`) — agregace
   `lead_queue_items` po odděleních, vždy 4 oddělení i s nulami.
3. Přehled front — UI panel — nový view v Team Workspace, funguje i s prázdnými daty.
4. Dokumentace + rozhodnutí.

Každý krok: `npm run test:changed` + commit. Bez migrace (aby to neblokovalo Fázi 5).

Vizuální náhled (statické HTML s ukázkovými daty, mimo repozitář):
`C:\Users\mikes\AppData\Local\Temp\opencode\phase-4-campaign-queues-mockup.html`
(Při úklidu temp se smaže; dá se znovu vygenerovat.)

## Fáze 5 čeká

- Čistý běh celého řetězce migrací na čisté DB — včetně
  `20261014120000_team_leader_exception_pickup_risk.sql` a
  `20261014130000_orders_pickup_risk_index.sql`.
- Kontrola duplicitních verzí v `scripts/verify-all-migrations.mjs`.
- „Migration parity".
- Reálné měření výkonu (`EXPLAIN`) u dotazů Fáze 3.

## Úklid (druhá session)

- Projít repozitář: mrtvé / duplicitní / zapomenuté soubory, staré mockupy, skripty.
- Pozor na starý git stash (`stash@{0}`, 11. 10. 2026) s `test-output.txt`
  a `vitest-run.log` — před smazáním potvrdit.
- Známé drobnosti k vyřešení:
  - Fáze objednávek se v UI ukazují dvakrát (přehledový pruh i počty u filtrů tabulky).
  - `/exceptions` je zároveň záložka v Team Workspace i samostatná položka v levém menu.
- Držet pravidla: kód a dokumentace v oddělených commitech, nic nepushovat.

## Kde přesně pokračovat

1. Dokončit rozhodnutí Fáze 4 (umístění, název, koncept).
2. Pak krok 1 návrhu: sdílený model oddělení P1–P4.

## Dodatek — úklidová session (15. 10. 2026)

Tento dodatek ruší stavové údaje výše (poslední commit, „nic není pushnuté") — platily
jen k 14. 10. před úklidem.

**Úklid (CHECKPOINT):**
- Záloha: tag `checkpoint-2026-10-14-pre-uklid` + bundle v `countdown-crm-archives/`.
- Smazáno ~1,25 GB smetí mimo git (vnořený worktree `docker/.worktrees`, `.next`,
  `.playwright-*`, `.superpowers`, `output`, tsbuildinfo…). `.env.local` zachován.
- Smazány překonané větve `codex/design-system-*`, zrušeny stale worktrees, zahozen
  prázdný Cline stash. Z gitu odstraněny stray artefakty (3× PNG, 2× task-report).
- Baseline i po úklidu zelený (`verify:all`: lint, typecheck, testy, build).

**Fáze 4 — rozhodnutí (hotovo):**
- Termín: **Department** (anglicky, P1–P4). Slovo „kampaň" se nepoužívá.
- Tým = department + iniciála příjmení TL → `P1K` (P1 + Jan Kačmář).
- Umístění přehledu front: nový view v **Team Workspace**.
- Koncept: **obojí** — souhrn oddělení + seznam leadů.
- Budoucnost: admin bude moct přejmenovat departments i týmy.

**Fáze 4 — krok 1 (hotovo):**
- `src/lib/department.ts` = jediný zdroj pravdy pro P1–P4 (klíč, slug, název, účel,
  rozpoznání oddělení z týmu, výchozí název týmu). Demo týmy v `src/lib/dal/teams.ts`
  z něj teď čtou.

**Fáze 4 — krok 2 (hotovo):**
- `src/lib/dal/departmentQueues.ts` (načtení) + `src/lib/departmentQueues.ts` (čistá
  agregace): `lead_queue_items` se agregují po odděleních P1–P4, vždy 4 oddělení i s nulami.
  Fronta se oddělení přiřazuje přes tým (`departmentKeyFromTeam`); položky bez rozpoznaného
  týmu jdou do přepadu „Bez oddělení". Bez hardcodovaných produktů ani zdrojů.

**Fáze 4 — krok 3 (hotovo):**
- Nový view „Queues" v Team Workspace: manažerský souhrn oddělení (4 karty: Čeká / V řešení /
  Callback / Po termínu) + seznam leadů ve frontě s filtrem oddělení a stavu. Souhrn jde
  z nového zdroje `departmentQueues` (respektuje filtr týmů); seznam používá už načtenou
  týmovou frontu, takže neběží druhý dotaz. Funguje i s prázdnými daty (4 karty s nulami).

**Zjištěná nekonzistence (do Fáze 5):**
- Oddělení jsou dnes v datech vedená jako `teams` (P3/P4 zakládají migrace se slugy
  `p3`/`p4`), P1/P2 v reálném workspace chybí. Migrace ještě používají názvy
  „Oddělení P3/P4" a nejsou oddělené od týmů — sjednotit a oddělit při Fázi 5.

**Drobnosti (hotovo):**
- OrderStageSummary se neukazuje dvakrát (jen v Kanban view).
- `/team/exceptions` už není duplicitně v menu (jen záložka v Team Workspace).
- `scripts/verify-all-migrations.mjs` už nehlásí natvrdo „127" (počítá soubory).
