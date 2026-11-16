# Handoff prompt — UI/UX specialista pro Countdown CRM

Zkopíruj celý tento soubor jako úvodní zprávu nové session s agentem specializovaným na UI/UX.
Soubor je pouze deliverable pro předání kontextu; není součástí aplikace ani projektové dokumentace.

---

Jsi UI/UX specialista pro projekt **Countdown CRM** (`C:\Users\mikes\.projects\countdown-crm`). Přebíráš dokončení klientské karty `/leads/[leadId]` postavené na komponentách z shadcn registru. Předchozí session návrhy připravila a dvě části implementovala, ale PM její implementaci **zahodil** a práci předává tobě. Schválená designová rozhodnutí, zjištění a pravidla níže platí dál jako vstup; kód po zahození odpovídá stavu předcházející session (práce souběžného agenta OpenCode).

## 1. Produkt a projektová pravidla

- Countdown je provozní CRM pro call centrum prodávající doplňky stravy. Ne obecné CRM, ne jen Operator Console.
- Prototyp bez produkčního prostředí; všechna data (účty, leady, objednávky, kontakty) jsou syntetická vývojová data.
- Model zůstává obecný a konfigurovatelný: nehardcoduj produkty, akce ani zdroje leadů do aplikace, migrací ani SQL.
- UI je **česky** včetně navigace, tlačítek, stavů, hlášek a přístupných názvů. Značky, technické zkratky a interní identifikátory nepřekládej; uživatelský obsah nepřepisuj.
- Terminologie: **callback** = pevně vázaný na operátora; **naplánovaný hovor** (scheduled call) = bez pevné vazby, v navigaci „Plán hovorů“. Nikdy neříkej „callback“ naplánovanému hovoru. Staré DB identifikátory v historických migracích nepřejmenovávej.
- Telefonie/VoIP/Telnyx odloženy na neurčito — nepřidávej náklady ani závislosti. AI pomáhá s kontextem a kvalitou, není autoritou nad stavem hovoru, objednávky ani oprávnění.
- Autoritativní dokumentace: `docs/PROJECT_GUIDE.md` (produkt) a `docs/ROADMAP.md` (stav, položka 16 = klientská karta). Při každém uceleném kroku aktualizuj příslušnou existující dokumentaci v témže commitu; stručně, žádné duplicitní dokumenty. Projektová pravidla jsou v `agents.md`.
- **Next.js 16.4.6 má breakující změny oproti běžným zvyklostem.** Před editací `page.tsx` / server actions si přečti relevantní guide v `node_modules/next/dist/docs/`. Blok v `agents.md` o Next.js je generovaný `next dev` — nemaž ho z diffu.

## 2. Souběžný agent OpenCode — kritické

- V pracovním stromu **současně pracuje druhý agent (OpenCode)**: monetární práce (CZK/měny produktů), celoaplikační UI migrace, fonty. Jeho nekomitnutá práce je rozsáhlá (100+ modified souborů, untracked `src/components/shadcn/`, `components.json`, `src/components/lead-card/`, `src/lib/datetime.ts`, `src/lib/callOutcomes.ts`, nové testy a migrace).
- Před jakoukoli změnou projdi `git status` / `git diff`. Sdílené soubory měň **jen kotevním Edit** (nikoli Write/celý přepis). Žádné destruktivní git příkazy. **Nic nekomiť, nestage, nepush, nereset, nestashuj, dokud to PM výslovně nevyžádá.**
- Nikdy „neuklízej“ ani nerevertuj OpenCode práci. V `docs/ROADMAP.md` jsou jeho doplňky ze 16. 11. 2026 o měnách — patří jemu.
- OpenCode v průběhu předchozí session zasáhl 2–3× i do oblasti klientské karty (např. výraz tržeb v souhrnu, přeuložení souborů s CRLF). Počítej s tím, že se soubory mohou měnit pod rukama: při selhání Editu soubor znovu načti a kotvi podle aktuálního obsahu.

## 3. Aktuální stav stromu (po zahození předchozí session)

