# Team Checkpoint — ověření v Sandboxu (19. 9. 2026)

**Prostředí:** lokální `next dev 16.3.5` proti Sandboxu `lpvypihpxhyjljikfzqo`
(workspace `9015a0bf-bb9e-4900-bb3b-b769c4c71f0b`).
**Production:** beze změny.
**Účel:** plný ověřovací průchod novinek Team Checkpointu (5minutová asistence,
detail operátora se skutečnou historií hovorů, read-only předání směny,
naplánované callbacky) + re-verifikace `/team` ve třech rolích.

## Účty

Ověřeno jako persistentní **administrátor**, **Team Leader (tým P1)** a
**operátor**; pro kolizní testy je navíc připravený druhý P1 Team Leader.
Hesla administrátora a obou Team Leaderů byla protočena.
Perzistentní testovací účty se na přání produktu **nemažou** a zůstávají pro
příští testy; hesla jsou předána mimo repozitář. Žádné tajemství není v
reportu ani v repozitáři.

## DB read-back (RLS, Frota Team Leadera vs. administrátor)

| Kontrola | Team Leader (P1) | Administrátor |
|---|---|---|
| Leady | 5, všechny tým P1 | plný workspace |
| Cizí tým (lead bez týmu) | 0 z 3 existujících | 3 |
| Hovory dnes | 0 | 0 |
| Poslední hovory (bez data) | 5, všechny s `duration_seconds`, sestupně | 25 |
| Callback okna (`waiting_callback`) | prošlé 0 · naplánované 0 | prošlé 0 · naplánované 0 |
| Objednávky dnes | 0 | — |
| AI kontrola / asistence | 0 / 0 otevřených | — |

Sandbox součty: 25 hovorů, 16 objednávek, 0 AI kontrol.
Team scope drží ve všech vrstvách (UI, REST/RLS); dotazy nových polí
(`duration_seconds`, callback okna) procházejí RLS pro obě role.

## Browser smoke

| Role | Ověřeno |
|---|---|
| Team Leader | `/team` → `Team Leader access`, `Povolené týmy: P1`; asistence, KPI, výsledky, předání; řádek výsledku otevírá detail s `Zpět na checkpoint` a `Poslední hovory`; přepnutí období Dnes/Týden; taby Kvalita i Fronta; reload drží rozsah; bez browser chyb po opravě hydratace. |
| Administrátor | `/team` → `Administrator access`, týmy P1+P2+P3; detail operátora v období Měsíc ukazuje skutečný hovor s odkazem do Call Review; review stránka renderuje `Call review` s fakty hovoru. |
| Operátor | `/team` → `Team operations unavailable`; `/leads` → nedostupné. |
| Mobil 390 px | Checkpoint se stohuje, bez horizontálního scrollu. |

## Nové prvky

- **5min hranice:** neutrální odznak `čeká Xs` u čerstvé žádosti ověřen
  screenshotem (1440 px i 390 px); práh je nově čistá unit-testovaná funkce
  (`assistanceWait`, ostrá hranice 300 s). Živý overdue stav prokázán
  pollingem: `čeká 5m 21s · déle než 5 min` ve warning odznaku (screenshot
  pořízen, neukládá se do repozitáře).
- **Detail operátora:** prázdný stav `V zvoleném období nemá operátor žádné
  hovory` (Dnes/Týden); naplněný stav s 1 odkazem `Review →` (Měsíc, P3
  operátor s hovorem z 5. 9.); odkaz vede na `/calls/[id]/review` s `Call
  review` fakty (outcome, délka, pravdivé `Transcript unavailable`).
- **Claim → resolve flow:** end-to-end přes UI jako Team Leader; audit
  `claimed` + `resolved` s aktérem a časem; vyřešená žádost mizí z fronty,
  přeležící `claimed` zůstávají viditelné s `Převzato`.
- **Předání směny:** souhrny + `Callbacky v období — prošlé: 0 ·
  naplánované: 0`; tlačítka do fronty a kvality; žádná dokončovací mutace.
- **Naplánované callbacky:** počet `Naplánované v období: 0` v sekci callbacků
  i v předání; zdroj `ready` jen při úspěchu obou dotazů (unit: ostrá hranice
  `>= now`).

## Opravy zjištěné při ověření

- **Hydratace:** živý `čeká Xs` text způsoboval hydration mismatch
  (server vs. klient o sekundu). Opraveno `suppressHydrationWarning` na
  příslušném elementu; dva následující průchody bez browser chyb
  (`src/components/team/TeamAssistancePanel.tsx`).
- **5min logika vytažena z komponenty:** práh, výpočet a formát čekání žijí
  v čistém `src/lib/assistanceWait.ts` s unit testem
  (`tests/assistance-wait-threshold.test.ts`); komponenta je jen renderuje.
- **Čisté helpery checkpointu:** `groupByOperator` (cap 10, pořadí,
  bez operátora se zahazuje) a `splitCallbacksByDue` (ostrá hranice) žijí
  v `src/lib/teamWorkspaceMetrics.ts` s unit testem
  (`tests/team-workspace-checkpoint-helpers.test.ts`); DAL je jen používá.
- **Seed bez `requested` eventu:** přímý RLS insert žádosti o asistenci
  nevytvoří řádek v `team_assistance_request_events` (ten tvoří až aplikační
  akce). Claim/resolve přes UI eventy tvoří správně. Seedy jsou označené
  poznámkou a jejich lifecycle se uzavírá přes UI.
- **Cizí převzetí seedu #1:** žádost nasazená v 07:00 byla v 07:05:59
  převedena do `claimed` účtem shodným s testovacím Team Leaderem mimo
  automatizaci (audit: `claimed`, actor shodný s TL účtem). Následně byla
  korektně dokončena přes UI (`resolved` v 07:19:30) a zmizela z fronty.
  Se žádostí se jinak nepracuje; patří vlastníkovi session.

## Repo kontroly

- `npm test`: 147 souborů, 687 testů — PASS (včetně nových
  `team-workspace-checkpoint-helpers` a `assistance-wait-threshold`).
- `npm run lint`, `npm run typecheck`, `npm run build` — PASS.
- Refaktor během ověření (čisté helpery, `suppressHydrationWarning`,
  `splitCallbackSummaries`) je znovu ověřen plnou sadou.

## Co tento důkaz nepotvrzuje

- Production migrace ani konfigurace se neměnily (žádná migrace nebyla potřeba;
  změna je aplikační + testy).
- Živá telefonie, nahrávání a přepis zůstávají externě blokované.
- Seedy asistence (5×) jsou všechny uzavřené jako `resolved` s auditní stopou;
  otevřená testovací žádost nezůstává žádná.
