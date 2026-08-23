# Countdown CRM — jednoduchý Git workflow

Tento dokument je praktická dohoda pro práci člověka, Codexu a případných
paralelních úkolů. Cílem není používat všechny možnosti Gitu, ale vždy vědět:

1. kde právě pracujeme,
2. co je aktuální,
3. co lze bezpečně sloučit nebo odložit.

## Základní pojmy

- **`main`** je jediná integrovaná a výchozí větev projektu.
- **Branch** je pojmenovaná historie jedné změny, například
  `feat/push-reminders` nebo `fix/order-hydration`.
- **Commit** je uložený, popsaný checkpoint. Vzniká po logickém a ověřeném
  kroku, ne po každém jednotlivém příkazu.
- **Worktree** je další pracovní složka napojená na stejný Git projekt. Používá
  se pouze tehdy, když potřebujeme mít současně otevřené dvě větve.
- **Chat/task** není branch. Každý chat musí na začátku uvést složku a branch,
  ve které skutečně pracuje.

## Pravidla odteď

### 1. `main` je stabilní pracovní základ

Na `main` se běžně neimplementuje. Začátek práce:

```text
main → nová krátkodobá branch → ověření → commit → případně draft PR → merge
```

### 2. Jedna změna = jedna branch

Branch má řešit jeden souvislý problém. Nemícháme do ní redesign, databázovou
opravu a úklid starých souborů bez společného důvodu.

Doporučené názvy:

```text
feat/<krátký-název>
fix/<krátký-název>
docs/<krátký-název>
chore/<krátký-název>
```

Branch se zakládá z aktuálního `main`, ne ze staré feature branche.

### 3. Každý chat hlásí svůj kontext

První pracovní zpráva nebo komentář každého implementačního chatu má obsahovat:

```text
Složka: <cesta>
Branch: <název>
Základ: <commit nebo main>
Záměr: <jedna věta>
```

Chat nesmí předpokládat, že jeho branch je vidět z názvu konverzace.

### 4. Worktree používáme jen pro paralelní práci

Normální práce používá hlavní složku projektu a jednu branch. Worktree má
smysl pouze pro současné úkoly, například:

```text
countdown-crm/             → main nebo právě řešená branch
countdown-crm-order-fix/   → jiná branch, oddělená pracovní kopie
```

Před odstraněním worktree musí být jeho stav čistý nebo musí být změny
výslovně zachované. Detached worktree není běžná vývojová branch a musí být
označen jako dočasný snapshot/test.

### 5. Commit je kontrolní bod

Commit děláme, když je změna logická a ověřená. Před commitem kontrolujeme
alespoň relevantní diff, testy nebo check a stav pracovního adresáře.

Příklad dobrých commitů:

```text
feat: add push reminder subscriptions
fix: prevent legacy order hydration drift
docs: define git workflow
```

Do commitu patří pouze konkrétní změna. Nepoužívat hromadné přidání všech
souborů; generované a nesouvisející artefakty se přidávají explicitně.

### 6. Push a PR mají jasný účel

- malá, lokální a ověřená změna: focused commit a push,
- širší, review-citlivá nebo nejistá změna: feature branch a draft PR,
- nejasná nebo nedokončená práce: zůstává lokálně na branchi s popisem stavu.

Build nebo deploy sám o sobě neznamená, že je ověřená autentizace,
persistence nebo RLS.

### 7. Po dokončení branch uklidíme

Po merge nebo po rozhodnutí, že je větev nahrazena:

1. zkontrolujeme diff proti `main`,
2. zapíšeme rozhodnutí do handoffu/PR,
3. teprve potom odstraníme lokální a případně vzdálenou branch.

Branch se nemaže jen proto, že vypadá stará. Nejprve se ověří, zda neobsahuje
jedinou kopii důležité práce.

## Jednorázová inventura — 23. 8. 2026

Toto je snapshot, ne trvalý stav. Před dalším zásahem se musí znovu ověřit.

| Větev / pracovní kopie | Stav | Rozhodnutí prozatím |
|---|---|---|
| `main` | čistý, `origin/main` | ponechat jako jediný základ |
| `agent/operator-workflow-product-script` | starší trainerová historie; `main` mezitím pokračoval jinou trainerovou řadou | archivováno jako `archive/20260823/agent-operator-workflow-product-script`; PR #1 uzavřen |
| `fix/order-hydration-legacy` | ekvivalent opravy je v `main`; worktree byl čistý | archivováno jako `archive/20260823/fix-order-hydration-legacy`; PR #4 uzavřen |
| `feat/push-reminder-notifications` | obsahuje push reminders, ale vychází ze starého základu | archivováno jako `archive/20260823/feat-push-reminder-notifications`; PR #5 uzavřen; případnou funkci přenést na novou branch z aktuálního `main` |
| `v0/header-alignment-update-2225d494` | vzdálená historická v0 větev bez worktree | archivováno jako `archive/20260823/v0-header-alignment-update-2225d494` |
| `v0/majkitostudio-886c1873` | vzdálená historická v0 designová větev bez worktree | archivováno jako `archive/20260823/v0-majkitostudio-886c1873` |
| `...product-script-smoke-20260823` | detached dočasný snapshot; má neuloženou změnu v `AGENTS.md` | ponechat; nejdříve zachovat nebo vědomě zahodit jeho změnu |

## Pravidlo pro další práci

Před implementací musí být zřejmé:

```text
Aktuální základ: main
Nová branch: <jedna branch pro jednu změnu>
Pracovní složka: <jedna složka nebo výslovně pojmenovaný worktree>
Hotovo znamená: <konkrétní acceptance criteria a ověření>
```

Pokud není jasné, kam změna patří, nejdřív se řeší branch/worktree kontext;
teprve potom se píše kód.
