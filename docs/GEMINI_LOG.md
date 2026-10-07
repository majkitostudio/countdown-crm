# Záznam činnosti (GEMINI LOG)

**Datum a čas:** 26. září 2026, 02:06 UTC  
**Agent:** Senior Product Engineer & Reviewer (Gemini)  
**Úkol:** Kompletní produktový audit a strategické review Countdown CRM, odstranění staré dokumentace `/docs/ai` a příprava sjednocených podkladů pro větev `gemini/product-audit-2026-09-26`.

---

## 1. Co bylo analyzováno
- Kompletní struktura rout v `src/app` (všech 29 obrazovek a workflow).
- Architektura navigace a oprávnění rolí v `src/components/layout/navigation.ts`, `sidebarNavigation.ts` a `headerNavigation.ts`.
- Klíčové pracovní prostory:
  - Operátorská konzole: `src/app/workspace/page.tsx`
  - Týmový dohled a checkpoint: `src/app/team/page.tsx` a `src/components/team/*`
  - Kontrola a coaching hovorů: `src/app/calls/[callId]/review/page.tsx`
  - Výjimky a eskalace: `src/app/exceptions/page.tsx`
  - Generické a slepé větve: `src/app/objects/[slug]/page.tsx`, `src/app/wallet/page.tsx`, `src/app/training/page.tsx`
- Stav demo režimu a datové vrstvy v `src/lib/dal/*` a `src/lib/demo/syntheticData.ts`.

---

## 2. Přečtené a prověřené soubory
- `src/components/layout/navigation.ts`
- `src/app/workspace/page.tsx`
- `src/app/team/page.tsx`
- `src/app/exceptions/page.tsx`
- `src/app/calls/[callId]/review/page.tsx`
- `src/app/training/page.tsx`
- `src/app/objects/[slug]/page.tsx`
- `src/app/wallet/page.tsx`
- `src/lib/dal/callCompletion.ts`
- `src/lib/dal/activity.ts`
- `src/lib/demo/syntheticData.ts`
- `docs/AKTUALNI_STAV_A_DESATERO.md`

---

## 3. Změněné a vytvořené soubory
- **Vytvořeno:**
  - `docs/GEMINI_AUDIT.md` (kompletní strategický a produktový audit pro PM)
  - `docs/GEMINI_LOG.md` (tento záznamový protokol)
- **Smazáno:**
  - Adresář `docs/ai/` (odstraněna redundantní a zastaralá AI dokumentace)
- **Zdrojový kód aplikace:**
  - V této auditní fázi nebyl zdrojový kód měněn (zůstaly zachovány pouze minimální dříve ověřené opravy stability demo režimu v `activity.ts`, `callCompletion.ts` a `workspace/page.tsx`).

---

## 4. Provedené testy a ověření
- `compile_applet`: Sestavení aplikace proběhlo úspěšně (0 syntaktických chyb).
- `vitest run tests/operator-next-action.test.ts`: Všechny testy fronty operátora prošly (4/4 passed).
- Dev server běží v pořádku a obsluhuje stránky.

---

## 5. Závěrečný stav a doporučení (26. září 2026)
- Projekt je stabilní, bez blokujících chyb při startu a připravený k ořezání nepotřebných generických modulů.
- Výsledky auditu a doporučení dalšího postupu jsou detailně zaznamenány v `docs/GEMINI_AUDIT.md`.

---

## 6. Kompletní tříúrovňový browserový audit (4. října 2026)
**Agent:** Senior Product Engineer & Pair Programmer (Antigravity)  
**Rozsah:** Fáze 0 (Stabilizace) a Fáze 1 (Core Workflow Browser Audit pro všechny 3 role).

### Provedené kroky:
1. **Fáze 0 — Stabilizace:**
   - Obnoven dokumentační testovací soubor `docs/P0_3_REMOTE_DB_RUNNER.md` (687/687 testů prošlo).
   - Opraveno české skloňování `feedbackCountLabel` v `src/app/training/page.tsx` (commit `8b4355f`).
2. **Fáze 1 — Operator Account Browser Audit (Slice 1.1–1.3):**
   - Playwright browserový průchod pro účet `countdown@majkito.com`.
   - Úspěšný active call flow s reálným leadem z DB (`P1.6 Delivery Address Test Contact`), teleprompter skriptu, zápis do note history a recovery.
   - Proveden hardening v commitu `ce1e77c`: oprava pádu HTTP 500 na `/audit`, skrytí tlačítka `Create Order` na `/orders` pro operátora, sjednocení zamčených hlášení.
3. **Fáze 2 — Team Leader Account Browser Audit (Slice 2.1):**
   - Playwright audit pro účet `scope-tl-20260919@example.test` (role `team_leader`).
   - Prověřeno všech 17 položek v sidebaru, scope `team`, `Team Leader Daily Brief`, Exception Queue s omezením, 5 tabů na `/team`, analytika *Moje týmy*, review hovorů.
   - Hermetické zabezpečení zakázaných administrátorských tras (`/readiness`, `/settings/scripts`, `/settings/users`).
4. **Fáze 3 — Administrator Account Browser Audit (Slice 3.1):**
   - Playwright audit pro povýšený administrátorský účet (role `administrator`).
   - Přesměrování po loginu na `/readiness`, 18 položek v sidebaru (včetně `Control Checkpoint`).
   - Plně otevřený a funkční `Control Checkpoint` (5 Ready, 4 Attention, 1 Blocked).
   - Odemčená správa uživatelů a 3 týmů (`/settings/users`) i produktových skriptů (`/settings/scripts`).
   - Dashboard v celofiremním rozsahu (`scope="workspace"`).
   - 0 konzolových chyb, 0 síťových chyb napříč všemi běhy.

---

## 7. Fáze 2 — Role & navigace (commit 3bb2268)
- **Zúžení menu Team Leadera:** Odstraněny moduly *Deals & Pipelines* a *Workflows* (ponechány pouze administrátorům), menu zkráceno ze 17 na 15 položek.
- **Přejmenování Security Audit Log:** Přejmenován na výstižný **Audit Log** (v navigaci) a **Audit Log & Activity Tracker** (v záhlaví stránky).
- **Výchozí landing page Administrátora:** Změněna z `/readiness` na standardní `/dashboard`.
- **Přejmenování Control Checkpoint:** Přesměrováno z `/readiness` na čistou URL `/controls` se zachováním serverového HTTP 308 permanent redirectu.

