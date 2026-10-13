# Fáze 2 — Revize struktury, názvů a sloučení obrazovek

**Typ:** pracovní návrh → **schváleno PM** (13. 10. 2026). Implementace probíhá po vlnách (viz část 6).
**Metoda:** podle pravidel projektu (AGENTS, bod 4) — u každé plochy zjišťujeme roli a četnost,
rozhodujeme ponechat / sloučit / skrýt / smazat, řadíme podle důležitosti a zvažujeme alternativní
UI s vlastním doporučením.

> **Trenažér (AI Training) je z této fáze vyňat** — čeká ho samostatný velký refactor.
> Plán je v [TRAINING_REFACTOR.md](TRAINING_REFACTOR.md).

---

## 1. Pravidlo pojmenování (závazné)

PM zpřesnil dřívější „vše anglicky" na tuhle podobu. Držíme ji napříč celým CRM:

| Prvek | Jazyk | Příklad |
|---|---|---|
| **Název stránky** (titulek) | **anglicky** | `Schedule`, `Call Logs`, `Product Catalog` |
| **Popis** pod názvem | **česky** | „Naplánované callbacky a vlastní připomínky." |
| **Obsah** stránky | **česky** | texty, tabulky, hlášky, sloupce |
| **Obecná tlačítka / štítky** | **anglicky** | `Submit`, `Back`, `Call`, `Schedule`, `Save`, `Cancel` |
| **URL adresa** | **anglicky** | `/console`, `/call-logs`, `/reports` |
| **Menu a názvy sekcí** | **anglicky** | `Work`, `Team`, `Reporting`, `Administration` |

Doménové názvy (produkt, kampaň, obchodní pojmy) zůstávají tam, kde dávají smysl česky.

---

## 2. Inventura obrazovek (stav před Fází 2)

**Skóre využití je odhad podle role a účelu** (bez reálné telemetrie): `0` bez přístupu · `1` výjimečně ·
`2` občas · `3` pravidelně · `4` často · `5` denní jádro.
**Status:** `G` = v pořádku · `E` = chce upravit (přejmenovat / srovnat / dočistit).

| # | Stránka (routa) | Co to je | Oper | TL | Adm | Status | Poznámka |
|---|---|---|---|---|---|---|---|
| 1 | `/` | přesměrování na domov podle role | – | – | – | G | systémové |
| 2 | `/login` | přihlášení | 5 | 5 | 5 | G | nutné |
| 3 | `/workspace` | Operator Console | 5 | 2 | 1 | **E** | název koliduje s pojmem „workspace"; → `/console` |
| 4 | `/orders` | Orders (Kanban + tabulka) | 5 | 4 | 3 | G | jádro obchodu |
| 5 | `/orders/new` | nová objednávka | 4 | 2 | 1 | G | návazné |
| 6 | `/orders/[id]` | detail objednávky | 4 | 3 | 2 | G | návazné |
| 7 | `/orders/[id]/edit` | úprava objednávky | 2 | 3 | 3 | G | návazné |
| 8 | `/calendar` | Schedule (plán hovorů) | 4 | 4 | 2 | **E** | název „Plánovač" + čeština; nový koncept (část 5) |
| 9 | `/wallet` | Wallet (bonusy, uzávěrka) | 3 | 5 | 4 | G | TL uzávěrka; rozdělení dle rozhodnutí Fáze 1 |
| 10 | `/products` | Product Catalog | 4 | 3 | 2 | **E** | název nese zrušený „Objection Engine"; → sloučení A |
| 11 | `/training` | AI Training (Trenažér P2) | 4 | 2 | 1 | **E** | **vyňato** — viz [TRAINING_REFACTOR.md](TRAINING_REFACTOR.md) |
| 12 | `/training/reviews` | Training Reviews | 0 | 3 | 2 | **E** | už jako záložka; → `/team/reviews` |
| 13 | `/training/reviews/[id]` | detail tréninku | 0 | 2 | 1 | G | návazné |
| 14 | `/team` | Team Workspace | 0 | 5 | 4 | **E** | český popis; → záložky (sloučení C) |
| 15 | `/exceptions` | Exception Queue | 0 | 5 | 3 | G | → záložka v Team Workspace (sloučení C) |
| 16 | `/leads` | Leads | 0 | 3 | 2 | G | operátorovi skryté |
| 17 | `/leads/[id]` | detail leadu | 0 | 3 | 2 | G | návazné |
| 18 | `/calls` | Call Logs | 0 | 4 | 3 | **E** | název „Calls" vs menu „Call Logs"; → `/call-logs` |
| 19 | `/calls/[id]/review` | Call review | 0 | 4 | 3 | G | návazné |
| 20 | `/dashboard` | Dashboard | 0 | 4 | 4 | **E** | překryv s Analytics; → sloučení B |
| 21 | `/analytics` | Analytics | 0 | 4 | 3 | **E** | dlouhý název; → sloučení B |
| 22 | `/audit` | Audit Log | 0 | 2 | 4 | **E** | český popis |
| 23 | `/controls` | Control Checkpoint (Readiness) | 0 | 0 | 4 | **E** | nejméně použitelná; → health strip (sloučení E) |
| 24 | `/workflows` | Workflows & Automations | 0 | 0 | 4 | **E** | český popis; → Automations (část 5) |
| 25 | `/settings/users` | Users & Permissions | 0 | 0 | 4 | **E** | český popis; → `/admin/users` |
| 26 | `/settings/scripts` | Script Administration | 0 | 0 | 3 | **E** | → sloučení A (editor produktové karty) |
| 27 | `/admin` | Admin Hub | 0 | 0 | 5 | G | nové (Fáze 1); → název „Administration" |
| 28 | `/admin/settings` | Workspace Settings | 0 | 0 | 3 | G | wallet pravidla (admin only) |
| 29 | `/telephony` | Local SIP | 0 | 0 | 1 | **E** | odloženo → zaparkovat |
| 30 | `/settings` | Settings (osobní) | 3 | 3 | 3 | G | po rozdělení v Fázi 1 |

