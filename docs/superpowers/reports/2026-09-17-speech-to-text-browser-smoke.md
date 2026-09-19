# Speech-to-text browser smoke v AI trenažéru

**Datum:** 17. 9. 2026
**Prostředí:** Sandbox `countdown-crm-sandbox-20260824` (`lpvypihpxhyjljikfzqo`), lokální `next dev 16.3.5`
**Production:** beze změny (použit byl pouze linked sandbox a `TEST_OPERATOR` účet)
**Účel:** ověřit browserovou UX část speech-to-text spiku (P1.5 bod 8) a posoudit, zda se z ní dá postavit přirozený rozhovor s AI zákazníkem

## Výsledek

Ověření prošlo jen částečně — podporovaná cesta a přenos `source`/`confidence` fungují, ale UX neodpovídá představě „reálného rozhovoru" a část kontrolních scénářů zůstává neověřená.

### Co bylo skutečně ověřeno

- Autentizovaný vstup `TEST_OPERATOR` účtem proběhl proti linked sandboxu; session cookie `sb-lpvypihpxhyjljikfzqo-auth-token` byla navázána a `/training` se načetl.
- Tréninková session šla spustit a tlačítko `Mluvit místo psaní` bylo aktivní (`speechSupported !== false`).
- **Reálné rozpoznávání řeči v prohlížeči fungovalo** a vrátilo český text s diakritikou (např. `pro podporu kloubů hodí se`, `Jak dlouho už ty vaše obtíže trvají`). Stav UI se přepnul na `Přepis je připravený k úpravě`.
- Deterministickým mockem rozpoznávače bylo potvrzeno nastavení adapteru: `lang = cs-CZ`, `continuous = false`, `interimResults = true`, `maxAlternatives = 1`.
- Průběžný přepis se zobrazil odděleně a necommituje se do textarey: `Průběžný přepis: dobrý den tady`.
- Finální přepis se propsal do editovatelného textarea a nastavil `inputSource = browser_speech`.
- Tělo server action `submitTrainingTurnAction` obsahovalo správný kontrakt:
  `"userMessage":"Dobrý den, tady Jan Novák z Countdown. Mluvím prosím s Marií Královou?","source":"browser_speech","confidence":0.88`.
- AI zákazník na tah odpověděl a do timeline se přidaly odpovědi obou stran.

### Co ověřeno nebylo

- Odmítnutí oprávnění k mikrofonu (`not-allowed`), `no-speech`, obecná chyba přepisu a opakování po chybě.
- Nepodporovaný prohlížeč (`speechSupported === false`, disabled tlačítko a text `Browserový přepis není podporovaný`).
- Skutečné uložení tréninkové session (`Ukončit a vyhodnotit` / `saveTrainingSessionAction`) a read-back v Call Logu a review. Session v tomto smoke nebyla dokončena, takže se nic nepersistovalo.
- Reálný mluvený vstup od člověka s ověřenou diakritikou a námitkami; zachycený text vznikl z okolního zvuku, ne z řízeného scénáře.

## Zjištěné vady

1. **Klik na každou promluvu.** `createBrowserSpeechRecognition` nastavuje `continuous = false` (`src/lib/speechRecognition.ts:76`). Relace se po krátké pauze ukončí a operátor musí pro každou další větu znovu zmáčknout `Mluvit místo psaní`. To je hlavní důvod, proč to nepůsobí jako rozhovor.
2. **Během poslechu nelze odeslat.** `Odeslat` je přes `speechBusy` zakázané, dokud poslech běží nebo se zpracovává. Operátor musí nejdřív poslech zastavit a teprve pak odeslat.
3. **Race při rychlých opakovaných klicích.** Guard v `startListening` čte `speechStatus` z closure, takže několik kliků před re-renderem projde a spustí více instancí rozpoznávače; `recognitionRef` se přepíše a předchozí instance se neuvolní. V logu mocku počet `start` přesáhl počet tahů.

## Architektonické zjištění

Současný spike není „AI poslouchá operátora" v audiálním smyslu. Je to textová pipeline:

```
mikrofon → Web Speech API (přepis) → text → LLM (Gemini/OpenAI) → text → browser TTS (hlas)
```

AI zákazník dostává text přepisu (`src/app/actions/training.ts`), ne zvuk. Přepis tedy není jen review artefakt, ale zároveň vstupní mechanismus — což odpovídá diktování, ne rozhovoru.

Pro „reálný rozhovor" s lidským hlasem existují tři cesty:

1. **Realtime voice API** (Gemini Live / OpenAI Realtime). Model přijímá audio stream a odpovídá přirozeným hlasem, zvládá přerušení a pauzy. Klíče už v projektu jsou (`GEMINI_API_KEY`, `OPENAI_API_KEY`); potřeba je serverová route držící klíč a WebSocket/WebRTC klient. Placené za minuty. Nejblíž skutečnému hovoru.
2. **Vylepšení stávající pipeline.** `continuous = true`, auto-obnovení poslechu po dohrání AI, odeslání během poslechu, oprava race, lepší český neuronový hlas. Levné a rychlé, ale zůstává polo-duplexní a hlas z prohlížeče zní roboticky.
3. **Telnyx (skutečný telefonát).** Nejrealističtější, ale externě blokované.

## Rozhodnutí

Zatím se neimplementuje. Zjištění je zdokumentované a směr se rozhodne později podle priority vůči P1.5. Pokud se má stavět přirozený rozhovor, je preferovaná varianta realtime voice API.

## Poznámka k zabezpečení

Při automatizaci se hodnota hesla `TEST_OPERATOR` účtu objevila v přístupnostním snapshotu prohlížeče, tedy v artefaktech automation. Doporučuje se brát sandbox testovací účet jako kompromitovaný a před dalším použitím rotovat jeho heslo. Do repozitáře se žádné tajemství neuložilo.
