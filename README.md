# Countdown CRM

Countdown CRM je workspace-scoped CRM pro výkonnostní call centra a tele-sales. Hlavní pracovní plocha je Operator Console: operátor dostane lead, rychle pochopí zákaznický kontext, věnuje se klientovi na telefonu, uloží výsledek a pokračuje callbackem, objednávkou nebo dalším leadem. Produkt má operátorovi zjednodušit práci v citlivém rozhovoru, ne přidávat administrativní kroky.

Projekt je ve stabilizaci před interním pilotem. Aktuální rozsah a otevřené kroky jsou v [PROJECT.md](PROJECT.md) a v [aktuálním To-Do](docs/AKTUALNI_STAV_A_DESATERO.md).

## Co je v projektu

- workspace-scoped leady, zákaznický profil, timeline a produkty,
- serverem řízená fronta leadů, assignment, callback a recovery,
- Operator Console s Customer Profile kartou, kompaktním režimem, recent context řádkem, `Operator Next Action` a callback recovery inboxem,
- call outcome workflow, objednávky, callbacky a auditní stopa,
- Product Scripts a objection cards,
- role `operator`, `team_leader` a `administrator`,
- Supabase Auth, PostgreSQL, serverové guardy a Row Level Security,
- training/simulator workflow,
- wallet ledger, bonusy a provizní přehled,
- připravený Telnyx WebRTC foundation; živé zapnutí čeká na číslo, environment a webhook.

Simulovaný softphone, training a dosud nepřipojené externí providery se v UI nesmí vydávat za produkční telefonii nebo live AI. Přepis hovorů a post-call AI s Gemini jsou plánované další kroky, nikoli hotová funkce.

U zdravotně citlivých témat, například bolestí kloubů nebo sexuálního zdraví,
musí operátor pracovat se schváleným textem. CRM nemá diagnostikovat,
slibovat léčbu ani vytvářet neověřená tvrzení; jeho role je dodat správný
kontext, osnovu a další krok ve chvíli, kdy je operátor potřebuje.

## Technologický základ

- Next.js App Router, React, TypeScript a Tailwind CSS
- Supabase PostgreSQL + Auth
- Telnyx WebRTC SDK pro budoucí živé hovory
- Vitest, ESLint a TypeScript pro automatické kontroly

## Lokální spuštění

Požadavky: Node.js a přístup k vývojovému Supabase projektu.

```bash
npm install
```

Vytvoř `.env.local` podle [`.env.example`](.env.example). Tajné klíče patří pouze do serverového environmentu a nikdy do `NEXT_PUBLIC_*` proměnných.

```bash
npm run dev
```

Aplikace se standardně otevře na `http://localhost:3000`.

## Kontroly před předáním změny

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Pro databázovou změnu navíc ověř migration history, cílové schéma, RLS a autentizovaný read-back. Podrobnosti jsou v [pracovním postupu](docs/DEVELOPMENT_WORKFLOW.md) a [Telnyx setupu](docs/TELEPHONY_TELNYX_SETUP.md).

## Hlavní plochy

| Oblast | Cesta |
|---|---|
| Operator Console | `/workspace` |
| Leady a detail klienta | `/leads`, `/leads/[leadId]` |
| Hovory | `/calls` |
| Kalendář a callbacky | `/calendar` |
| Objednávky | `/orders` |
| Produkty a skripty | `/products`, `/settings/scripts` |
| Tým a audit | `/team`, `/audit` |
| Dashboard a analytika | `/`, `/analytics` |
| Training | `/training`, `/training/reviews` |
| Wallet | `/wallet` |

## Dokumentace

- [PROJECT.md](PROJECT.md) — kanonický projektový kontext a hranice scope,
- [Aktuální stav a To-Do](docs/AKTUALNI_STAV_A_DESATERO.md) — hotové části, otevřené kroky a release checklist,
- [Development workflow](docs/DEVELOPMENT_WORKFLOW.md) — stručný týmový postup pro změny,
- [Telnyx setup](docs/TELEPHONY_TELNYX_SETUP.md) — konfigurace telefonní vrstvy bez tajných hodnot,
- [Dokumentační index](docs/README.md) — vysvětlení, co do nové `/docs` patří.

Historické Codex postupy, staré roadmapy, auditní protokoly a jednorázové handoffy nejsou součástí nové aktivní `/docs`. Pokud bude potřeba obnovit konkrétní důkaz, přidá se jako samostatný, aktuální dokument s jasným datem a účelem.