---

## 3. Rozhodnutí o přejmenování a URL

| Teď (URL) | Název (EN) | Nová URL | Popis (CZ) |
|---|---|---|---|
| `/workspace` | Operator Console | `/console` | Pracovní plocha operátora — hovor, fronta, objednávka. |
| `/calendar` | Schedule | `/schedule` | Naplánované callbacky a vlastní připomínky. |
| `/calls` | Call Logs | `/call-logs` | Historie hovorů a jejich hodnocení. |
| `/training` | AI Training | `/training` (zůstává) | Tréninkové hovory s AI zákazníkem. |
| `/training/reviews` | Training Reviews (záložka) | `/team/reviews` | Kontrola tréninků týmu. |
| `/exceptions` | Exceptions (záložka) | `/team/exceptions` | Fronta výjimek k řešení. |
| `/products` | Product Catalog | `/products` | Katalog produktů, skriptů a objection knihovny. |
| `/dashboard` + `/analytics` | Reports | `/reports` | Přehledy a čísla (Overview · Revenue & Team). |
| `/workflows` | Automations | `/automations` | Automatická pravidla a webhooky. |
| `/admin` | Administration | `/admin` | Jedno místo pro správu. |
| `/settings/users` | Users & Teams | `/admin/users` | Uživatelé, role a týmy. |
| `/settings/scripts` | (sloučeno) | — | Editor produktové karty žije na `/products` (admin mód). |
| `/controls` | (zrušeno) | — | → health strip v Administration. |
| `/telephony` | (zaparkováno) | — | Route zůstává, ale není odkazovaná. |

**Přesměrování:** staré cesty (`/workspace`, `/calendar`, `/calls`, `/training/reviews`, …) budou
přesměrovány na nové, aby nepraskly záložky ani interní odkazy a testy.

---

## 4. Sloučení obrazovek (schváleno PM)

| # | Sloučení | Výsledek |
|---|---|---|
| **A** | `/products` + `/settings/scripts` | **Products & Scripts** — jedna plocha, dvě tváře: **admin = editor, operátor = čtečka** |
| **B** | `/dashboard` + `/analytics` | **Reports** (přepínač Overview · Revenue & Team) |
| **C** | `/team` + `/exceptions` + `/training/reviews` | **Team Workspace** (záložky Overview · Exceptions · Training Reviews) |
| **D** | `/telephony` | **zaparkovat** — skrýt kartu i telephony adaptér v Admin Hubu |
| **E** | `/controls` | **health strip v Administration** — zrušit samostatnou stránku |
| **F** | `/workflows` | přejmenovat na **Automations**, zaměřit na webhooky (část 5) |

### A) Products & Scripts — produktová karta (nápad PM)

`/settings/scripts` **není** „správa skriptů", ale **editor produktové karty**. Admin u produktu vyplní
vše, co operátor nemusí umět z hlavy, a hned vedle přepíše call skript.

