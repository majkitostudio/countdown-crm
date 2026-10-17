# Countdown CRM

Countdown CRM je komplexní all-in-one CRM systém na míru pro telemarketingové call centrum zaměřené na prodej doplňků stravy.

Nejde o generické AI CRM ani pouze o Operator Console. Systém propojuje operátory, Team Leadery a administrátory s leady, zákazníky, hovory, produkty, objednávkami, kvalitou, tréninkem, reportingem a správou provozu.

Začněte v [START_HERE.md](START_HERE.md). Závazným kontextem jsou také [docs/ROADMAP.md](docs/ROADMAP.md) (plán dalších fází), [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md), [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md) a [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md). Starší AI audity, review a exportované bundle soubory jsou v [docs/archive/](docs/archive/) a nejsou zdrojem aktuálního stavu.

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
| Operator Console | `/console` |
| Leady a zákazníci | `/leads`, `/leads/[leadId]` |
| Hovory (log a kontrola kvality) | `/call-logs`, `/call-logs/[callId]/review` |
| Schedule (naplánované hovory a připomínky) | `/schedule` |
| Produkty a objednávky | `/products`, `/orders` |
| Tým a výjimky | `/team`, `/team/exceptions`, `/team/reviews` |
| Reporting a audit | `/reports`, `/audit` |
| Training (trenažér) | `/training` |
| Management (správa) | `/admin`, `/admin/users`, `/automations`, `/settings`, `/settings/scripts` |
| Telefonie (odloženo) | `/telephony` |