---

## 8. Fáze 3 — Operator ergonomie & Call Workflow (5. října 2026)
- **Diferencovaný Fail outcome:**
  - U rychlých odmítnutí klienta ihned po představení (`no_interest`, `alternative_solution`, `health_concern`, `needs_time`) je poznámka **nepovinná** – operátor může hovor bleskově uzavřít bez nutnosti psát text.
  - U skutečných prodejních námitek (`price`, `distrust`, `other`) zůstává poznámka **povinná** pro zachování kontextu pro budoucí P4 frontu.
  - UI formuláře dynamicky zobrazuje `(required)` vs. `(optional)` s odpovídajícím placeholderem.
- **Pauza / Online stav:** Potvrzeno stávající manuální vytáčení hovorů pro MVP (hovory nepadají do ucha automaticky).
- **Ergonomie konzole:**
  - **PageHeader:** Globální zúžení horní lišty (`p-4 sm:p-5`) napříč celým CRM pro kompaktnější zobrazení na 13"–15" noteboocích.
  - **OperatorLeadHeader:** Zmenšení jména zákazníka na `text-xl` a paddingů na `p-4`.
  - **Prověření ovládání hovoru:** Karta zákazníka se nelepí k hornímu okraji (nezakrývá skript). Ovládání hovoru při scrollování je zajištěno komponentou `FloatingCallController` v pravém dolním rohu.
  - **Pravý panel:** Zachováno plné přehledné rozložení (poznámky, recent context a timeline zákazníka pod sebou bez klikání na taby).

---

## 9. Fáze 4 — Slice 4.1: Řešení námitek v Operator Console (5. října 2026)
- **Standardní (normální) režim skriptu (`!isExpanded`):**
  - Pod čtecím oknem skriptu jsou umístěny rychlé klikací bubliny nejčastějších námitek (`[ 💰 Drahé / Cena ]`, `[ 🛡️ Nevěřím účinku ]`, `[ ⏳ Chci čas / Porada ]`, `[ 📦 Doprava / Doručení ]`).
  - Po kliknutí se operátorovi bleskově rozbalí schválená odpověď do telefonu (battle-card), aniž by cokoliv zakrývalo pravý sloupec s poznámkami a historií leadu.
  - Tlačítko pro vysunutí velkého bočního šuplíku (Drawer) je v tomto režimu skryto, aby operátora nerušilo.
- **Extended (rozbalený / focus) režim skriptu (`isExpanded`):**
  - Rychlé bubliny pod skriptem zmizí, aby skript zabíral maximum vertikálního prostoru pro plynulé čtení.
  - V horní liště skriptu se zobrazí tlačítko `[ 🛡️ Katalog námitek ]`.
  - Kliknutím na toto tlačítko se zprava vysune boční šuplík `ObjectionDrawer` s fulltextovým vyhledáváním a kompletním přehledem všech evidovaných námitek pro daný produkt v bezpečném *read-only* režimu (`canManage={false}`).
  - Při sbalení skriptu zpět (`Collapse`) se katalog námitek automaticky bezpečně uzavře.
- **Testy a kvalita:**
  - Vytvořen unit/integrační test `tests/operator-focus-layout.test.ts` ověřující zobrazení bublin v běžném režimu a jejich schování / přepnutí na drawer trigger v extended režimu.
  - Všech 147 testovacích souborů (688 testů) prochází na 100 %, TypeScript je bez chyb (`tsc --noEmit`).

---

## 10. Fáze 4 — Slice 4.2: Cenové schody, vyjednávání v objednávce & chytrá adresa (5. října 2026)
- **Cenové schody a mantinely vyjednávání (`ProductOrderPanel` & `pricingLadder.ts`):**
  - **Cenové mantinely:** Jasné zobrazení webové kotvy (např. 1 399 Kč), výchozí telefonní akce (1 199 Kč) a minimálního limitu/dna (799 Kč).
  - **Délka kúry:** Rychlá tlačítka na počet balení: 4 balení (Doporučená plná kúra), 3 balení, 2 balení, 1 balení.
  - **Cenové schody (Price Ladder):**
    - 🥇 *1. Standard nabídka (1 199 Kč / bal.)* – cíl 4 balení na začátku hovoru.
    - 🥈 *2. Sleva + E-knihy (999 Kč / bal.)* – psychologický balíček při námitce ceny (+ 2x e-kniha o zdraví a doživotní přístup do e-knihovny zdarma).
    - 🥉 *3. Dno / Manažerská záchrana (799 Kč / bal.)* – spodní limit pro záchranu hovoru.
  - **Plná manuální úprava:** Operátor může kdykoliv ručně přepsat počet balení i cenu za 1 balení. Pokud cena klesne pod minimální limit, systém zobrazí varování, ale operátora neblokuje.
  - **Dynamický tahák do ucha (Operator Pitch):** Pokaždé generuje přesnou formulaci přizpůsobenou počtu balení a cenovému schodu.
  - **Cenový rozpad:** Jasné vyčíslení úspory zákazníka oproti webové kotvě a přesný výpočet celkové částky k úhradě.
- **Chytré vyhledávání, doplnění a potvrzení adresy (`DeliveryAddressFields.tsx`):**
  - **Rychlé hledání / One-line adresa:** Vyhledávací pole umožňující zadat nebo zkopírovat celou adresu v jednom řádku (např. *Nádražní 45, 602 00 Brno*) s inteligentním našeptávačem českých/slovenských měst a rozpadem do polí ulice, město, PSČ, země.
  - **Doplnění z kontaktu:** Tlačítko pro okamžité dosazení jména a známého města z aktivního leadu.
  - **Potvrzení adresy s klientem:** Zaškrtávací pole *„Adresa ověřena a zkontrolována s klientem do telefonu“* s vizuálním potvrzovacím odznakem pro expedici.
  - Plně integrováno jak do `ProductOrderPanel` (Operator Console), tak do `OrderCreateForm` (`/orders/new`).
- **Testy a kvalita:**
  - Přidán `tests/pricing-ladder.test.ts` (3 testy) a `tests/delivery-address-search.test.ts` (4 testy).
  - Všech 149 testovacích souborů (695 testů) prochází na 100 %, `tsc --noEmit` je bez chyb.

---

