# Audit checkpoint — 27. 8. 2026

> Aktualizováno 30. 8. 2026 podle aktuálního `origin/main` a posledního
> autentizovaného Operator smoke. Tento dokument zachovává původní datum
> snapshotu; nové skutečnosti jsou označené datem aktualizace.

## Stručný stav

Aktuální `origin/main` je `cea0886`. Do hlavní verze byly od původního
snapshotu sloučeny PR #17 (workflow truth), #40 (migration provenance), #41
(queue/recovery kontrakty) a #42 (recovery zaseknutého startu hovoru).

Countdown CRM je nyní veden jako single-workspace MVP. Multi-workspace SaaS
izolace, rozšířená RLS hardening a další živé deploymentní kroky nejsou tímto
sloučením prohlášeny za dokončené.

## Nově ověřené skutečnosti

- Docker Desktop a Docker engine jsou funkční.
- Read-only export live schématu `public,private` proběhl bez zápisu do projektu.
- Live databáze obsahuje authorization helpery v `private` namespace; `public.create_order_with_items` a `public.update_order_with_items` jsou `SECURITY INVOKER`.
- Live databáze má aktivní RLS na veřejných tabulkách; přesný cross-workspace negativní scénář není tímto dokumentem znovu potvrzen.
- Aktuální checkout obsahuje 63 migračních souborů. Read-only `supabase db push --dry-run --linked --project-ref lpvypihpxhyjljikfzqo --skip-vault` v checkoutu odpovídajícímu aktuálnímu `main` vrátil `Remote database is up to date`.
- PR #40 sjednotil lokální migration provenance s remote historií. Dry-run není deployment a nebyl proveden žádný nový live migration push.

## Co stále není potvrzené

- Kompletní negativní cross-workspace a unauthorized-role RLS testy v live prostředí.
- Obecná SaaS/multi-tenant připravenost mimo současný single-workspace MVP.
- Skutečné telephony/provider chování a browser scénář, ve kterém se audio
  inicializace skutečně zasekne nebo odmítne.
- Deployment budoucích databázových změn bez samostatného rozsahu, review a
  ověření.

## Browser smoke — 27. 8. a 30. 8. 2026

Read-only smoke 27. 8. proběhl s reálnou přihlášenou relací Administrátora i
Operatora. Na obou rolích byly načteny `/workspace`, `/leads`, `/orders`,
`/settings` a `/team`; role a unavailable/read-only stavy se po reloadu
zachovaly.

Dne 30. 8. proběhl na branchi PR #42 autentizovaný pozitivní Operator scénář:

- Operator `mikestudio` otevřel přiřazeného testovacího leadu.
- `Call Client` přešel přes `Dialing` do `In call`.
- `End call` přešel do `Awaiting outcome`.
- Výsledek `Not interested` se uložil a assignment se uvolnil.
- Po reloadu workspace skončil na `Waiting for assignment`.
- Call Logs zobrazily uložené call záznamy.

Tento výsledek potvrzuje konkrétní autentizovaný Operator flow a persistence
tohoto výsledku. Nepotvrzuje RLS izolaci, provider telephony ani forced
timeout/error scénář.

## Disposable database verification — historická evidence

Po resetu scratch databáze přes tehdejších 62 migrací proběhl izolovaný scénář
queue completion a workspace hranice. Testovací data byla vytvořena pouze ve
scratch databázi a prostředí bylo po ověření vypnuto.

- První completion vytvořil jeden call a převedl assignment do `available`.
- Opakované completion stejného assignmentu bylo odmítnuto; počet callů zůstal
  jeden.
- Operator bez adresářového oprávnění neviděl leady.
- Team Leader viděl lead ze svého workspace, ale ne lead z jiného workspace.
- Anonymous role neměla SELECT oprávnění na `public.leads`.

Tato evidence zůstává scratch důkazem z 27. 8. a nenahrazuje nové live
persistence, authorization ani RLS ověření.

## Automatické pokrytí

PR #41 přidal kontraktní testy queue/recovery a PR #42 přidal testy timeoutu
startu hovoru a lifecycle audio session. Lokální ověření dokončených slice:

- PR #41: `npm test` 60/60; `npm run check`; `git diff --check` — prošlo.
- PR #42: `npm test` 72/72; `npm run check`; `git diff --check` — prošlo.

Unit/contract testy nenahrazují browser, persistence, authorization, RLS ani
live deployment důkaz.

## Migration provenance

PR #40 je sloučený do `main` jako `d04e05e`. Aktuální main-compatible checkout
obsahuje 63 migrací a linked dry-run je čistý. Tento stav potvrzuje shodu
provenance a absenci pending migrací podle použitého checkoutu; není to
povolení k novému live pushi ani důkaz, že libovolná budoucí větev je live.

Historická mapa remote-only verzí z původního snapshotu je archivní evidence,
nikoli aktuální instrukce k opravě historie. Nesmí se řešit `migration repair`,
přepsáním historie, slepým `db pull` do product checkoutu ani hromadným
`--include-all` bez nového rozhodnutí.

## Doporučený další krok

Provést samostatný review PR #21, #23 a #28. Každý z nich se musí posuzovat
odděleně podle dopadu na business mutace, blueprint persistence, RLS a live
migration provenance. Do té doby je ponechat jako draft a nic z nich
neaplikovat do live databáze.

## Bezpečnostní hranice

V rámci této aktualizace nebyla změněna live databáze, migration history,
role, membership ani produktová data. Scratch prostředí nebylo použito k novému
testu. Merge PR #17, #40, #41 a #42 je Git změna; není to totéž jako live
deployment.
