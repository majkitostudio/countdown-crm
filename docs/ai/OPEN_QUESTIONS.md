# Open Questions

## Critical

### Question: Kdy bude ověřený live Telnyx outbound pilot?

- Why it matters: Bez správného čísla, provider konfigurace, webhook read-backu a browserového testu nelze vydávat telefonii za produkční.
- Current understanding: Telnyx WebRTC foundation existuje, ale live režim je externě blokovaný; fallback softphone a Docker/Asterisk laboratoř nejsou live důkaz.
- Related area: Telephony / Operations
- Status: OPEN
- Source: `PROJECT.md`, `docs/TELEPHONY_TELNYX_SETUP.md`, `docs/AKTUALNI_STAV_A_DESATERO.md`

### Question: Který počet aplikačních testů je autoritativní pro aktuální pracovní strom?

- Why it matters: Různé snapshoty dokumentace uvádějí různé výsledky a AI agent nesmí prezentovat zastaralé číslo jako aktuální.
- Current understanding: `PROJECT.md` (snapshot 2026-09-19) uvádí 642/642 testů; `docs/AKTUALNI_STAV_A_DESATERO.md` uvádí novější 687/687. Při tomto úkolu nebyla sada znovu spuštěna.
- Related area: Validation / Documentation
- Status: OPEN
- Source: `PROJECT.md`, `docs/AKTUALNI_STAV_A_DESATERO.md`

## Important

### Question: Kdy bude P0.4 Auth hardening aktivován a znovu ověřen?

- Why it matters: Leaked-password protection je vědomě odložená před externí pilot nebo expanzi.
- Current understanding: Interní provoz je současný scope; před externím pilotem je potřeba ochranu zapnout a provést Auth smoke test.
- Related area: Auth / Security / Pilot readiness
- Status: OPEN
- Source: `PROJECT.md`, `docs/AKTUALNI_STAV_A_DESATERO.md`

### Question: Jaký je finální produktový důkaz připravenosti interního pilotu?

- Why it matters: Kódové a statické testy samy neprokazují souvislý autentizovaný pracovní den operátora ani všechny provozní závislosti.
- Current understanding: Dokumentace požaduje pilotní pracovní den, stabilní hlavní smyčku, cleanup/rollback postup a žádná tajemství; některé části mají samostatný browser nebo Sandbox důkaz.
- Related area: Pilot / QA / Operations
- Status: OPEN
- Source: `docs/AKTUALNI_STAV_A_DESATERO.md`, `docs/WORKFLOW.md`

## Later

### Question: Jak bude po stabilní telefonii rozhodnuto o audio/transcription směru?

- Why it matters: Dokumentace odděluje browserový speech-to-text spike, serverové AI scénáře a budoucí Telnyx/SIP audio; jejich sloučení by vytvořilo neověřený produktový slib.
- Current understanding: Další rozhodnutí je odložené do doby, kdy bude jasný telefonní provider a opakovatelný audio kontrakt.
- Related area: AI / Telephony / Training
- Status: DEFERRED
- Source: `docs/AKTUALNI_STAV_A_DESATERO.md`, `docs/superpowers/reports/2026-09-17-speech-to-text-browser-smoke.md`

### Question: Kdy a zda se týmové vlastnictví rozšíří do workflow, produktů a Walletu?

- Why it matters: Rozšíření scope by měnilo autorizaci, RLS, read modely a produktovou odpovědnost.
- Current understanding: Aktuální směr tuto oblast záměrně nerozšiřuje před stabilizací hlavní pracovní smyčky.
- Related area: Teams / Authorization / Product scope
- Status: DEFERRED
- Source: `PROJECT.md`, `docs/AKTUALNI_STAV_A_DESATERO.md`

## Resolved / historical notes

Při vytvoření této vrstvy nebyla žádná výše uvedená otevřená otázka nově vyřešena. Starší dokumenty a jejich historické snapshoty zůstávají zdroji kontextu, ale nemají bez dalšího přednost před aktuálním kódem a ověřením.