## 11. Fáze 5 — Slice 5.1: Tichý přepis hovoru (Speech-to-Text) & AI Quality Review (5. října 2026)
- **Tiché rozpoznávání řeči na pozadí (`src/app/workspace/page.tsx`):**
  - Integrováno kontinuální rozpoznávání hlasu (`createContinuousSpeechRecognition`) v českém jazyce (`cs-CZ`).
  - **Zcela tichý chod:** Běží v tichosti na pozadí během aktivního hovoru (`isCallActive`), operátora ničím nerozptyluje ani neobtěžuje chybovými hláškami.
  - **Respektování mute:** Pokud má operátor ztlumený mikrofon (`isMuted`), promluvy se do přepisu nezaznamenávají.
  - **Časové značky:** Každá promluva má přesný čas od začátku hovoru ve formátu `mm:ss` (např. `00:15`) a označeného mluvčího (`speaker: "operator"`).
- **Předání do databáze a přehledu po hovoru:**
  - V `completeCall` nahrazeno natvrdo zakódované `transcript: null` reálným serializovaným přepisem v JSON formátu (nebo `null` při absenci přepisu).
  - Přepis je bezpečně předáván jak do `completeLeadCallAction`, tak do `completeCallAction`, a zachován i v případě selhání v retry payloadu (`preservedTranscript`).
  - `PostCallSummaryCard` byl rozšířen o stav `transcriptStatus: "captured"`, který po dokončení hovoru zobrazuje jemné zelené potvrzení o zachycení přepisu pro vyhodnocení kvality.
- **Formátování pro Gemini AI Quality Review (`src/lib/callQualityReview.ts`):**
  - Funkce `buildCallQualityPrompt` nyní automaticky detekuje a rozbaluje strukturovaný JSON přepis hovoru do přirozeného dialogu s časovými razítky:
    `[00:05] Operátor: Dobrý den, volám ohledně...`
  - Text prochází hygienou a redakcí citlivých údajů (`sanitizeCallQualityText` maže e-maily a telefonní čísla).
  - Gemini AI tak v kontrole kvality hovorů konečně hodnotí reálný průběh rozhovoru a může Team Leaderovi poskytnout přesné doporučení opřené o fakta.
- **Kvalita a testy:**
  - Vytvořen testovací soubor `tests/workspace-speech-transcript.test.ts` (4 testy).
  - Rozšířen integrační test `tests/call-quality-review.test.ts` a `tests/post-call-completion-runtime.test.ts`.
  - Vyřešeny ESLint varování v `ObjectionDrawer.tsx`, `ProductOrderPanel.tsx` a `audit/page.tsx`.
  - Všech 150 testovacích souborů (702 testů) prochází na 100 %, `tsc --noEmit` je čistý (0 chyb), `npm run lint` je čistý (0 chyb, 0 varování).

---

## 12. Fáze 6 — Hardening, CI & Databázové indexy (6. října 2026)
- **GitHub Actions CI (`.github/workflows/ci.yml`):**
  - Automatizovaný integrační pipeline spouštějící linting, typecheck a kompletní sadu Vitest testů při každém push/PR do větve `main`.
- **Next.js Error Boundaries & 404 (`src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`):**
  - Odolné zachycení neošetřených runtime chyb a 404 stránek s možností bezpečného zotavení (`Reset`) bez nutnosti tvrdého obnovení prohlížeče.
- **Centralizovaná Observabilita & Logger (`src/lib/observability.ts`):**
  - Strukturovaný logger s automatickou sanitizací PII (maskování e-mailů, telefonních čísel a odstraňování auth tokenů z diagnostiky).
- **Kompozitní indexy pro vysokou zátěž:**
  - Vytvoření indexů na tabulkách `calls`, `orders`, `leads` pro rychlé filtrování podle workspace a řazení podle `created_at DESC`.

---

## 13. Fáze 7 — Manažerská responzivita & Gamifikace (6.–7. října 2026)
- **Manažerská responzivita na mobilních zařízeních (`tests/manager-mobile-responsiveness-contract.test.ts`):**
  - Ověření a vymáhání responzivního chování pro Team Leadery a administrátory na telefonech a tabletech.
- **Odznak provizí operátora (`src/components/layout/OperatorCommissionBadge.tsx`):**
  - Vytrvalý odznak v hlavičce zobrazující aktuální stav provize operátora.
  - Dynamický animovaný roll-up ticker při připsání provize z objednávky (`countdown:order_commission_earned`).
  - Wall Street dopaminový signál zvuku (`sounds.playWallStreetChime`).
- **Harmonizace UI designu:**
  - Odstranění nadbytečných emoji z tlačítek a stavových odznaků, nahrazení čistými Lucide ikonami a přísným sémantickým tokenovým kontraktem.

---

## 14. Seniorní audit databáze & Náprava migrací (7. října 2026)
**Agent:** Senior Lead Developer (Opencode)  
**Úkol:** Důkladná prověrka RLS, migrací a databázové vrstvy za poslední měsíc.

- **Nalezená a opravená chyba v migraci:**
  - V migraci `20261006120000_performance_composite_indexes.sql` byl definován index na neexistujícím sloupci `leads(assigned_to, status)`.
  - Opraveno na platné sloupce podle reálného schématu: `leads (workspace_id, status)` a `lead_queue_items (assigned_operator_id, state)`.
  - Příslušně aktualizován smluvní test `tests/database-performance-indexes.test.ts`.
- **Vyčištění stromu projektu:**
  - Trvale odstraněn redundantní netrackovaný adresář `countdown-frontend/` (stará záloha ze září).
- **Výsledek auditu:**
  - 155 testovacích souborů (719 testů) prochází na 100 %.
  - TypeScript `tsc --noEmit` a `next build` probíhají bez chyb.

---

## 15. Milník 1 (Úkol 1.1) — Manažerská správa stavů objednávek & Provizní trigger (7. října 2026)
- **SQL Migrace (`supabase/migrations/20261007120000_manager_order_fulfillment_status_updates.sql`):**
  - Funkce `update_order_status_with_history` rozšířena o manažerské oprávnění pro přechod do stavů `delivered` a `returned`.
  - Při změně na `delivered` nebo `returned` transakce automaticky nastaví transakční kontext `countdown.fulfillment_event_id`, čímž projde bezpečnostní guard `orders_guard_fulfillment_status`.
  - Změna na `delivered` automaticky spustí databázový trigger `orders_post_wallet_reward`, který vyhledá pravidla odměn a připíše provizní bonus do tabulky `wallet_transactions`.
  - Pokud manažer zadá poznámku ke stavu, uloží se přímo do `order_status_history.note`.
  - Operátoři mají tyto logistické stavy přísně zablokované (mohou pouze procházet své povolené prodejní stavy).
