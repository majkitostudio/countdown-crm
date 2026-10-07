# Countdown CRM — kompaktní historický archiv

Tento soubor nahrazuje starší množství plánů, specifikací, checkpointů a ověřovacích reportů. Slouží jako orientační historie, nikoli jako aktuální zadání. Detailní staré soubory byly záměrně zkompaktovány, aby dokumentace nerostla bez kontroly.

## Vývoj produktu

- Projekt vznikl jako workspace-scoped CRM pro výkonnostní call centrum a tele-sales.
- Postupně vznikly role operátor, Team Leader a administrátor.
- Byl navržen a rozšiřován tok lead → zákaznický kontext → hovor → výsledek → callback, objednávka nebo další lead.
- Operator Console získala vlastní sjednocený vizuální a pracovní systém.
- Přibyly týmové fronty, výjimky, pomoc operátorům, směny, týmový dohled a výsledky.
- Přibyly objednávky, produkty, telefonní integrační vrstvy, onboardingový trenér a kontrola kvality pomocí AI.

## Technická a bezpečnostní historie

- Projekt používá role-aware přístup, workspace scope, serverové datové vrstvy a Supabase bezpečnostní hranice.
- Historické práce ověřovaly databázovou paritu, migrace, RLS, cross-team odmítnutí, autentizované browser průchody a stavové kontrakty.
- Telefonní práce oddělily lokální validační cestu od produkční Telnyx integrace.
- AI kontrola kvality byla navržena jako omezená pomocná vrstva, nikoli jako autoritativní zdroj obchodních dat.
- Demo prostředí používá syntetická data a nesmí být zaměňováno za produkční napojení.

## Co z historie zůstává důležité

- Oprávnění a workspace hranice se musí ověřovat na serveru, ne jen schovat v menu.
- Systém má zachovávat pravdivou historii hovorů, objednávek, výsledků a hodnocení.
- Dílčí selhání integrace nesmí zablokovat celý dostupný pracovní prostor.
- Každá role musí dostávat jen informace a akce odpovídající její odpovědnosti.
- Browser smoke test a automatické testy jsou důkazem konkrétního scénáře, ne důkazem celkové produktové použitelnosti.

## Co už není aktuální autorita

- Starší formulace, že Countdown je primárně nebo výhradně Operator Console.
- Staré pořadí P1/P2/P3 práce.
- Jednotlivé historické návrhy obrazovek a navigace.
- Tvrzení o dokončení založená pouze na tehdejším buildu nebo jednom browser průchodu.

## Historické zdroje, které byly sloučeny

Sloučeny byly starší soubory z těchto skupin:

- `docs/superpowers/plans/` — implementační plány;
- `docs/superpowers/specs/` — produktové a technické specifikace;
- `docs/superpowers/reports/` — ověřovací reporty;
- `docs/checkpoints/` — projektové checkpointy;
- starší kořenové stavové, workflow, telephony a kontraktové dokumenty;
- dřívější soubory v `docs/ai/`, jejichž aktuální obsah je nyní rozdělen mezi `START_HERE.md`, `PRODUCT_VISION.md` a `PROJECT_GUIDE.md`.

Pokud někdy bude potřeba detailní důkaz konkrétního historického scénáře, musí se vytvořit nový cílený report s datem a jasně popsanou hranicí ověření. Historické dokumenty se nemají vracet jako běžná pracovní dokumentace.

