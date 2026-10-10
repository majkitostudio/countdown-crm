# Countdown CRM

Countdown CRM je komplexní all-in-one CRM systém na míru pro telemarketingové call centrum zaměřené na prodej doplňků stravy.

Nejde o generické AI CRM ani pouze o Operator Console. Systém propojuje operátory, Team Leadery a administrátory s leady, zákazníky, hovory, produkty, objednávkami, kvalitou, tréninkem, reportingem a správou provozu.

Začněte v [START_HERE.md](START_HERE.md). Závazným kontextem jsou také [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md), [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md), [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md) a aktuální záznam zjištění [docs/PROJECT_ASSESSMENT_2026-10-10.md](docs/PROJECT_ASSESSMENT_2026-10-10.md). Starší AI audity a exportované bundle soubory nejsou zdrojem aktuálního stavu.

## Technologický základ

- Next.js App Router, React, TypeScript a Tailwind CSS
- Supabase PostgreSQL, Auth a RLS
- Simulovaný pracovní tok; produkční VoIP/Telnyx je odloženo a není aktuální priorita
- Vitest, ESLint a TypeScript pro automatické kontroly

## Lokální spuštění

Požadavky: Node.js a podle režimu lokální demo nebo vývojové Supabase prostředí.

```bash
npm install
npm run dev
```

Demo režim používá syntetická data a nesmí být zaměňován za produkční přístup. Tajné hodnoty patří pouze do ignorovaného lokálního prostředí a nikdy do `NEXT_PUBLIC_*` proměnných.

## Kontroly před předáním změny

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Hlavní produktové plochy

| Oblast | Cesta |
|---|---|
| Operator Console | `/workspace` |
| Leady a zákazníci | `/leads`, `/leads/[leadId]` |
| Hovory a telefonní nastavení (telefonie odložena) | `/calls`, `/telephony` |
| Kalendář a callbacky | `/calendar` |
| Produkty a objednávky | `/products`, `/orders` |
| Tým, výjimky a audit | `/team`, `/exceptions`, `/audit` |
| Reporting | `/dashboard`, `/analytics` |
| Training | `/training`, `/training/reviews` |
| Administrace | `/settings`, `/settings/users`, `/settings/scripts` |
