# P1.5 Onboarding trenér — návrh

> **Historická specifikace (aktualizováno 23. 9. 2026):** Tato stránka
> obsahuje původní návrh scorecardu a slouží jako historie rozhodnutí.
> Aktuální implementace používá coachingový `TrainingFeedback` bez skóre,
> známek a `passed/failed`. Pro aktuální stav používej
> `docs/AKTUALNI_STAV_A_DESATERO.md`.

**Stav:** návrh k produktovému schválení, ne implementace
**Datum:** 19. 9. 2026
**Vstupní podmínky:** uzavřený Team Checkpoint (hotovo 19. 9. 2026),
pravdivý Call Log, hranice zápisu hovoru, neměnný snapshot Product Scriptu,
funkční Team Leader Review.
**Production:** beze změny v celém návrhu; vše v Sandboxu.

## Účel

Bezpečný nácvik reálného P2 outbound/free-sample rozhovoru s AI zákazníkem
pro nováčka před prvními ostrými hovory. Není to obecný AI simulátor, herní
plocha ani náhrada živé telefonie. Jedno cvičení = jeden souvislý rozhovor
nad jedním schváleným skriptem, s přesnou compliance stopou a lidským
verdiktem Team Leadera.

## Výchozí stav v kódu (19. 9. 2026)

Trenér existuje jako funkční základ, návrh ho dotahuje do pilotu:

- `src/lib/training.ts`: 2 P2 skripty (`p2-joints-free-sample`,
  `p2-vitality-free-sample`), 3 persony, obtížnosti `easy`/`standard`,
  regex compliance pravidla, `evaluateTrainingSession` se scorekartou
  (celkové skóre, známka A–D, `passed`, 5 dimenzí, compliance nálezy,
  silné stránky / zlepšení).
- Uložení (`trainingSession.ts`): scorekarta se **přepočítává na serveru**
  (klient ji nepodvrhne), idempotence přes `completion_key`, immutable
  `script_snapshot` (titul, produkt, obtížnost, zákazník, sekce) — pozdější
  změna textu v kódu nepřepíše historii.
- Review (`trainingReviews.ts`, `/training/reviews/[sessionId]`): lidský
  verdikt oddělený od automatického skóre.
- Hlas: browser pipeline funkční, se známými vadami (klik na každou promluvu,
  race v `startListening`, robotický hlas) — viz report
  `2026-09-17-speech-to-text-browser-smoke.md`.

## Skripty: revize ano, stěhování ne (doporučení inženýra)

Oba skripty žijí v kódu, takže je Team Leader bez deploye neupraví. Pro
pilot je to přijatelné omezení: obsah projde jednorázovou revizí
(produkt + Team Leader: schválený jazyk, citlivá témata, zákaz slibů),
historie je krytá snapshotem u každé session. Stěhování do verzovaných
`product_scripts` až po pilotu, kdy bude jasné, kdo skripty vlastní a jak
často se mění. Revizní checklist: opening bez nátlaku, zákaz diagnostiky a
léčebných slibů, bezpečný závěr s ověřením adresy, fiktivní persony bez
reálných osobních údajů.

## Automatické vyhodnocení — nahrazujeme coachingovou zpětnou vazbou

Stávající `TrainingScorecard` (skóre 0–100, známky A–D, 5 dimenzí, `passed/failed`)
**se smaže**. Místo ní:

**Konec hovoru → AI coachingová zpětná vazba:**
- AI projde přepis a vrátí **seznam konkrétních oprav** (max 5–7):
  - *Co jsi řekl* → *jak to mělo znít* (objection handling, špatný směr, chybějící adresa, compliance).
  - Žádné body, žádné procento, žádné `passed/failed`.
  - Compliance pravidla zůstanou jako **varování** v AI promptu, ne jako penalizace.
- **Lidský verdikt Team Leadera** zůstává rozhodující: dostane přepis + AI opravy → píše vlastní poznámku.

UI místo karty se skóre zobrazí **seznam oprav** s možností TL přidat vlastní poznámku.
`TrainingScorecard` se nahraďu `TrainingFeedback` (pole oprav).
`evaluateTrainingSession` → nová funkce vracející `TrainingFeedback[]` (AI generuje, ne pravidlový engine).
Compliance pravidla (`src/lib/compliance.ts`) zůstanou jako varování v AI promptu.

## Navržený průchod

1. Operátor na `/training` vybere **skript** (z 2 schválených P2 skriptů,
   výběr produktu), **obtížnost** (`easy` = zákazník vede k nabídce,
   `standard` = jedna přirozená otázka navíc; třetí úroveň až po pilotu) a spustí cvičení. Jméno fiktivního zákazníka se bezpečně
   předvyplní do konkrétní **publikované verze** skriptu; cvičení drží její
   immutable snapshot (stejný princip jako Team Leader Review reálných hovorů).