- **Backend DAL & Server Actions (`src/lib/dal/orders.ts`, `src/app/actions/crm.ts`):**
  - Přidána funkce `bulkUpdateOrderStatusForWorkspace` a serverová akce `bulkUpdateOrderStatusAction`.
  - Automatická revalidace cesty `/orders` přes `revalidatePath`.
- **UI pro detail i hromadnou správu (`OrderStatusEditor.tsx`, `OrderPipeline.tsx`, `orders/page.tsx`):**
  - V detailu objednávky (`/orders/[id]`) mají Team Leader a Administrátor k dispozici stavy `pending`, `sent`, `delivered`, `returned`, `cancelled`, `completed`.
  - V seznamu objednávek (`/orders`) mají manažeři checkboxy pro výběr řádků i hromadnou lištu (Bulk Action Bar) pro okamžité označení vybraných objednávek jako `Sent`, `Delivered`, `Returned` nebo `Cancelled`.
- **Ověření a testy (`tests/order-fulfillment-lifecycle.test.ts`):**
  - Všech 156 testovacích souborů (728 testů) prochází na 100 %, TypeScript i ESLint jsou naprosto čisté.

---

## 16. Milník 1 (Úkol 1.2) — Export dat pro dopravce (Zásilkovna / Balíkovna / GLS / Univerzální CSV) (7. října 2026)
**Agent:** Senior Lead Developer (Opencode)  
**Úkol:** Jednoduchý a robustní export schválených a vyfiltrovaných objednávek do standardních CSV formátů pro tisk balíkových štítků.

- **Expediční modul (`src/lib/carrierExport.ts`):**
  - Podpora 4 standardních formátů:
    1. **Zásilkovna (Packeta):** reference, jméno, příjmení, ulice, číslo domu, město, PSČ, stát, dobírka, měna, hodnota, obsah.
    2. **Česká pošta (Balíkovna):** podání online formát (VS, jméno, ulice a č.p., PSČ, dobírka, obsah, poznámka).
    3. **GLS:** MyGLS / GLS Connect CSV formát.
    4. **Univerzální expediční CSV:** kompletní tabulkový export pro interní sklad a Microsoft Excel.
  - Využívá neměnný snapshot adresy `delivery_address_snapshot` (inteligentní rozpad na ulici a číslo popisné, vyčištění mezer z PSČ, robustní zpracování JSON i serializovaného stringu).
  - Přidán UTF-8 BOM (`\uEF\uBB\uBF`), který zaručuje bezchybné zobrazení české diakritiky (č, ř, ž, š, ď, ť, ň) v Microsoft Excelu na Windows.
  - Zabezpečené RFC 4180 escapování hodnot (`escapeCsvField`).
- **UI Komponenty & Integrace:**
  - `CarrierExportDropdown.tsx`: Znovupoužitelná klientská komponenta s výběrem přepravce, počtem exportovaných objednávek a stažením souboru.
  - `OrderPipeline.tsx`: Integrováno do hromadné lišty (Bulk Action Bar) pro export vybraných objednávek i do záhlaví tabulky pro export všech zobrazených/filtrovaných zakázek.
  - `orders/[orderId]/page.tsx`: Integrováno do hlavičky detailu objednávky pro okamžitý tisk štítku konkrétní zakázky.
- **Ověření a testy (`tests/carrier-export.test.ts`):**
  - Všech 157 testovacích souborů (738 testů) prošlo na 100 %.
  - 0 chyb v TypeScriptu (`tsc --noEmit`), 0 chyb v linteru (`eslint`).

---

## 17. Milník 1 (Úkol 1.3) — Sledovací číslo (Tracking Number), kurýrní vazba & Zobrazení v klientském profilu (7. října 2026)
**Agent:** Senior Lead Developer (Opencode)  
**Úkol:** Evidence čísla zásilky (tracking number) a dopravce s přímým proklikem na kurýrní sledování v detailu objednávky a v klientském profilu (Customer Profile).

- **Pravidlo č. 3 & SQL Migrace (`supabase/migrations/20261007130000_order_tracking_and_carrier.sql`):**
  - Ověřeno, že sloupce v DB dosud neexistovaly.
  - Přidány sloupce `tracking_number TEXT` a `carrier TEXT` do `public.orders`.
  - Vytvořen index `orders_workspace_tracking_idx` na `(workspace_id, tracking_number)`.
  - Vytvořena manažerská RPC funkce `update_order_tracking(p_order_id, p_tracking_number, p_carrier)` s kontrolou role a automatickým zápisem do `order_status_history.note`.
  - Aktualizovány databázové RPC funkce `get_workspace_order_detail`, `list_workspace_orders` a `get_workspace_lead_activity_detail`, aby vracely `tracking_number` a `carrier`.
- **Typový systém & DAL (`types.ts`, `src/lib/dal/activity.ts`, `src/lib/dal/orders.ts`):**
  - Typy `orders.Row`, `Insert`, `Update` a `Functions` rozšířeny o nová pole a RPC.
  - `WorkspaceOrderDTO` a `DirectOrderPayload` rozšířeny o `tracking_number` a `carrier`.
  - Přidána DAL funkce `updateOrderTrackingForWorkspace` a Server Action `updateOrderTrackingAction` s `revalidatePath`.
- **Pomocný modul pro sledování zásilek (`src/lib/tracking.ts`):**
  - Podpora dopravců: Zásilkovna (Packeta), Česká pošta (Balíkovna), Česká pošta, GLS, DPD, PPL, Jiný dopravce.
  - Automatické generování přímých sledovacích odkazů (tracking URL).
  - Inteligentní auto-detekce dopravce podle formátu kódu ze čtečky čárových kódů.
- **UI Integrace:**
  - `OrderTrackingCard.tsx` v detailu objednávky (`/orders/[orderId]`): zobrazení dopravce a kódu, tlačítko pro kopírování, přímý odkaz „Sledovat balíček online ↗“ a pro manažery inline editor pro zadání/změnu čísla zásilky.
  - `LeadOrdersSection.tsx` v klientském profilu (`/leads/[leadId]`): přehled nákupů zákazníka, stav expedice, částky, číslo zásilky a okamžitý proklik na sledování balíku pro operátora v hovoru.
