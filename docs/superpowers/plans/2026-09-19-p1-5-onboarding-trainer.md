# P1.5 Onboarding trenér — implementační plán

**Specifikace:** `docs/superpowers/specs/2026-09-19-p1-5-onboarding-trainer-design.md`
**Stav:** schváleno k implementaci
**Cíl:** Sandbox only; Production se nemění

## Zásady

- Nejprve serverový datový kontrakt a testy, potom UI.
- Trenér oddělený od ostrých hovorů, objednávek, Walletu, týmových výsledků.
- AI coachingová zpětná vazba = konkrétní opravy (špatně / správně), bez bodů.
- Lidský verdikt TL oddělený od automatické zpětné vazby.
- Tajné klíče zůstávají pouze v prostředí, nikdy v repozitáři.

## Fáze 0 — příprava a audit

- [ ] schválit specifikaci (tento dokument)
- [ ] ověřit existující tréninkové DAL: `training_sessions`, `training_session_turns`, `saveTrainingSessionAction`, `getTrainingScenario`, `personaliseTrainingScript`, `submitTrainingTurnAction`
- [ ] ověřit tréninkové skripty v `src/lib/training.ts` (2× P2, 3 persony, 2 obtížnosti)
- [ ] ověřit compliance pravidla v `src/lib/compliance.ts`
- [ ] potvrdit Sandbox runtime proměnné pro AI (Gemini/OpenAI) bez ukládání tajemství do repozitáře
- [ ] ověřit stávající browser STT (`src/lib/speechRecognition.ts`): známe vady, plán Fáze A

**Výstup:** schválený datový kontrakt a seznam skutečných zdrojů. Žádná migrace, Production beze změny.

## Fáze 1 — serverová základa coachingové zpětné vazby

- [ ] nový typ `TrainingFeedback` (místo `TrainingScorecard`):
  ```ts
  type TrainingFeedback = {
    type: "objection" | "direction" | "closing" | "compliance" | "other";
    operatorText: string;      // co operátor řekl
    suggestedText: string;     // jak to mělo znít
    reason: string;            // proč
    severity: "critical" | "warning" | "info";
  }
  ```
- [ ] nová serverová funkce `generateTrainingFeedback(scenario, history)`:
  - volá AI (Gemini `gemini-3.6-flash` / OpenAI) s promptem: přepis + skript + compliance pravidla → pole `TrainingFeedback[]` (max 7)
  - redakce kontaktních údajů, limit délky odesílaného textu
  - atomický claim proti duplicitám (stejný pattern jako AI kontrola kvality hovorů)
  - `unavailable` při chybě AI, zachovat dostupnost ostatních dat
  - žádný fallback na pravidlový engine (ten se maže)
- [ ] `saveTrainingSessionAction` uloží `feedback: TrainingFeedback[]` místo `scorecard: TrainingScorecard`
- [ ] `training_session_turns` zůstává beze změny (přepis tahů)

**Testy:** AI validace odpovědi (timeout, neplatná odpověď, opakované spuštění, chybějící přepis, compliance nález, špatný objection handling, chybějící adresa, úspěšný průchod). Anonymizované volání AI v Sandboxu s klíčem z runtime prostředí.

## Fáze 2 — Fáze A hlasu: oprava browser STT pipeline

- [ ] `src/lib/speechRecognition.ts`: `continuous = true`, auto-obnovení po dohrání AI, odeslání během poslechu, oprava race v `startListening` (guard na ref, ne na closure), lepší český hlas (zvolit dostupný neuronový)
- [ ] stavy UI: `listening` → `processing` → `ready` → `error` / `unsupported` (existují, jen se napojí na nový flow)
- [ ] `submitTrainingTurnAction` přijímá `source: "browser_speech"` + `confidence` (existuje)
- [ ] akceptační scénáře: krátký skript, diakritika, pauzy, námitky, odmítnutí oprávnění, opakování po chybě, nepodporovaný prohlížeč

**Testy:** STT smoketest (mock + reálný mikrofon), race test (rychlé kliky), odmítnutí mikrofonu, `unsupported` prohlížeč.

## Fáze 3 — UI: tréninková stránka + výsledky

- [ ] `/training` – výběr skriptu (2× P2), obtížnost (`easy`/`standard`), persona (3×)
- [ ] průběh hovoru: časová osa, STT tlačítko, AI zákazník, compliance varování v reálném čase
- [ ] `Ukončit a vyhodnotit` → `saveTrainingSessionAction` → přesměrování na detail
- [ ] Detail tréninkové session (`/training/reviews/[sessionId]`):
  - přepis časové osy
  - **AI coachingová zpětná vazba** (seznam oprav: špatně / správně / důvod)
  - **Lidský verdikt TL** (textové pole, oddělené, uloží se přes `recordTrainingReviewAction`)
  - žádné skóre, známky, `passed/failed`
  - sjednocení vzhledu s designovým systémem (žádná `sky` barva mimo info kontext)

**Testy:** end-to-end browser smoke (operátor + TL), compliance varování, AI zpětná vazba renderuje, TL verdikt se uloží, negativní read-back obchodních tabulek.

## Fáze 4 — ověření a důkaz v Sandboxu

- [ ] `npm test` – vše projde
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` – PASS
- [ ] autentizovaný browser smoke jako operátor (celý flow: výběr → hovor → AI opravy → detail)
- [ ] autentizovaný browser smoke jako Team Leader (detail → verdikt → uložení)
- [ ] scénář s kritickým compliance porušením a opakovaným porušením
- [ ] negativní read-back: `calls`, `orders`, `lead_queue_items`, `team_assistance` po tréninku beze změny
- [ ] cleanup testovacích dat, sanitizovaný report

**Produkce se v žádné fázi nepoužije.**

## Podmínky dokončení

Plán je dokončen, až nováček bezpečně dokončí jeden cvičný P2 hovor, v Call Logu vznikne tréninkový záznam bez obchodních vedlejších efektů, AI coachingová zpětná vazba ukazuje konkrétní opravy, Team Leader zapíše oddělený verdikt, Fáze A hlasu funguje v podporovaném prohlížeči. Speech-to-text spike je samostatný ověřovací krok; jeho úspěch se nesmí vydávat za dokončenou telefonní transkripci.