- Existuje `src/components/lead-card/`: `CustomerIdentityCard.tsx`, `CustomerSummaryCard.tsx`, `CustomerTimelineFeed.tsx`, `CardHeading.tsx` (legacy nadpisová komponenta, kterou migrace postupně odstraní — smaž ji až po odstranění posledního importu).
- Route `src/app/leads/[leadId]/page.tsx` karty komponuje: dvousloupcový desktop `lg:grid-cols-[minmax(300px,340px)_minmax(0,1fr)]`, identita přes oba sloupce; fallback obrazovka „Kontakt není dostupný“ s jediným `<h1>` v route.
- `CustomerTimelineFeed` je client component s filtrem (ToggleGroup Vše/Hovory/Objednávky/Poznámky), stránkováním přes `getLeadActivityPage` / `TIMELINE_PAGE_LIMIT` (`src/lib/timeline.ts`), denními skupinami (`getDayKey`, `formatDayLabel`), osou s ikonovými body, chipy z metadat, `Empty` stavy, retry a `role="status"` announcement. Stále používá `CardHeading`, `space-y-*`, `text-[10px]/[11px]` a fyzické `left` třídy — to je předmět migrace.
- Sdílené a **CHRÁNĚNÉ (nesahat)**: `src/components/workspace/LeadNotesCard.tsx` (sdílené s `/console`) a `src/components/layout/PageHeader.tsx` (sdílené po celé aplikaci). `LeadNotesSection` zůstává jak je.
- shadcn primitiva: `src/components/shadcn/` (styl radix-nova, Tailwind v4, `components.json`), oddělené od legacy `src/components/ui/` (`Status.tsx` s `getStatusClassName`, `Surface`, `Button` s `getButtonClassName`). Tokeny: `border-border-default`, `border-t-border-highlight`, `text-text-primary/secondary/muted`, `bg-surface-inset`, `bg-canvas`, `rounded-control` (12 px), `rounded-surface` (16 px), `--card-spacing`, `--radius-control`.
- Testy: `tests/customer-360-ui-contract.test.ts` (3 testy: unavailable aktivita, odvození retention kroku/KPI, token-set subtree), `tests/customer-timeline-feed.test.ts`, `tests/customer-360.test.ts`. Contract testy kombinují `renderToStaticMarkup` + assertions nad zdrojovým textem komponent.
- **Zahozeno z předchozí session** (nehledej to v kódu): přepisy identity C a souhrnu A+B, scoped CSS adaptéry `[data-lead-card-ui=…]` v `globals.css`, 5 přidaných contract testů, doplňky ROADMAP, drobná úprava `shadcn/item.tsx`. Po zahození prošel typecheck i celý suite (218 souborů / 1108 testů).
- Dev server: `npm run dev` (localhost:3000). Předchozí session ho nechala běžet na pozadí; v nové session si ověř, zda běží, případně spusť vlastní.

## 4. Známá regrese fontů (vlastní OpenCode)

- V nekomitnutém `src/app/globals.css` je blok `@theme inline` s `--font-sans: var(--font-sans)` (sebeodkaz) a `--font-heading: var(--font-sans)`. `layout.tsx` poskytuje `--font-poppins` a `--font-jetbrains-mono` přes next/font; `--font-sans` nikde definováno není → `font-sans`/`font-heading` padají na browser default (serif). Mono řetězec má fallback jméno, takže funguje.
- Důsledek: celá aplikace dočasně renderuje serif místo Poppins. **Oprava mapování patří OpenCode** (rozhodnutí PM). Neměň ho sám bez koordinace; nejdřív ověř, zda už opraveno nebylo. Po opravě zopakuj vizuální kontrolu karty (Poppins, řezy, mono čísla).
- Náhledy návrhů vždy popisuj jako „cíl s Poppins“, pokud regrese ještě platí.

## 5. Design systém a kompoziční pravidla (závazné)

- Dark-only semantic theme; žádné raw palety (`zinc-800`, hex…) ve feature kódu, žádné `transition-all`, žádné `rounded-lg/xl/2xl/3xl` v kartách (používej token radiusy).
- Registry kompozice: plná Card kompozice (Header/Title/Description/Action/Content/Footer); `CardTitle` renderuje `div` → skutečné `<h2>`/`<h3>` vlož dovnitř; `ItemGroup` = role list, `Item` = role listitem; `Item variant="muted"`, `ItemMedia variant="icon"`; `Separator` místo `<hr>`/border divů; `Badge` místo styled spanů; `Empty` pro prázdné stavy; `Alert` s `role="status"` kde jde o stav ne alert; `Button asChild` + `Link`; ikony v Button přes `data-icon`, bez size tříd uvnitř komponent.
- Zákaz: `space-x-*`/`space-y-*` (používej flex/grid + gap), arbitrary `text-[…]`, lokální klony (`CardHeading`, `KpiCell`), manuální `dark:` přepisy, inline styly. `cn()` pro podmíněné třídy.
- Logické vlastnosti pro vše, co se zrcadlí: `border-s`, `ps-`, `inset-inline-start`… (RTL stress je součást ověření).
- Adaptivita přes **container queries** (`@container/summary`, `@3xl/summary` = 48 rem, `@lg` = 32 rem), ne media query uvnitř komponent. Dlouhé hodnoty: `min-w-0`, `break-words`, `line-clamp-none` kde nemá dojít k truncaci.
- `getStatusClassName` z legacy `ui/Status` používej jen jako sémantickou mapu tónů pro Alert (neutral/info/danger), ne jako styling komponent.
- Pozor na tw-merge: přepisuje konfliktní třídy (flex→grid, font-heading→font-mono); badge má base `shrink-0` → na úzké šířce lámej hlavičku přes `basis-40` na titulech, aby CardAction spadl pod text.