- **Ověření a testy (`tests/order-tracking.test.ts`):**
  - Všech 158 testovacích souborů (748 testů) prošlo na 100 %.
  - 0 chyb v TypeScriptu (`tsc --noEmit`), 0 chyb v linteru (`eslint`).

---

## 18. Milník 2 — Fronta P4: Recyklace odmítnutých hovorů (Retargeting) & Oddělení P4 (7. října 2026)
**Agent:** Senior Lead Developer (Opencode)  
**Úkol:** Zužitkovat nově diferencované důvody odmítnutí (`fail_reason`) pro plánované znovuvolání a vybudovat podporu pro specializované Oddělení P4 (recyklace failových leadů z ostatních prodejních oddělení + obvolávání Sent/Returns celého CC).

- **Pravidlo č. 3 & SQL Migrace (`supabase/migrations/20261007140000_p4_queue_recycling.sql`):**
  - Založen tým `Oddělení P4` (`slug = 'p4'`, `name = 'Oddělení P4'`) pro každý existující workspace.
  - Vylepšena funkce `complete_lead_call_with_order_items`:
    - Odmítnuté hovory (`objection`) s recyklovatelnými důvody (`needs_time`, `price`, `distrust`, `alternative_solution`, `other`) se již nezahazují jako `closed/unresponsive`.
    - Automaticky se přeřazují do oddělení P4 (`team_id = p4_team_id`), nastavují se jako `available` s prioritou `-4` a posunutým `available_at` (cooldown).
    - Odpárován původní operátor (`preferred_operator_id = NULL`), aby kontakt po vychladnutí zvedl nový operátor z P4 oddělení.
    - Specifické cooldown lhůty: `needs_time` (3 dny), `price` (14 dní), `other` (14 dní), `distrust` (21 dní), `alternative_solution` (30 dní).
    - Zdravotní důvody (`health_concern`) a studené odmítnutí (`no_interest`) zůstávají trvale uzavřené (`closed/unresponsive`).
- **Kontext v Operator Console (`src/lib/dal/conversationBrief.ts` & `src/lib/postCall.ts`):**
  - Funkce `isFailReasonRecyclable`, `getFailReasonCooldownDays` a `getFailReasonCzechLabel`.
  - Operátor v kartě kontextu hned vidí: `Why this lead: P4 Retargeting — předchozí námitka: Cena`, včetně přesné poznámky a důvodu z minulého hovoru.
- **Senty & Returny celého CC (`src/components/orders/OrderStatusEditor.tsx` & `OrderPipeline.tsx`):**
  - V `OrderStatusEditor.tsx` povolen operátorský přechod ze stavu `returned` do `pending`.
  - Přidáno rychlé tlačítko pro **Re-ship (Znovu odeslat balíček)** s předvyplněnou poznámkou o domluvě s klientem pro P4 operátory.
- **Ověření a testy (`tests/p4-recycling.test.ts`, `tests/p4-migration-contract.test.ts`, `tests/conversation-brief-p4.test.ts`, `tests/order-reship-action.test.ts`):**
  - Všech 163 testovacích souborů (773 testů) prochází na 100 %.
  - 0 chyb v TypeScriptu (`tsc --noEmit`), 0 chyb v linteru (`eslint`).

---

## 19. Milník 2 — Úkol 2.1: Taxonomie Call Outcomes & Automatická pravidla recyklace kontaktů (7. října 2026)
**Agent:** Senior Lead Developer (Opencode)  
**Úkol:** Sjednocení a zjednodušení výsledků hovorů (Call Outcomes) podle specifikace produktového manažera a implementace automatických recyklačních pravidel pro `no_answer` (30 min) a `unsuccessful_sale` (24 h do fronty P4).

- **1. Diferenciace Operator Console v produktové vizi:**
  - Zapsáno do `docs/PRODUCT_VISION.md`, že Operator Console se adaptuje na specifika oddělení (prodejní linka vs. Oddělení P4 pro retargeting a senty/returny).
- **2. Schválená taxonomie Call Outcomes v Operator Console:**
  - **Create Order** (`order_placed`): Prodej úspěšný, tvorba objednávky doplňků stravy.
  - **Inaccessible** (`no_answer`): Nedostupný / nezvedá $\rightarrow$ pravidlo 30 minut.
  - **Callback** (`followup_scheduled`): Nastavení data a času pro plánovaný hovor.
  - **Failed** (`objection`): Pod sebou nabízí čisté důvody:
    - *Neúspěch (ukončeno bez finalizace)* (`unsuccessful_sale`): Kompletní hovor proběhl, klient nekoupil $\rightarrow$ recyklovat do P4 po **24 hodinách**, vyžaduje krátkou poznámku pro kontext P4 operátora.
    - *Bez zájmu (ukončeno)* (`no_interest`): Rychlé ukončení klienta $\rightarrow$ trvale uzavřeno (`closed / unresponsive`).
    - *Invalidní přihláška (nesprávné údaje)* (`invalid_lead`): Špatné číslo, neplatný kontakt $\rightarrow$ trvale uzavřeno (`closed / unresponsive`).
    - *Zdravotní důvody (alergie, intolerance)* (`health_concern`): Nevhodné ze zdravotních důvodů $\rightarrow$ trvale uzavřeno (`closed / unresponsive`).
- **3. Pravidlo č. 3 & SQL Migrace (`supabase/migrations/20261007150000_recycling_rules_30m_24h.sql`):**
  - V `private.complete_lead_call_impl` upraven čas pro `no_answer` z 15 minut na **30 minut** (`available_at = NOW() + INTERVAL '30 minutes'`).
  - V `public.complete_lead_call_with_order_items` přidána podpora pro `unsuccessful_sale` s cooldownem **24 hodin** (`available_at = NOW() + INTERVAL '24 hours'`, uvolnění operátora, zařazení do P4 týmu s prioritou `-4`).
  - `no_interest`, `invalid_lead` a `health_concern` zůstávají trvale uzavřeny jako `unresponsive`.
