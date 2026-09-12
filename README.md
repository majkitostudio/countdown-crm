# Countdown CRM

Countdown CRM je workspace-scoped CRM pro výkonnostní call centra a tele-sales. Hlavní pracovní plocha je Operator Console: operátor dostane lead, rychle pochopí zákaznický kontext, věnuje se klientovi na telefonu a uloží další krok — callback, objednávku nebo výsledek hovoru.

Projekt je ve stabilizaci před interním pilotem. Skutečný stav vždy určuje aktuální kód a ověřený provoz, ne starý dokument nebo preview webu.

## Co projekt obsahuje

- workspace-scoped leady, zákaznický profil, historii aktivit a produkty;
- serverem řízenou frontu leadů, přiřazení, callback a recovery;
- call outcome workflow, objednávky, poznámky a auditní stopu;
- Product Scripts, objection cards a zákaznický kontext;
- role `operator`, `team_leader` a `administrator`;
- training/simulator, týmové přehledy a Wallet MVP;
- připravený Telnyx WebRTC základ; živé hovory vyžadují samostatné nastavení a ověření.

Nepřipojení poskytovatelé, simulace a AI návrhy se nesmí vydávat za živou telefonii, automatizaci nebo potvrzený provozní výsledek. U citlivých zákaznických témat používá operátor schválený text; CRM nediagnostikuje ani neslibuje léčbu.

## Technologie

- Next.js App Router, React, TypeScript a Tailwind CSS
- Supabase PostgreSQL + Auth
- Telnyx WebRTC SDK pro budoucí živé hovory
- Vitest, ESLint a TypeScript pro kontrolu kódu

## Lokální spuštění

Požadavky: Node.js a přístup k vývojovému Supabase projektu.

```bash
npm install
npm run dev
```

Vytvoř `.env.local` podle [`.env.example`](.env.example). Tajné klíče patří pouze do serverového prostředí a nikdy do `NEXT_PUBLIC_*` proměnných.

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

- [Projektový kontext](PROJECT.md)
- [Aktuální stav a pořadí práce](docs/AKTUALNI_STAV_A_DESATERO.md)
- [Dokumentační index](docs/README.md)
- [Pracovní postup týmu](docs/DEVELOPMENT_WORKFLOW.md)
- [Historický checkpoint dokumentace](docs/checkpoints/2026-09-01-documentation-consolidation.md)
- [Kontrakt historie zákazníka](docs/CUSTOMER_ACTIVITY_CONTRACT_20260901.md)

## Kontroly před předáním změny

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Pro databázovou změnu navíc ověř migration history, cílové schéma, RLS a autentizovaný read-back.