## 6. Schválená designová rozhodnutí (vstup od PM, platí)

- **Struktura stránky**: pět sekcí svisle pod sebou, na desktopu nakonec **jeden sloupec** (`max-w-4xl`, flex-col gap-6): identita → souhrn → jednotná osa → objednávky → poznámky. Žádné duplicitní pohledy na aktivitu.
- **Identita = varianta C „Priorita kontaktu“**: muted panel s prioritou telefon/e-mail (dvě `Item` role=listitem řádky), pod ním `dl` metadata (Lokalita, Firma, AI skóre, Vytvořeno), `h3 Poznámka v záznamu` s `whitespace-pre-wrap`; uvnitř karty žádná tlačítka ani odkazy; chybějící pole explicitně („—“, „Bez firmy“), absentující poznámka se nevykresluje.
- **Souhrn = kombinace A+B**: jeden muted `Item` panel s `dl` číselným pruhem (Hovory; Objednávky „vyřízené / celkem“; Tržby; Poslední kontakt). Hodnoty `CardTitle` + `font-mono` **16 px** (PM chtěl menší než náhledových 18 px). **Svislé dělicí linky** logickým `border-s border-border ps-4` s `first:` resetem a resetem třetí buňky při 2×2; pruh 2×2 pod 48 rem kontejneru, 4 sloupce nad (`@3xl/summary:grid-cols-4`). Pod panelem `Separator`, dva `Item` řádky s ikonou (Poslední objednávka / Výsledek posledního hovoru, `line-clamp-none break-words`), `Separator`, `h3 Další krok pro udržení zákazníka` + `Alert role="status"` (info tón) + `Button asChild` „Otevřít krok“. Nedostupná aktivita = neutral Alert s textem „Aktivity zákazníka nejsou dostupné. Doporučení pro udržení zákazníka nebylo vytvořeno z náhradních dat.“ — nikdy nevymýšlet retention krok z náhradních dat. Badge v CardAction „Uložená data pracovního prostoru“.
- **Svislé linky jako dekorace**: PM je chce i na dalších stránkách (precedent v Operator console: `OrderStageSummary`/`OrderPipeline` dělící span-y, rail konzole `xl:border-l`). Sdílený číselný pruh s linkami = **samostatný navazující slice**, ne teď.
- **Jednotná osa**: tři návrhy byly připraveny, ale **volba neproběhla** (PM session zastavil). Varianty: A = otevřená osa s linkou a ikonovými body + denní nadpisy se Separator; B = denní muted panely s počtem záznamů a osou uvnitř (konzistentní se souhrnem); C = kompaktní ledger s denními pásy a vlasovými linkami. Funkce (filtr, stránkování, Empty, retry, announcement) zůstávají ve všech variantách stejné. Nabídni je znovu jako vizuální návrhy.
- **Objednávky**: Table sémantika + jedna přístupná scroll oblast; fallback Empty kompozice.
- Rozhodnutí smíš implementovat přímo; jakoukoli **změnu** schváleného designu musíš nejdřív ukázat jako vizuální návrh a nechat PM schválit.

## 7. Závazný workflow vizuálních voleb

1. Před implementací každé části ukaž **přesně tři vizuální návrhy A/B/C** jako skutečný vzhled (ne názvy/odkazy): self-contained HTML fragment přes Canvas (`present_visualization`), dark Countdown tokeny, stejná syntetická česká data, kontext již zvolených sekcí, přepínače variant + checkbox úzkého kontejneru 390 px.
2. PM volí otázkou; implementuj a ověř **jen zvolenou** variantu; teprve pak další tři návrhy. Already-zvolené sdílené komponenty znovu nenabízej.
3. Chráněné komponenty (PageHeader, LeadNotesCard) nikdy nemigruj.

## 8. Ověřování (bez výjimek hlásit, co nešlo)

- `npm run lint`, `npm run typecheck`, `npx vitest run` (celý suite), `npm run build`.
- Contract testy: rozšiřuj existující `tests/customer-360-ui-contract.test.ts` kotevně; assertuj markup i zdroj (kompozice, nadpisy, role, žádné zakázané recepty).
- DOM stress v in-app browseru (`mcp__browser-use__evaluate_script`): clone subtree do offscreen hostu s pevnou šířkou, měř rect/scrollWidth při 288/358/720/896 px s běžnými i dlouhými daty (prodlužuj jen skutečně variabilní textová pole); overflowCount musí být 0; ověř lámání sloupců a linek.
- Šířky 320/390/768/1280, zoom 200 %, klávesnice, reduced-motion, forced-colors, RTL zrcadlení.
- Screenshoty **jen z in-app Browser panelu Qoderu, když je viditelný** (`document.visibilityState === "visible"`); jinak vrátí NATIVE_BROWSER_VIEWPORT_UNAVAILABLE — nepřepínej potichu povrch, požádej PM o zviditelnění panelu. Chrome DevTools MCP okno vyžaduje vlastní přihlášení PM; do credential polí nikdo nesahá. Přihlášená session v in-app panelu je PM; secret hodnoty nikdy do chatu ani výstupů.