- **4. Typy a DAL (`src/lib/supabase/types.ts`, `src/lib/postCall.ts`, `src/lib/dal/savedViews.ts`):**
  - `fail_reason` rozšířen o `unsuccessful_sale` a `invalid_lead` při plném zachování zpětné kompatibility.
  - `isFailReason` a `validateQualityViewInput` podporují všechny platné důvody.
  - Popisky outcome tlačítek v konzoli synchronizovány na `Inaccessible`, `Callback`, `Failed`, `Create Order`.
- **5. Ověření a testy:**
  - Všech 164 testovacích souborů (775 testů) prochází na 100 %.
  - 0 chyb v TypeScriptu (`tsc --noEmit`), 0 chyb v linteru (`eslint`).

---

## 20. Milník 2 — Úkol 2.2: Přehled odložených hovorů (Scheduled Callbacks Banner) & Prioritní routování na operátora (7. října 2026)
**Agent:** Senior Lead Developer (Opencode)  
**Úkol:** Zviditelnit naplánované hovory přímo na nástěnce operátora v daný čas (např. lišta *„Máte 2 hovory k vyřízení na dnešní dopoledne“*) a zajistit striktní prioritní routování zpět na operátora, který s klientem mluvil původně (`preferred_operator_id`).

- **1. Logika českých časových oken a skloňování (`src/lib/scheduledCallbacksBanner.ts`):**
  - Funkce `formatCzechCallbackCount`: přesná česká gramatika pro jednotná i množná čísla (*1 hovor*, *2–4 hovory*, *5+ hovorů*).
  - Funkce `getScheduledCallbacksBannerState`: inteligentní dělení na dopolední (< 12:00) a odpolední (>= 12:00) hovory naplánované na dnešní den, detekce hovorů po termínu (`overdue`) a generování přirozených českých hlášek (*„Máte 2 hovory k vyřízení na dnešní dopoledne“*, *„Máte 3 hovory k vyřízení na dnešní odpoledne“*, *„Máte 1 hovor čekající na vyřízení právě teď“*).
  - Předpočítaný parametr `isOverdue` v DTO, který zaručuje čistotu renderu (purity) v Reactu bez nečistých volání `Date.now()` uvnitř JSX.
- **2. UI Komponenta lišty na nástěnce (`src/components/workspace/OperatorScheduledCallbacksBanner.tsx`):**
  - Výrazná informační lišta pod hlavičkou operátora s amber (urgentní/po termínu) nebo sky (plánované dopoledne/odpoledne) akcentem.
  - Zobrazuje headline s počtem, nejbližšího klienta a čas schůzky.
  - Možnost rozbalit detailní přehled všech čekajících odložených hovorů (jméno klienta, telefonní číslo, formátovaný čas, odznak stavu termínu).
  - Tlačítko pro rychlý refresh a tlačítko „Vyřídit další lead“, které ihned zvedne prioritní hovor z fronty.
- **3. Integrace do Operator Workspace (`src/app/workspace/page.tsx`, `operatorNextAction.ts`):**
  - Banner je zobrazen jak v klidovém stavu (čekání na lead / prázdná fronta), tak přímo v aktivní konzoli operátora, aby operátor neztratil pojem o blížících se domluvených hovorech.
  - `OperatorCallbackSignal` rozšířen o volitelná pole `leadId` a `phone` pro detailnější zobrazení.
- **4. Pravidlo č. 3 & SQL Migrace (`supabase/migrations/20261007153000_scheduled_callback_priority_routing.sql`):**
  - Ověřena existence sloupců `preferred_operator_id`, `state`, `available_at`, `priority` v `lead_queue_items`.
  - Upravena jádrová funkce `private.claim_next_lead_impl(target_workspace_id)`:
    - **Ochrana před cizím operátorem:** Odstraněna dřívější nežádoucí podmínka `OR EXISTS (preferred_membership)`, která umožňovala kolegům v týmu předbíhat a brát si cizí domluvené hovory.
    - **Rezervace pro původního operátora:** Dokud je původní operátor přítomen v systému (má status `available` s čerstvým heartbeatem za posledních 5 minut), lead je zamčený výhradně pro něj.
    - **Fallback:** Teprve v případě, že původní operátor je offline, má hovor nebo je callback více než 15 minut po termínu, je povolen fallback na jiného člena týmu.
    - **Absolutní přednost:** V `ORDER BY` má původní operátor pro své odložené hovory absolutní prioritu (`tier 0`), takže je dostane dříve než jakékoliv jiné leady z fronty.
- **5. Ověření a testy:**
  - `tests/scheduled-callbacks-banner.test.ts`: 4 testy pokrývající české skloňování, dopolední a odpolední rozdělení i zpožděné hovory.
  - `tests/callback-priority-routing-migration.test.ts`: smluvní testy ověřující SQL definici tier 0 a ochranu `preferred_operator_id`.
  - Celá testovací sada: **166 testovacích souborů (781 testů) prochází na 100 %**.
  - TypeScript `tsc --noEmit` a `eslint` hlásí 0 chyb.

---

## 21. Milník 2 — Úkol 2.3: Scheduled hovory bez prodlení v kampani, vyčištění konzole a Plánovač (7. října 2026)
**Agent:** Senior Lead Developer (Opencode)  
**Úkol:** Přejít ze starého konceptu "Callback = osobní zamykání operátora s 15min prodlevou" na moderní tele-sales princip: zákazníkovi byl slíben čas (např. 16:00), kdo má volné ruce v kampani, ten v 16:00 volá. Odstranit lištu z konzole, sjednotit tlačítko na "Schedule" a přetvořit Kalendář na čistý Plánovač (Schedules & Reminders).

- **1. Pravidlo č. 3 & SQL Migrace (`supabase/migrations/20261007160000_scheduled_instant_fallback_routing.sql`):**
  - Ověřeno schéma tabulek `lead_queue_items` a `operator_presence` v `src/lib/supabase/types.ts`.
  - Upravena funkce `private.claim_next_lead_impl(target_workspace_id)`:
    - **Odstranění 15minutové prodlevy:** Žádné čekání – jakmile `scheduled_at <= NOW()`, hovor je ihned odbavitelný.
    - **Prioritní řazení v kampani (ORDER BY):**
      - Tier 0: Původní operátor (pokud v 16:00 žádá o kontakt, dostane svůj naplánovaný hovor přednostně).
      - Tier 1: Lead specificky preferovaný pro operátora.
      - Tier 2: Naplánovaný hovor z dané kampaně/týmu (`waiting_callback` splatný nyní – bere volný kolega z linky).
      - Tier 3: Běžné nové leady z fronty.
    - **Striktní hranice linek (P1–P4):** Podmínka `queue_item.team_id = operator_team_id` zabraňuje jakémukoliv přelévání leadů mezi cizími odděleními (např. prodejní linka P1 vs. inbound linka P4).
