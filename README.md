# Countdown CRM

Countdown CRM je workspace-scoped CRM pro operátory, obchodní týmy a manažery
call-centra. Jádro tvoří serverově chráněná práce s leady, hovory,
objednávkami, Product Scripts a týmovými přehledy.

## Stav dnes

Projekt je ve stabilizaci před bezpečným interním pilotem. Není označený jako
obecně production-ready. Aktuální stav, důkazy a otevřené brány jsou v
[`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md).

Telephony, realtime monitoring, externí messaging a live AI Copilot nejsou
automaticky dostupné funkce. Pokud je provider nebo důkazní vrstva chybí,
aplikace používá explicitní `simulation`, `unavailable`, `failure` nebo
`forbidden` stav.

## Hlavní plochy

- `/workspace` — fronta leadů, call lifecycle, callback a checkout objednávky.
- `/leads`, `/orders`, `/products` — workspace-scoped CRM data.
- `/settings/scripts` — administrator Product Scripts s draft/publish/archive.
- `/training` — oddělený tréninkový simulátor a session workflow.
- `/analytics`, `/team`, `/wallet` — role-guarded týmové a finanční přehledy.
- `/objects/[slug]`, `/workflows` — EAV custom objects a workflow správa s
  přiznanými role/provider hranicemi.

## Technologie

- Next.js 16.3.2, React 19, TypeScript a Tailwind CSS 4.
- Supabase Auth/Postgres přes `@supabase/ssr`, serverové actions, DAL a RPC.
- Browser audio/training API pouze v explicitně pilotních nebo simulačních
  hranicích.

## Lokální spuštění

```bash
git clone https://github.com/majkitostudio/countdown-crm.git
cd countdown-crm
npm ci
npm run dev
```

Pro lokální běh vytvoř `.env.local` s veřejnou Supabase URL a anon klíčem.
Demo auth je pouze lokální vývojová výjimka a nesmí se vydávat za autentizovaný
pilot ani bezpečnostní důkaz.

## Dokumentace

- [Aktuální status](docs/PROJECT_STATUS.md) — jediný dnešní source of truth.
- [Pracovní workflow](docs/WORKFLOW.md) — branch, worktree, commit, checkpoint a gate.
- [Architektonický kontrakt](docs/architecture.md) — současné datové a serverové hranice.
- [Budoucí roadmapa](docs/roadmap.md) — jen další práce, ne historické sliby.
- [Checkpoint index](docs/checkpoints/README.md) — historické důkazy a audity.
- [Historická vize](docs/vision.md) a [banka nápadů](docs/ideas.md) — inspirační podklady,
  nikoli aktuální implementační plán.

## Základní kontrola

```bash
npm test
npm run check
git diff --check
```

Rozšířený browser, persistence, authorization a RLS důkaz se provádí jako
samostatná checkpointová brána. Podrobná pravidla jsou v
[`docs/WORKFLOW.md`](docs/WORKFLOW.md).