- **Jeden produkt = jedna karta** se sekcemi: Overview · Composition · Effects · Dosing · Reviews ·
  Contraindications · Script · Objections.
- **Admin** = edituje vše. **Operátor** vidí totéž na `/products` ke čtení (+ „převzít do skriptu").
- Přepínač **„Preview as operator"**, ať admin vidí, co uvidí operátor.
- **Pozor:** nejdřív je nutné zmapovat současný datový model produktu/skriptu (`products`,
  `product_script_versions`), teprve pak stavět editor. Samostatný krok.

### E) Health strip místo `/controls`

Dnešní Readiness kontroluje mix věcí: kalendář, wallet, frontu, publikované skripty, Local SIP,
workflows, **migrace**, **RLS/role boundary**, kritické chyby. Polovina je pro vývojáře, ne pro admina.

Návrh: **zrušit stránku** a na vrcholu **Administration** ukázat jen **akční byznys kontroly** jako
seznam úkolů s odkazy (např. *chybí publikovaný skript · produkt bez skriptu · prázdná/zaseknutá fronta ·
operátoři bez týmu · wallet nenastavený*). Technické kontroly (migrace, RLS, Telnyx) se odstraní.

---

## 5. Automations (dříve Workflows / „Workflows & Automations")

### Co to dnes reálně je

Automatizační pravidlo `KDYŽ → TAK`: **trigger** (událost) + volitelné **podmínky** + **akce**.
Engine, builder pravidel, simulátor i log provedení už existují.

**Triggery** (`src/lib/workflows/types.ts`):

| Trigger | Stav serveru |
|---|---|
| `on_call_ended` | ✅ podporováno |
| `on_lead_status_changed` | ❌ nepřipojeno (chybí zdroj události) |
| `on_order_placed` | ❌ nepřipojeno |
| `on_lead_created` | ❌ nepřipojeno |

**Akce:**

| Akce | Stav |
|---|---|
| `send_webhook` (Zapier / Make / n8n / Slack) | ✅ **funguje** |
| `update_lead_status` | ❌ unavailable |
| `notify_manager` | ❌ unavailable |
| `send_email_followup` | ❌ unavailable |
| `compute_ai_summary` | ❌ unavailable |

**Závěr:** dnes funguje v podstatě jediná kombinace — *hovor skončil → webhook ven*. Proto to PM
nikdy nepoužil: vypadá to jako prázdná stránka a schovává to jednu užitečnou věc za odborný název.

### Jak složité je přidat další možnosti

Engine je hotový, takže **přidání dalších možností není těžké** — jde hlavně o (a) připojení dalších
triggerů a (b) implementaci akcí.

- **Triggery — nízká náročnost.** Aplikace už mění objednávky/leady v serverových akcích; stačí z nich
  zavolat dispatch události. Tím se rozsvítí `on_order_placed`, `on_lead_status_changed`,
  `on_lead_created`.
- **Akce „interní" (bez poskytovatele) — nízká náročnost a největší užitek:**
  - `notify_manager` jako **in-app notifikace** (zápis do DB + odznak),
  - `update_lead_status` (mutace už v DAL existuje),
  - `add_wallet_bonus` (bonus za událost),
  - `create_reminder` / `create_schedule` (callback),
  - `add_lead_tag`.
- **Akce „externí" — střední náročnost (potřebují přihlašovací údaje/poskytovatele):**
  - e-mail (Resend/SMTP), SMS (brána), Slack/Teams zpráva (vlastně jen webhook → snadné).
- **Vyšší náročnost:** `compute_ai_summary` (AI poskytovatel + náklady).

### Doporučení

1. Přejmenovat na **Automations** (`/automations`) a v UI jasně říct: „posílá data ven (Slack, Sheets,
   Zapier, n8n) a umí i interní akce".
2. Nedostupné akce/triggery **skrýt nebo označit „coming soon"**, ať to nemate.
3. První užitečná verze = připojit **2–3 triggery** + **2–3 interní akce** (notifikace TL, změna stavu
   leadu, reminder). Tím se z toho stane reálný nástroj, ne kostra.

---

## 6. Pořadí prací (3 vlny)

1. **Vlna 1 — názvy + popisy (bezpečné).** Přejmenovat a srovnat titulky a popisy podle části 3.
   Bez změny URL, bez zásahu do logiky.
2. **Vlna 2 — sloučení A–F.** Products & Scripts, Reports (D+A), Team záložky, health strip místo
   Controls, Automations, zaparkování telefonie.
3. **Vlna 3 — URL + přesměrování.** Nové cesty + redirect ze starých (aby nepraskly záložky ani testy).
4. **Samostatné featury (mimo vlny):** produktová karta (editor), přepracování trenažéru
   ([TRAINING_REFACTOR.md](TRAINING_REFACTOR.md)).

Po každé vlně: `lint` · `typecheck` · `test` · `build` zelené, a teprve pak commit.

**Stav k 14. 10. 2026:** ✅ **Vlna 1 hotová** — každá stránka má anglický titulek a český popis; překlopení
Admin Hub → **Management** (sekce Administration zůstává); dále přejmenováno: `Call Logs`, `Schedule`,
`Automations`, `Exception Queue`, `AI Training`, `Product Catalog`, `Users & Teams`, `Readiness`,
`Audit Log`, `Analysis` (Analytics), `Order Detail`, `Edit Order`, `Call Review`. Generické akce v Automations
jsou anglicky (`Edit`, `Disable`, `Enable`, `Delete`). Smluvní testy aktualizovány na nové texty.

✅ **Vlna 2 hotová (sloučení A–F), bez změny URL** (URL přejdou ve vlně 3). Commity `337ab95`, `7c3d568`,
`0a5581c`, `550993c`, `9bacb59`, `6e633a3`:

- **A) Products & Scripts** — `/products` má pro admina záložky **Catalog · Scripts** (existující editor
  skriptů); `/settings/scripts` přesměrovává na `/products?tab=scripts`. Operátor vidí jen katalog.
  Produktová karta (editor) zůstává samostatný krok.