- **2. Vyčištění konzole operátora (`src/app/workspace/page.tsx`):**
  - Kompletně odstraněn banner `OperatorScheduledCallbacksBanner` jak z prázdného stavu, tak z hlavní plochy konzole operátora. Operátor se soustředí výhradně na hovor a systém mu leady dávkuje sám.
- **3. Sjednocení výsledkového tlačítka na „Schedule“ (`OperatorCallControls.tsx`, `CallbackScheduleModal.tsx`):**
  - Popisek výsledku po hovoru přejmenován na čisté **„Schedule“** (místo původního Callback).
  - V dialogu nastaveny texty: *Schedule Call*, *Scheduled date and time* a tlačítko *Schedule*.
- **4. Redesign na Plánovač (`navigation.ts`, `calendar/page.tsx`, `OperatorCalendar.tsx`, `dal/calendar.ts`):**
  - V levém menu i v Ctrl+K vyhledávači položka přejmenována na **„Plánovač“**.
  - Hlavička stránky `/calendar`: **Plánovač** – *Přehled naplánovaných hovorů (Schedules) a osobních připomínek (Reminders)*.
  - Filtry: **Vše** | **Schedules** | **Reminders**.
  - V DAL zachováno, že operátor vidí výhradně své vlastní naplánované leady a své osobní úkoly/připomínky.
- **5. Ověření a testy:**
  - `tests/callback-priority-routing-migration.test.ts`: ověřuje prioritu 0, prioritu 2 v týmu a absenci 15minutového čekání.
  - `tests/planner-navigation-contract.test.ts`: nový test ověřující vystavení položky „Plánovač“ v menu a absenci „My Calendar“.
  - `tests/operator-call-outcome.test.ts`: ověřuje nový label „Schedule“.
  - Celá testovací sada: **167 testovacích souborů (786 testů) prochází na 100 %**.
  - TypeScript `tsc --noEmit` a `eslint` hlásí 0 chyb.

---

## 22. Milník 3: Propojení reálné telefonie (Live VoIP Pilot) — Odloženo / Pozastaveno (7. října 2026)
**Rozhodnutí Produktového Manažera:**
Milník 3 byl po produktové a rozpočtové analýze **odložen do neurčité budoucnosti**.

### Důvod pozastavení:
Ostré vytáčení z prohlížeče na reálná telefonní čísla zákazníků v ČR přes Telnyx WebRTC vyžaduje:
1. Nákup reálného českého telefonního čísla (DID s předvolbou +420).
2. Kredit pro odchozí hovory (minutové tarify do mobilních sítí).
3. Formální ověření identity a anti-spoofing registraci.

Vzhledem k absenci rozpočtu na nákup čísla zůstává aktivace Telnyxu zablokována bezpečnostní pojistkou (`isTelnyxActivationBlocked() => true`, `TELNYX_BLOCKER_COPY`).

### Rozsah odloženého milníku:
- **3.1 Testovací hovor přes Telnyx WebRTC s reálným číslem:**
  - Nastavení klíčů v `.env.local` (`TELNYX_API_KEY`, `TELNYX_CONNECTION_ID`, odchozí CLI).
  - Otestování audio spojení z prohlížeče na reálné mobilní číslo.
- **3.2 Záznam hovoru a uložení nahrávky:**
  - Uložení odkazu na audio nahrávku do `telephony_call_sessions.recording_url`.
  - Přehrávač hovoru pro Team Leadera v obrazovce hodnocení kvality (`/calls/[callId]/review`).
- **3.3 Graceful fallback při výpadku VoIP linky:**
  - Okamžitá nabídka manuálního dopsání výsledku operátorovi bez zablokování konzole při výpadku spojení.

### Aktuální stav systému:
Projekt plnohodnotně funguje v **simulačním režimu** (zdarma a spolehlivě pokrývá všechny hovorové, košíkové i expediční procesy CRM) s možností volitelného interního testování zvuku přes bezplatný **Local SIP (Asterisk v Dockeru)**.

---

## 23. Milník 4 (Úkol 4.1) — Měsíční uzávěrka pro Team Leadera na /wallet (7. října 2026)
**Agent:** Senior Lead Developer (Opencode)  
**Úkol:** Umožnit Team Leaderovi na `/wallet` provést měsíční uzávěrku provizí pro operátory za uzavřené kalendářní měsíce. Zohlednit odečet vratek (`returned`) z doručeného obratu, zajistit idempotenci, auditabilitu a neměnný zápis do peněženky.

- **1. Databázová bezpečnost (Pravidlo č. 3) & SQL Migrace (`supabase/migrations/20261007213000_wallet_monthly_settlement_manager_access.sql`):**
  - Před úpravou ověřeny všechny sloupce v `src/lib/supabase/types.ts`: `orders(status, delivered_at, returned_at, total_amount, currency, agent_id, workspace_id)` a `wallet_transactions`.
  - Upravena uložená procedura `public.finalize_wallet_monthly_commission`:
    - Zpřístupněna pro Team Leadera i Administrátora přes bezpečnostní kontrolu `private.is_workspace_manager_or_admin(p_workspace_id)` i pro `service_role`.
    - **Odečet vratek z obratu:** `net_delivered_total := greatest(delivered_total - returned_total, 0)`.
    - Vypočte měsíční provizi jako procento z čistého doručeného obratu podle nastavení peněženky (`settings_row.monthly_commission_rate`).
    - Zapisuje auditní záznam do `audit_logs` s popisem a ID Team Leadera.
    - Vytvoří neměnnou transakci v `wallet_transactions` s unikátním `source_event_id` (`format('monthly-commission:%s:%s:%s', p_workspace_id, p_user_id, p_period_start)`). Zajištěna 100% idempotence – opakované volání nic nerozbije.
  - Vytvořena hromadná procedura `public.finalize_workspace_monthly_settlement(p_workspace_id, p_period_start)`:
    - V jednom kroku provede bezpečnou uzávěrku všech operátorů daného workspace a vrátí přehledný JSON souhrn.
  - Přidána oprávnění `GRANT EXECUTE ... TO authenticated, service_role`.
