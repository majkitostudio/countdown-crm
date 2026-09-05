## Task 0: Uzamknout dokumentační baseline

**Files:**

- Modify: `docs/AKTUALNI_STAV_A_DESATERO.md`
- Modify: `PROJECT.md` tak, aby obsahoval aktuální pořadí priorit a schválený scope
- Include: `docs/superpowers/plans/2026-09-05-p1-p5-settings-shifts-roadmap.md` jako hlavní implementační plán
- Create: `docs/superpowers/reports/2026-09-05-roadmap-baseline.md`
- Test: `git diff --check`

**Interfaces:**

- Consumes: poslední uživatelské rozhodnutí o admin-only queue policy, Users & Permissions a směnovém kalendáři.
- Produces: dokumentační baseline, na kterou odkazují všechny další commity.

- [ ] **Step 1: Zapsat schválené hranice.** Do To-Do uvést admin-only assignment/max leadů, směnový kalendář jako jediný zdroj plánované dostupnosti a samostatnou admin stránku `Users & Permissions`.
- [ ] **Step 2: Zkontrolovat konzistenci dokumentů.** `PROJECT.md`, `Review.md` a To-Do nesmí tvrdit, že pracovní dny, hodiny a svátky existují jako samostatná admin konfigurace.
- [ ] **Step 3: Ověřit dokumentaci.** Spustit:

```powershell
git diff --check
rg -n "assignment|maximum|lead|směnov|absence|přesčas|Users & Permissions|pracovní dny|pracovní hodiny|svát" docs/AKTUALNI_STAV_A_DESATERO.md PROJECT.md
```

- [ ] **Step 4: Commit.**

```powershell
git add docs/AKTUALNI_STAV_A_DESATERO.md PROJECT.md docs/superpowers/reports/2026-09-05-roadmap-baseline.md
git add docs/superpowers/plans/2026-09-05-p1-p5-settings-shifts-roadmap.md
git commit -m "docs: record current roadmap decisions"
```

---