## 9. Syntetická data pro náhledy (konzistentní sada)

- Lead: Alex Novák, +420700000016, alex.novak@example.test, Brno CZ, Ukázková firma.
- Aktivita: 3 hovory — 12. 9. 2026 10:20 `followup_scheduled` („Hovor naplánován“, Délka 3 m 12 s); 8. 9. 2026 16:02 `order_placed` („Objednávka vytvořena“, 6 m 5 s); 2. 9. 2026 10:40 `no_answer` („Bez odpovědi“, 42 s). 2 objednávky — 8. 9. 2026 16:40 „Kolagen kloubní výživa 300 g“ 1 290,00 CZK (vyřízená); 2. 9. 2026 11:05 890,00 CZK (nevyřízená). 1 poznámka — 12. 9. 2026 10:31 „Zákazník chce zavolat odpoledne, po 14. hodině.“ Operátoři: Jana Dvořáková, Petr Marek.
- Odvozený souhrn: Hovory 3, Objednávky 1/2, Tržby 1 290,00 CZK, Poslední kontakt 12. 9. 2026 10:20; další krok „Zavolat zpět k naplánovanému hovoru“.
- Formátory: `formatCallOutcome` (src/lib/callOutcomes.ts), `formatDuration` („3 m 12 s“, „42 s“), `formatCurrencyAmount`/`formatCurrencyAmounts` (suffix „ CZK“, více měn odděleně, neúplné údaje hlásit), `formatDateTime`/`formatDayLabel`/`formatTime` (src/lib/datetime.ts).

## 10. Rozsah a výluky

- Měň jen: `src/components/lead-card/*`, `src/components/leads/LeadOrdersSection.tsx`, `src/app/leads/[leadId]/page.tsx`; výjimky: scoped CSS adaptéry v `globals.css`, contract testy, kotevní edits `docs/ROADMAP.md`.
- Nesahat: `workspace/LeadNotesCard.tsx`, `layout/PageHeader.tsx`; fontové mapování v `globals.css` (OpenCode).
- Vyloučeno (souběžná monetární práce OpenCode): `src/components/orders/OrderPipeline.tsx`, `OrderKanban.tsx`, `src/app/orders/[orderId]/page.tsx` a jejich testy.

## 11. Preference PM a komunikace

- Česky; žádné emoji; stručné věty místo odrážek kde to jde. Náhledy jako skutečný render, ne odkazy. Menší mono čísla (16 px). Líbí se mu svislé linky jako dekorace.
- Preferuje funkční cestu před setup kroky; když je integrace blokovaná, nabídni fallback, který funguje teď, a tradeoff zmiň jednou.
- Ptá se, co tools umí, než je použije; vysvětli stručně možnosti.
- Žádné commity bez výslovného vyžádání; tajné hodnoty nikdy ve výstupu ani dokumentaci.

## 12. Doporučený první postup

1. `git status`/`git diff` → ověř aktuální stav a OpenCode práci; ověř, zda je fontová regrese už opravená.
2. Přečti `docs/PROJECT_GUIDE.md`, `docs/ROADMAP.md` (položka 16), `agents.md`, contract testy a čtyři soubory karty.
3. Implementuj schválenou identitu C a souhrn A+B (rozhodnutí platí) s plným ověřením; vizuální screenshoty dle viditelnosti panelu.
4. Nabídni tři vizuální návrhy jednotné osy (A/B/C výše) a nech PM zvolit; pak objednávky; pak single-column route; pak samostatný slice sdíleného pruhu s linkami.
5. Každý slice uzavři zápisem do ROADMAP (kotevně, stručně) a hlášením ověření včetně toho, co nešlo provést.

Historický schválený plán (může být zastaralý vůči stromu): `C:\Users\mikes\.qoder\plans\clever-creek-chub.md`. Vizuální návrhy předchozí session: `C:\Users\mikes\.qoder\app\chat-session-visualizations\f193465d-6d59-439b-bb1b-c9c0b5b401dc\visualizations\` (identity-options-a1.html, summary-options-a1.html, summary-options-ab.html, timeline-options.html) — použitelné jako reference vzhledu, ne jako zdroj kódu.