- **B) Reports** — `/dashboard` = **Overview · Revenue & Team** (původní Analytics přesunut do panelu);
  `/analytics` přesměrovává; v navigaci jedna položka **Reports** místo Dashboard + Analytics.
- **C) Team Workspace** — záložky **Team Overview · Exceptions · Training Reviews** (sdílená tab navigace).
- **D) Telefonie zaparkována** — karta v Managementu i adaptér v nastavení skryté (`/telephony` zůstává).
- **E) Readiness** — `/controls` zrušeno, v Managementu je **health strip** jen s akčními byznys kontrolami
  (kalendář, wallet, fronta, skripty, workflows, kritické chyby); technické kontroly (migrace, RLS, Telnyx,
  Local SIP) odstraněny. `/readiness` → `/admin`.
- **F) Automations** — nedostupné triggery/akce označené **Coming soon** a nelze je vybrat; popis míří na
  webhooky. Data (existující pravidla se staršími akcemi) zůstávají viditelná.

Po vlně 2: `lint` · `typecheck` · `test` (172 souborů / 817 testů) · `build` zelené.

🔄 **Vlna 3 — URL + přesměrování (probíhá, stav k 14. 10. 2026).** Nové cesty a přesměrování starých
(aby nepraskly záložky, interní odkazy ani testy). Aktuální stav:

- ✅ **`/reports`** — `/dashboard` i `/analytics` přesměrovány (commit `cc43152`).
- ✅ **`/console`** — `/workspace` přesměrováno; **`/schedule`** — `/calendar` přesměrováno;
  **`/call-logs`** (včetně `/call-logs/[callId]/review`) — `/calls` přesměrováno. Přesměrování jsou
  v `next.config.ts`; zrušená prázdná složka `/controls` je smazaná.
- ⬜ **Zbývá:** `/workflows` → **`/automations`**, `/settings/users` → **`/admin/users`**,
  `/exceptions` → **`/team/exceptions`** a `/training/reviews` → **`/team/reviews`** (obojí pod `/team/*`).

Po dokončení vlny 3: `lint` · `typecheck` · `test` · `build` zelené a teprve pak commit.

---

## 7. Otevřené body

- **Schedule — nový koncept (schváleno, „jak doporučuješ"):** osobní **agenda**, ne měsíční mřížka.
  Sekce `Overdue (červeně) · Today · Tomorrow · This week`; karta položky = čas, zákazník, telefon,
  produkt + akce `Call now / Reschedule / Done`. Schedules = callbacky z Operator Console,
  Reminders = vlastní poznámky operátora. Prošlý callback se hlásí odznakem v konzoli.
  TL navíc přepínač `My items / Team`.
- **Automations:** rozhodnout, které interní akce zařadit do první verze (část 5).
- **Produktová karta:** nejdřív zmapovat datový model produktu/skriptu.
