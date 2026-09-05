# Local Telephony Settings and SIP Console — Design

**Status:** Návrh schválený pro plánování  
**Datum:** 5. 9. 2026  
**Vazba:** dočasná lokální validační telefonie před budoucím Telnyx pilotem

## Jednoduše řečeno

Countdown dostane v Admin Settings jednu jasnou sekci **Telephony adapter**.
Administrátor v ní uvidí `Local SIP` a `Telnyx adapter`. Pro tuto fázi bude
`Local SIP` jediná volitelná možnost; Telnyx zůstane viditelný, ale zablokovaný
s vysvětlením, že chybí externě ověřené číslo a webhook.

Po zapnutí Local SIP se zobrazí proklik na krátkou administrační stránku
`/telephony`. Ta bude dostupná pouze administrátorovi a poskytne přehled lokální
Asterisk ústředny v Dockeru, interních linek, testovacích hovorů a posledních
telefonních eventů.

Lokální ústředna nebude nahrazovat Telnyx ani sloužit jako veřejný telefonní
operátor. Je to nástroj pro ověření chování Countdownu kolem hovoru.

## Cíle

- Uložit aktivní telephony adapter serverově na úrovni workspace.
- Odstranit závislost výběru adapteru na `localStorage`.
- Povolit změnu adapteru pouze workspace administrátorovi.
- Zapsat změnu adapteru do auditní stopy.
- Přidat jasnou Admin Settings sekci s kotvou `/settings#telephony-adapter`.
- Zobrazit odkaz na `/telephony` pouze při aktivním Local SIP.
- Chránit `/telephony` serverovým administrátorským guardem.
- Spustit lokální Asterisk v Dockeru se dvěma interními endpointy.
- Napojit lokální telefonní lifecycle na existující CRM call session a post-call
  workflow.
- Zachovat současný simulovaný softphone jako bezpečný fallback.
- Zachovat Telnyx adapter oddělený a připravený pro pozdější pilot.

## Mimo scope

- Veřejné telefonní číslo nebo SIP trunk.
- Volání na mobilní či pevné sítě.
- GSM gateway, SIM karta nebo napojení běžného mobilu.
- Produkční call centrum, inbound routing a call queue přes veřejnou síť.
- Nahrávání, audio retention, přepis a Gemini AI.
- Veřejně dostupné Asterisk administrační rozhraní.
- Konfigurace Asterisku z webového UI.
- Přepnutí na Telnyx před externím ověřením čísla a webhooku.
- Přidání nové sidebar položky pro operátora.

## Workspace telephony nastavení

### Zdroj pravdy

Aktivní adapter je workspace konfigurace, nikoli osobní preference uživatele.
Bude uložený v nové tabulce `public.workspace_telephony_settings` s jedním
řádkem na workspace. Tabulka bude obsahovat `workspace_id`, `active_adapter`,
`updated_by`, `created_at` a `updated_at`. Hodnota `active_adapter` musí být
omezená na explicitní množinu:

```ts
type TelephonyAdapter = "simulation" | "local_sip" | "telnyx";
```

`simulation` zůstává interní fallback pro workspace bez explicitní aktivace;
v Admin Settings nemusí být nabízena jako produkční volba. `local_sip` je
volitelný adapter této fáze. `telnyx` je v UI viditelný, ale server ho do
aktivního stavu nepovolí, dokud nebude odstraněný externí blocker.

### Bezpečnost

- Čtení konfigurace musí být omezené na členy stejného workspace.
- Změnu smí provést pouze `administrator`.
- Server musí znovu ověřit povolenou hodnotu a blocker Telnyx; disabled UI není
  bezpečnostní hranice.
- Změna musí obsahovat původní a nový adapter, workspace, aktora a čas.
- Provider credentials, SIP hesla ani Telnyx secrets se do konfigurace ani
  auditu neukládají.
- RLS musí chránit řádky i při přímém přístupu přes Supabase Data API.

### Výchozí a chybové stavy

- Bez uložené workspace volby zůstává aktivní `simulation`, aby existující
  prostředí nezačala nečekaně volat přes nový provider.
- Neplatná hodnota se odmítne jako validation error.
- Pokus aktivovat Telnyx v blokovaném stavu vrátí bezpečný blokovaný výsledek a
  nezmění konfiguraci.
- Nedostupná konfigurace se v UI zobrazí jako `Needs attention` nebo `Blocked`,
  nikdy jako `Ready`.

## Admin Settings

### Sekce

Na `/settings` vznikne samostatná sekce s přesným identifikátorem:

```text
id="telephony-adapter"
```

Přímý odkaz bude:

```text
/settings#telephony-adapter
```

Sekce zobrazí:

```text
Telephony adapter

Local SIP        Available
Telnyx adapter   Blocked — verified number required
```

`Local SIP` lze aktivovat. `Telnyx adapter` je vizuálně disabled a obsahuje
stručné vysvětlení blockeru. Server stejně odmítne přímý pokus o aktivaci.

Po aktivaci Local SIP se zobrazí tlačítko nebo odkaz:

```text
Open Telephony
```

které vede na `/telephony`.

Sekce nesmí používat stávající osobní/local browser settings jako zdroj pravdy.
Po uložení musí být nový stav načtený serverově a po reloadu stejný pro všechny
členy workspace.

## Stránka `/telephony`

### Přístup

- Route bude server page component s `requireWorkspaceRole(["administrator"])`;
  interaktivní testovací panel může být samostatná client component.
- Neautorizovaný uživatel nesmí stránku získat pouze přímou URL.
- Pokud Local SIP není aktivní, administrátor stránku uvidí v blokovaném
  stavu s odkazem přímo na `/settings#telephony-adapter`.
- Odkaz na Settings musí zůstat funkční i tehdy, když je aktivní simulation
  nebo Telnyx ve stavu blocked.
- Stránka se nepřidává do běžné operátorské navigace.

### Obsah první verze

1. **Telephony status** — aktivní adapter, engine, prostředí a stav `Ready`,
   `Starting`, `Unavailable`, `Configuration error` nebo `Blocked`.
2. **Internal extensions** — linky `1001` a `1002`, jejich registrační stav a
   případná chyba.
3. **Test call** — volba zdrojové a cílové interní linky a spuštění testu.
4. **Active calls** — read-only přehled interních call sessions a jejich délky.
5. **Recent events** — poslední eventy s časem, zdrojem, cílem a stavem.
6. **Boundaries** — pravdivé označení `Local only`, `Public PSTN disabled`,
   `Recording disabled` a `Telnyx blocked`.

První verze nebude měnit Asterisk konfiguraci. Tajná hesla, tokeny a interní
konfigurační hodnoty se v diagnostice nezobrazí.

## Lokální Asterisk v Dockeru

### Provozní model

Ústředna bude běžet pouze lokálně a nebude veřejně dostupná. Konfigurace bude
oddělená od produkčního Next.js procesu a spouštěná explicitním lokálním
Docker Compose souborem.

Navržený tvar:

```text
Docker Compose
└── Asterisk
    ├── WebSocket/WebRTC transport
    ├── extension 1001
    └── extension 1002
```

Asterisk bude mít pouze interní dialplan pro testovací linky. Bez SIP trunku
nebude mít cestu do veřejné telefonní sítě.

### CRM napojení

Lokální adapter musí používat stejný doménový lifecycle jako Telnyx:

```text
initiated → ringing → connected → held → ended
                                      ↘ failed
```

Lokální session bude označená providerem `local_sip`. Telnyx-specifická ID
zůstanou prázdná; obecné provider event ID nebo provider metadata musí umožnit
idempotentní uložení lokálních eventů.

Současný Telnyx tok se nesmí rozbít. Sdílený lifecycle a call session boundary
se extrahují tak, aby Telnyx zůstal jedním adapterem a Local SIP druhým.

### Datová hranice

Pokud současné telephony tabulky dovolují pouze `provider = 'telnyx'`, vznikne
bezpečná migrace, která:

- povolí explicitně `simulation`, `local_sip` a `telnyx` pouze v
  `workspace_telephony_settings.active_adapter`, zatímco session/event modely
  budou používat `local_sip` nebo `telnyx`,
- zachová existující Telnyx řádky a Telnyx-specific columns,
- přidá obecné pole `provider_call_id` do `telephony_call_sessions` a unikátní
  index `(provider, provider_call_id)` pro lokální i budoucí provider ID,
- ponechá RLS workspace politiky,
- doplní typy generované z aktuálního schématu,
- bude nejdřív ověřená v lokální databázi a následně proti cílovému prostředí.

Migrace nesmí používat service role jako náhradu RLS a nesmí vystavit provider
secrets přes veřejný Data API.

## Tok od nastavení po wrap-up

