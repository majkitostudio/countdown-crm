# AI Training (Trenažér) — plán refactoru

**Typ:** zapsaný záměr budoucího přepracování. **Není součástí Fáze 2** — PM rozhodl (13. 10. 2026),
že trenažér projde **velkým samostatným refactorem** později.
**Stav:** ⏳ čeká na detailní zadání a návrh s PM.

> Tohle je záznam „co víme dnes", aby se na to nezapomnělo. Detaily a finální směr teprve vzniknou.

---

## 1. Proč refactor

PM má k trenažéru původní vizi, kterou současná verze nenaplňuje („není to super fajn výsledek").
Chystá se tedy **velké přepracování**, ne dílčí úprava. Do té doby se trenažér v rámci úklidových fází
**nechává být** (jen přejmenování titulku dle pravidel pojmenování).

---

## 2. Co existuje dnes

- **Route:** `/training` (titulek „Trenažér P2" — česky, ke srovnání na `AI Training`).
- **Průběh:** chat s AI zákazníkem + **přepis hlasu** z mikrofonu (browser SpeechRecognition, `cs-CZ`)
  + **TTS** čtení odpovědí.
- **Scénáře:** 2 skripty (`p2-joints-free-sample`, `p2-vitality-free-sample`) — tzv. „vzorky".
- **Persony:** 3 (`Marie Králová`, `Petr Sedláček`, `Jana Dvořáková`).
- **Obtížnost:** `easy` a `standard`.
- **AI zákazník:** zdroje `gemini-flash` / `openai-responses` / `rule-engine` (fallback).
- **Vyhodnocení:** seznam „oprav" (`TrainingFeedback`); při nedostupnosti AI ruční kontrola.
- **Uložení:** tréninková session se ukládá pro kontrolu Team Leaderem (`/team/reviews`).
- **UI:** jedna chatovací obrazovka se startem, během hovoru a výsledkem.

Zdroj: `src/app/training/page.tsx`, `src/lib/training.ts`.

---

## 3. Diagnóza — co tomu chybí (návrh k diskusi)

1. **Chybí struktura hovoru.** Není vidět oblouk *Otevření → Zjišťování → Nabídka → Námitky →
   Uzavření → Potvrzení*, ani kde v něm operátor je.
2. **Chybí skóre.** Místo měřitelného výsledku (např. 4/6 kroků, slabina = námitky) je jen seznam
   textových oprav. Nedá se srovnávat v čase ani mezi operátory.
3. **Málo obsahu.** 2 skripty a 3 persony → po pár bězích repetitivní. Chybí knihovna **námitkových
   drillů** („je to drahé", „rozmyslím si to", „nedůvěřuju").
4. **AI je „hodná" a nepředvídatelná.** Neumí konzistentně eskalovat ani položit hovor → nedá se
   trénovat tlak a uzavření.
5. **Chybí pokrok.** Žádná skóre v čase, série, žebříčky, slabá místa. Bez toho to není trénink.
6. **Chybí napojení na produkt.** Až bude produktová karta (viz
   [PHASE_2_STRUCTURE_REVIEW.md](PHASE_2_STRUCTURE_REVIEW.md), sloučení A), trenažér by měl brát
   **reálné složení / účinky / námitky** z karty, ne dva vymyšlené vzorky.
7. **Technické limity.** Přepis hlasu závisí na browseru (Chrome), kvalita/TTS je základní; AI zákazník
   závisí na dostupnosti poskytovatele.

---

## 4. Směr, který navrhuju (k odsouhlasení)

- **Strukturovaný hovor s koučem:** kroky s checkpointy, živé nápovědy, **skóre za každý krok**.
- **Objection drill mode:** cílené tréninky jednotlivých námitek v rychlém sledu.
- **Pokrok a slabá místa:** historie skóre operátora, série, přehled pro TL (kde je tým slabý).
- **Obsah z produktové karty:** scénáře a námitky tažené z reálného produktu/skriptu.
- **Reálná obtížnost:** persony, které umí i nesouhlasit a zavěsit; úrovně obtížnosti navázané na pokrok.
- **Vzorové hovory:** možnost porovnat vlastní trénink s nejlepším hovorem.

---

## 5. Otevřené otázky pro PM

1. **Jaká byla původní vize?** (co jsi viděl v hlavě, když jsi trenažér zadával)
2. Má být trenažér **měřitelný a skórovaný** (známky, pokrok, žebříčky), nebo spíš **uvolněné
   procvičování** bez tlaku?
3. Má vycházet **z produktových karet** (reálné složení/účinky/námitky), nebo ze samostatných scénářů?
4. Má ho používat **jen operátor sám**, nebo do něj má vstupovat i **Team Leader** (zadávat úkoly,
   hodnotit)? Dnes existuje kontrola v `/team/reviews`.
5. Priorita: děláme refactor trenažéru **hned po Fázi 2**, nebo později (např. po produktové kartě,
   ze které by těžil obsah)?