## Říjen 2026 — Stabilizace a tříúrovňový browserový audit rolí
- **Fáze 0 (Stabilizace):** opraven dokumentační test `p0-3-remote-db-evidence.test.ts`, jazyková oprava v `training/page.tsx` (commit `8b4355f`), test suite 147/147 test souborů (687/687 testů) a TypeScript čistý.
- **Fáze 1 (Operator Browser Audit & Hardening):** reálný průchod operátora hovorem, zápisem poznámek a outcome flow. Proveden security hardening v commitu `ce1e77c` (vyřešen HTTP 500 na `/audit`, skryto tlačítko `Create Order` mimo hovor, sjednoceny zamčené hlášky).
- **Fáze 2 (Role & navigace):** zúženo menu Team Leadera ze 17 na 15 položek (odstraněny generické moduly Deals & Pipelines a Workflows), přejmenován Security Audit Log na Audit Log, změněna výchozí adresa Administrátora na /dashboard, Control Checkpoint přesunut na /controls s HTTP 308 redirectem (commit `3bb2268`).
- **Fáze 3 (Operator ergonomie & Call Workflow):** diferencovaný Fail outcome (nepovinná poznámka pro rychlá odmítnutí klienta ihned po představení vs. povinná poznámka pro námitky ceny a důvěry pro kontext P4 fronty), globální zúžení PageHeader (p-4 sm:p-5), zmenšení záhlaví zákazníka v konzoli a zachování plovoucího ovládání hovoru bez nechtěného lepení prvků k hornímu okraji.
- **Fáze 4 (Slice 4.1 & Slice 4.2 — Prodejní funkce a košík):** implementovány rychlé bubliny námitek pod skriptem i rozbalovací katalog námitek; cenové schody (Price Ladder) a psychologické balíčky s e-knihami pro vyjednávání v hovoru, možnost manuální úpravy počtu kusů i jednotkové ceny pod minimální limit s varováním, dynamický tahák do telefonu; v doručovací adrese implementováno rychlé one-line vyhledávání a našeptávání adresy, doplnění z leadu a povinné ověření/potvrzení s klientem do telefonu.
- **Fáze 5 (Slice 5.1 — Tichý přepis hovoru a AI Quality Review):** tiché rozpoznávání řeči na pozadí v české lokalizaci (`cs-CZ`) během aktivního hovoru bez vizuálního rozptylování operátora; respektování ztlumení mikrofonu (mute); časová razítka promluv; serializace a předání do databáze v `completeLeadCallAction` a `completeCallAction` namísto `null`; zobrazení potvrzení zachycení v `PostCallSummaryCard`; automatické formátování do dialogu pro Gemini AI kontrolu kvality hovorů (`buildCallQualityPrompt`). Všech 702 testů prochází (150 souborů) a lint/typecheck je na 100 %.
- **Fáze 6 (Hardening, CI & Databázové indexy):** zaveden GitHub Actions CI pipeline (`.github/workflows/ci.yml`), Next.js error boundaries (`error.tsx`, `global-error.tsx`, `not-found.tsx`), centralizovaný strukturovaný logger se sanitizací PII a maskováním citlivých dat v `src/lib/observability.ts`.
- **Fáze 7 (Manažerská mobilní responzivita & UI polish):** smluvní testy pro mobilní a tabletové rozhraní manažerů (`tests/manager-mobile-responsiveness-contract.test.ts`), vyčištění emoji ikon, zklidnění designového systému podle CRM tokenů, gamifikační odznak provize operátora (`OperatorCommissionBadge`) s plynulým roll-up tickerem a Wall Street zvukovým signálem (`playWallStreetChime`).
- **Audit databáze a oprava migrací (7. října 2026):** seniorní audit odhalil chybný sloupec `assigned_to` v migraci `20261006120000_performance_composite_indexes.sql`. Migrace byla opravena na reálné schéma (`leads(workspace_id, status)` a `lead_queue_items(assigned_operator_id, state)`), odstraněn redundantní artefakt `countdown-frontend/`. Celá sada 155 testovacích souborů (719 testů) prochází na 100 %, TypeScript i ESLint jsou čisté.
- **Milník 1 — Úkol 1.1 (Manažerská správa stavů objednávek & Provizní trigger, 7. října 2026):** nová migrace `20261007120000_manager_order_fulfillment_status_updates.sql` odblokovala pro manažery stavy `delivered` i `returned` nastavením kontextu transakce, čímž prochází trigger `orders_post_wallet_reward` pro automatické připsání provizí operátorům; vytvořena funkce `bulkUpdateOrderStatusForWorkspace` a server action s `revalidatePath`; v UI doplněn detail `/orders/[id]` i hromadná správa `/orders` (výběr checkboxů + lišta rychlých akcí). 156 testovacích souborů (728 testů) prochází na 100 %.
- **Milník 1 — Úkol 1.2 (Export dat pro dopravce — Zásilkovna / Balíkovna / GLS / Univerzální CSV, 7. října 2026):** vytvořen expediční modul `src/lib/carrierExport.ts` s podporou formátů Zásilkovna (Packeta), Balíkovna (Podání online), GLS a Univerzální CSV. Modul využívá snapshot ověřené adresy `delivery_address_snapshot` (inteligentní rozdělení ulice a čísla domu, PSČ bez mezer, dobírka a produkty) a vkládá UTF-8 BOM pro bezproblémové otevírání v Excelu na Windows. Přidána klientská komponenta `CarrierExportDropdown` zapojená do Bulk Action Baru na `/orders`, do záhlaví tabulky objednávek i na detail zakázky `/orders/[id]`. 157 testovacích souborů (738 testů) prochází na 100 %, typecheck a linter bez chyb.
- **Milník 1 — Úkol 1.3 (Sledovací číslo, kurýrní vazba & Zobrazení v klientském profilu, 7. října 2026):** migrace `20261007130000_order_tracking_and_carrier.sql` přidala sloupce `tracking_number` a `carrier` s indexem a RPC funkcí `update_order_tracking`; vytvořen modul `src/lib/tracking.ts` s auto-detekcí dopravce (Packeta, Balíkovna, Česká pošta, GLS, DPD, PPL) a generováním přímých odkazů na sledování zásilky; na detailu objednávky `/orders/[orderId]` přidána komponenta `OrderTrackingCard` s možností editace a kopírování kódu; v klientském profilu `/leads/[leadId]` vytvořena sekce `LeadOrdersSection` zobrazující historii všech objednávek zákazníka a okamžité sledování balíku pro operátora v hovoru. 158 testovacích souborů (748 testů) prochází na 100 %.
- **Milník 2 (Fronta P4 — Recyklace odmítnutých hovorů & Oddělení P4, 7. října 2026):** migrace `20261007140000_p4_queue_recycling.sql` zavádí automatickou recyklaci failových leadů (`needs_time`, `price`, `distrust`, `alternative_solution`, `other`) z prodejních oddělení do specializovaného týmu Oddělení P4 s odstupňovaným cooldownem (3 až 30 dní) a uvolněním operátora (`preferred_operator_id = NULL`); zdravotní důvody (`health_concern`) a nezájem (`no_interest`) zůstávají trvale uzavřeny; operátor v konzoli vidí přesný P4 retargeting kontext v `ConversationBriefCard` včetně předchozí námitky a poznámky; pro Sent & Returns celého CC přidán v `OrderStatusEditor.tsx` operátorský přechod z `returned` do `pending` s rychlým tlačítkem Re-ship pro okamžité vrácení domluveného balíčku do expedice. Celkem 163 testovacích souborů (773 testů) prochází na 100 %, typecheck i linter čisté.