1. Administrátor otevře `/settings#telephony-adapter`.
2. Aktivuje `Local SIP`.
3. Server ověří roli, workspace a povolenou hodnotu.
4. Změna se uloží a zapíše do auditu.
5. Settings zobrazí proklik na `/telephony`.
6. Administrátor na `/telephony` ověří stav Asterisku a linky.
7. Operátor zůstává v Operator Console a zahájí hovor s leadem.
8. Server založí workspace-scoped call session s providerem `local_sip`.
9. Browser/adapter naváže interní SIP/WebRTC call přes Asterisk.
10. Skutečně pozorované stavy se uloží jako call eventy a synchronizují session.
11. Po `ended` pokračuje existující post-call wrap-up.
12. Outcome, callback nebo objednávka se uloží stejnou atomic completion cestou
    jako u fallbacku.
13. Po reloadu je session, event trail a audit dohledatelný.

Pokud Asterisk, browser media nebo session persistence selže, stav skončí v
čitelném `failed` nebo `Unavailable`. HTTP úspěch sám o sobě nesmí vytvořit
`connected`.

## Chování při chybách

- Asterisk není dostupný → `Unavailable`, žádný falešný hovor.
- Interní linka není registrovaná → test call se nespustí a zobrazí se konkrétní
  důvod.
- Browser nemá media permission → session přejde do `failed`, pokud není
  terminální.
- Event přijde dvakrát → uloží se pouze jednou.
- Event přijde mimo pořadí → server použije společný monotónní stavový kontrakt.
- `ended` nebo `failed` už nelze pozdním eventem znovu otevřít.
- Neadmin otevře `/telephony` → serverový `403`/bezpečný forbidden stav.
- Telnyx activation request → blokovaný výsledek bez změny workspace nastavení.
- Chyba databáze → diagnostika ukáže nedostupnost a neoznačí službu jako ready.

## Ověření

### Automatické testy

- workspace settings contract testy pro implicitní `simulation`, aktivní
  `local_sip` a blokovaný `telnyx` výběr,
- workspace scope a administrator-only update testy,
- test, že nastavení se nepoužívá z `localStorage`,
- test stabilní kotvy a odkazu na `/telephony`,
- route authorization testy pro administrator, team leader, operator a přímou URL,
- local SIP lifecycle a idempotency testy,
- regresní Telnyx lifecycle testy,
- test, že provider failure nevytvoří `connected` nebo `completed`.

### Databáze

- migration history a schema diff,
- RLS čtení v rámci workspace,
- odmítnutí cizího workspace,
- odmítnutí změny neadministrátorem,
- auditní read-back změny adapteru,
- session/event read-back po lokálním testovacím hovoru.

### Manuální důkaz

1. Přihlásit se jako administrator.
2. Otevřít `/settings#telephony-adapter`.
3. Aktivovat Local SIP a ověřit reload.
4. Otevřít `/telephony` a ověřit stav Asterisku a linek.
5. Propojit `1001` a `1002` a ověřit ringing, connected a ended.
6. V Operator Console zahájit lokální hovor nad dostupným leadem.
7. Dokončit post-call outcome.
8. Reloadnout aplikaci a ověřit session, event trail, outcome a audit.
9. Ověřit, že operator a team leader nemohou `/telephony` otevřít.
10. Ověřit, že Telnyx zůstává viditelný, ale nejde aktivovat.

## Akceptační kritéria

- Aktivní adapter je uložený serverově na workspace úrovni.
- `localStorage` není zdrojem pravdy pro telephony adapter.
- Pouze administrator může adapter změnit.
- Změna adapteru je auditovatelná.
- Admin Settings má stabilní kotvu `/settings#telephony-adapter`.
- Při Local SIP se zobrazí odkaz na `/telephony`.
- Blokovaná stránka `/telephony` odkazuje přímo na `/settings#telephony-adapter`.
- `/telephony` je serverově dostupná pouze administrátorovi.
- Local SIP Asterisk v Dockeru poskytne dvě interní testovací linky.
- Lokální hovor projde přes `initiated`, `ringing`, `connected`, `ended` nebo
  bezpečný `failed` stav.
- CRM uloží session a eventy s providerem `local_sip` a po reloadu je dohledá.
- Post-call wrap-up funguje bez nové paralelní completion logiky.
- Telnyx zůstane blokovaný až do samostatného externího ověření.
- Simulovaný softphone zůstane bezpečným fallbackem.
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, databázová
  kontrola a diff check mají známý výsledek.

## Dokumentační hranice

Dokud neprojde manuální i databázový důkaz, dokumentace musí označovat Local
SIP jako lokální integrační laboratoř. Nesmí tvrdit, že Countdown umí veřejné
telefonní hovory, produkční call-center routing nebo ověřený Telnyx pilot.