- **2. DAL Vrstva & Server Actions (`src/lib/dal/wallet.ts`, `src/app/actions/wallet.ts`):**
  - Implementována funkce `getMonthlySettlementSummary({ periodStart })`:
    - Načte nastavení workspace peněženky, seznam operátorů, doručené a vrácené objednávky za daný měsíc a existující transakce.
    - Vrátí DTO: doručeno celkem, vratky celkem, čistý obrat, vypočtená provize k vyplacení a rozpad po jednotlivých operátorech.
  - Implementovány funkce `finalizeWalletMonthlyCommission` a `finalizeWorkspaceMonthlySettlement`.
  - Exportovány serverové akce `getMonthlySettlementSummaryAction`, `finalizeWalletMonthlyCommissionAction`, `finalizeWorkspaceMonthlySettlementAction` s revalidací cesty `/wallet`.
- **3. Uživatelské rozhraní (`src/components/wallet/WalletSettlementPanel.tsx`, `src/app/wallet/page.tsx`):**
  - Klientská komponenta `WalletSettlementPanel`:
    - Výběr období: uzavřené předchozí měsíce i probíhající měsíc s vizuálním označením.
    - Metriky: Doručené objednávky, Vrácené objednávky (s odečtem), Čistý obrat k provizi, Celková provize k výplatě.
    - Tabulka operátorů: Jméno, doručené objednávky, vratky, čistý obrat, sazba a částka provize, stav (Uzavřeno & vyplaceno / K uzávěrce / Nulový nárok) a individuální tlačítko pro schválení.
    - Tlačítko hromadného schválení: „Schválit a uzavřít měsíc pro všechny“.
    - Vysvětlující přehled pravidel pro Team Leadera (transparentní odečet vratek, auditabilita, okamžité připsání).
  - Zapojeno na stránku `/wallet` pro uživatele s oprávněním Team Leader / Administrátor.
- **4. Ověření a testy:**
  - Vytvořen nový testovací soubor `tests/wallet-monthly-settlement.test.ts` (11 testů).
  - Testován kontrakt migrace, RLS, matematický odečet vratek, ošetření nulového nároku, DAL kontrola rolí i přítomnost UI panelu.
  - `tests/wallet-contract.test.ts` prochází beze změny.
  - **Celá testovací sada: 168 testovacích souborů (797 testů) prochází na 100 %**.
  - TypeScript `tsc --noEmit` čistý bez jakýchkoliv chyb.

---

## 24. Milník 4 (Úkol 4.2) — Export podkladů pro mzdy (Payroll Export) (7. října 2026)
**Agent:** Senior Lead Developer (Opencode)  
**Úkol:** Propojit měsíční uzávěrku provizí s mzdovým účetnictvím call centra. Poskytnout přehled a CSV export s požadovanou strukturou: Operátor | Počet objednávek | Celkový obrat | Fixní bonusy | Procentuální provize | K výplatě.

- **1. Mzdový exportní modul (`src/lib/payrollExport.ts`):**
  - Funkce `buildPayrollCsv`:
    - Generuje mzdový přehled s oddělovačem středník (`;`) pro nativní české rozdělení sloupců v aplikaci Microsoft Excel.
    - Přesná struktura sloupců: *Operátor, Email, Období, Doručené objednávky (ks), Vratky (ks), Čisté objednávky (ks), Hrubý doručený obrat, Vratky (částka), Čistý obrat, Fixní bonusy, Sazba provize (%), Procentuální provize, Manuální úpravy, K výplatě, Měna, Stav uzávěrky, ID transakce*.
    - Na konci tabulky souhrnný řádek `CELKEM TÝM` se součty všech objednávek, obratů, bonusů a celkovou částkou k vyplacení.
    - Zabezpečené RFC 4180 escapování hodnot (`escapeCsvField`).
  - Funkce `exportPayrollToCsv`:
    - Vkládá UTF-8 BOM (`\uEF\uBB\uBF`) pro zaručení správného kódování české diakritiky na Windows.
    - Triggne klientské stažení souboru `podklady_pro_mzdy_YYYY-MM_czk.csv`.
- **2. DAL Vrstva & Výpočet mzdových položek (`src/lib/dal/wallet.ts`):**
  - Rozšířeny interface `OperatorSettlementDTO` a `MonthlySettlementSummaryDTO` o:
    - `userEmail`: e-mail pro párování s účetním/mzdovým softwarem.
    - `fixedBonuses`: součet bonusů za jednotlivé doručené objednávky (`order_bonus` a vratky `reversal`) v daném měsíci.
    - `manualAdjustments`: schválené manuální korekce / prémie / srážky od Team Leadera.
    - `totalPayout`: celková částka ke mzdě (`Math.max(0, fixedBonuses + commissionAmount + manualAdjustments)`).
  - V `getMonthlySettlementSummary` doplněn dotaz na transakce daného období a napočteny týmové součty `totalFixedBonuses`, `totalManualAdjustments`, `totalPayout`.
- **3. UI Integrace v `WalletSettlementPanel.tsx`:**
  - Přidáno tlačítko **„Exportovat mzdy (CSV)“** s ikonou stažení přímo v ovládací liště období.
  - Tabulka operátorů upravena na kompletní mzdový přehled:
    - *Operátor* (jméno a e-mail),
    - *Počet objednávek* (čisté / doručeno / vratky),
    - *Celkový obrat* (čistý obrat po odečtení vratek),
    - *Fixní bonusy* (ze zásilek),
    - *Procentuální provize* (z obratu),
    - *K výplatě* (zvýrazněná zelená mzdová částka),
    - *Stav* & *Akce*.
  - Rozšířeny karty metrik v záhlaví na 5 klíčových ukazatelů: Doručené objednávky, Vratky, Čistý obrat, Fixní bonusy z obj. a K výplatě celkem.
- **4. Ověření a testy:**
  - Vytvořen nový testovací soubor `tests/payroll-export.test.ts` (8 testů).
  - Testováno generování CSV, escapování, souhrnný řádek, DAL typy i přítomnost UI prvků.
  - `tests/wallet-monthly-settlement.test.ts` a `tests/wallet-contract.test.ts` procházejí na 100 %.
  - **Celá testovací sada: 169 testovacích souborů (805 testů) prochází na 100 %**.
  - TypeScript `tsc --noEmit` hlásí 0 chyb.