2. Rozhovor běží tahově: operátor píše (případně diktuje přes opravený
   browser přepis, viz Hlas níže), AI zákazník odpovídá jako zákazník, klade
   přirozené otázky a podle obtížnosti přidává námitky. Při úspěšném průchodu
   může nabídku přijmout a předat **výhradně fiktivní, věrohodné** doručovací
   údaje.
3. Po každém tahu operátora běží synchronně deterministická compliance
   kontrola (`src/lib/compliance.ts`, kritické / warning). První kritické
   porušení se **okamžitě zapíše do výsledku** s přesnou větou, důvodem a
   bezpečnější formulací; AI zákazník standardně pokračuje přirozeně.
   Opakované nebo zvlášť závažné porušení může důvěryhodně změnit jeho reakci.
   Závažná chyba **nikdy neumožní označit cvičení za splněné**, ani kdyby
   zákazník nabídku přijal.
4. `Ukončit a vyhodnotit` uloží tréninkový záznam idempotentně
   (`saveTrainingSessionAction`): přepis, snapshot skriptu, compliance nálezy,
   automatické vyhodnocení. Záznam je viditelně označený jako trénink a
   **nevytváří objednávku, callback, queue event ani zásah do fronty**.
5. Team Leader otevře záznam stejným review mechanismem jako reálný hovor
   (`recordTrainingReviewAction`); lidský verdikt je oddělený od automatického
   nálezu. Tréninkové záznamy nevstupují do týmových výsledků, Daily
   Checkpointu ani AI kontroly reálných hovorů.

## Hlas: návrh dvoufázově (doporučení inženýra)

- **Fáze A (tento slice, hodiny práce):** text-first trenér + oprava stávající
  browser pipeline: `continuous = true`, auto-obnovení poslechu po dohrání AI,
  odeslání během poslechu, oprava race v `startListening`, lepší český
  neuronový hlas. Levné, stačí na nácvik skriptu a compliance.
- **Fáze B (později, samostatný projekt — NENÍ krátká úprava):** realtime
  voice API (preferovaně OpenAI Realtime pro český hlas a přerušování;
  alternativa Gemini Live). Znamená serverové držení klíče, realtime session
  management, audio streaming, zvládnutí přerušování, placení za minuty, nové
  stavy selhání a jejich UI. Rozhodnutí až podle důkazu, že se trenér používá
  a textová verze nestačí.
- Telnyx není tréninková cesta (externě blokovaný a pro nácvik zbytečný).
- MVP neobsahuje nahrávku: důkazem je přepis + snapshot skriptu. Audio
  retention je samostatný pozdější projekt.

## Hranice (nevstupuje do implementace bez schválení)

- Žádný katalog nesouvisejících produktů; žádné fáze klikáním, náladoměr ani
  trpělivost; žádný výběr AI providera v UI.
- Žádný obchodní side-effect: prázdný `calls`, `orders`, `lead_queue_items`
  a `team_assistance` po tréninku se dokládá negativním read-backem.
- Žádné automatické AI skóre jako verdikt; automatika je pravidlový nález,
  verdikt píše člověk.
- Žádné míchání tréninku do ostrých metrik, Walletu a týmových výsledků.

## Akceptační kritéria

1. Nováček dokončí jeden cvičný P2 hovor od výběru skriptu po vyhodnocení.
2. V Call Logu vznikne právě jeden správně označený tréninkový záznam;
   `calls`, `orders` a fronta zůstávají beze změny (negativní read-back).
3. Kritické compliance porušení je dohledatelné na přesnou větu + důvod +
   bezpečnější formulaci, i když simulace skončila „úspěšně".
4. Team Leader otevře stejný podklad a zapíše oddělený lidský verdikt.
5. Odmítnutí mikrofonu, nepodporovaný prohlížeč a nedostupná AI mají pravdivé
   stavy; systém text nedomýšlí a nic nepředstírá.

## Důkazní plán (Sandbox)

- Browser smoke s mikrofonem na podporovaném prohlížeči: krátký skript,
  diakritika, pauzy, námitky, odmítnutí oprávnění, opakování po chybě.
- Scénář s kritickým porušením a scénář s opakovaným porušením.
- TL review tréninkového záznamu včetně lidského verdiktu.
- Negativní read-back obchodních tabulek po tréninku.
- Standardní repo gate: testy, lint, typecheck, build; cleanup testovacích
  dat; sanitizovaný report. Dočasné účty zůstávají perzistentní.

## Otevřená produktová rozhodnutí (potřeba před implementací)

1. Revize obou P2 skriptů (produkt + Team Leader): projít texty podle
   checklistu výše; případné úpravy jdou rovnou do kódu před implementací.
2. Potvrzení hlasové Fáze A nyní / Fáze B později jako samostatný projekt.
3. Potvrzení bodování Koučovací karty (start 100, první závažný nález →
   compliance 45, další výskyt −15, `passed` = nula nálezů a celkem ≥ 70),
   nebo vlastní prahy.
