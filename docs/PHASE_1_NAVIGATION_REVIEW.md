# Fáze 1 — Revize navigace a návrh Admin Hubu

**Typ:** návrh k odsouhlasení → **implementováno** (12. 10. 2026).
**Datum:** 12. 10. 2026.
**Metoda:** podle pravidel projektu (AGENTS, bod 4) — u každé plochy zjišťujeme roli a četnost,
rozhodujeme ponechat / sloučit / skrýt / odstranit, řadíme podle důležitosti a zvažujeme
alternativní UI s vlastním doporučením.

> Tento dokument je pracovní. Po odsouhlasení a implementaci se jeho výsledek zapíše do
> [ROADMAP.md](ROADMAP.md) a dokument se zařadí mezi historické.

> **Poznámka (14. 10. 2026):** dokument popisuje stav **před Fází 2**. Cesty níže jsou tehdejší;
> aktuální URL vznikly ve Fázi 2 — viz [PHASE_2_STRUCTURE_REVIEW.md](PHASE_2_STRUCTURE_REVIEW.md)
> (např. `/workspace` → `/console`, `/dashboard` → `/reports`, `/exceptions` → `/team/exceptions`,
> `/workflows` → `/automations`, `/settings/users` → `/admin/users`).

**Vizuální návrh:** [phase-1-menu-mockup.html](phase-1-menu-mockup.html) (otevři v prohlížeči)
nebo obrázek [phase-1-menu-mockup.png](phase-1-menu-mockup.png).

---

## 1. Současný stav

Celé menu má jeden zdroj: `src/components/layout/navigation.ts` (17 položek). Čte ho levé menu
(sidebar) i command palette (přes `headerNavigation.ts`). To je dobré — nejsou dvě pravdy.

Menu je ale **plochý seznam bez sekcí**, jen s filtrem podle role:

| Role | Počet viditelných položek |
|---|---|
| Operátor | 8 |
| Team Leader | 15 |
| Administrátor | 17 |

### Inventura všech 17 položek

| # | Název v menu | Routa | Vidí (role) | Server hlídá | K čemu to je |
|---|---|---|---|---|---|
| 1 | Dashboard | `/dashboard` | TL, admin | ano | Metriky workspace/týmu a aktivita |
| 2 | Operator Console | `/workspace` | všichni | role-aware | Hlavní pracovní plocha operátora (hovor, skript, výsledek) |
| 3 | Orders | `/orders` | všichni | role-aware | Objednávky (Kanban i tabulka) |
| 4 | Wallet | `/wallet` | všichni | role-aware | Provize a mzdy |
| 5 | Plánovač | `/calendar` | všichni | role-aware | Naplánované hovory a připomínky |
| 6 | AI Training | `/training` | všichni | role-aware | Trénink operátora |
| 7 | Team Leader Review | `/training/reviews` | TL, admin | role-aware | Kontrola tréninkových sezení |
| 8 | Exception Queue | `/exceptions` | TL, admin | ano | Výjimky čekající na rozhodnutí vedoucího |
| 9 | Leads & Contacts | `/leads` | TL, admin | ano | Leady a kontakty |
| 10 | Product Catalog | `/products` | všichni | ne (všichni) | Katalog produktů |
| 11 | Call Logs | `/calls` | všichni | role-aware | Záznamy hovorů a přepisy |
| 12 | Workflows | `/workflows` | admin | ano | Automatizace (pravidla a sekvence) |
| 13 | Analytics | `/analytics` | TL, admin | ano | BI a revenue analytika |
| 14 | Audit Log | `/audit` | TL, admin | ano (operátor blokován) | Protokol událostí a změn |
| 15 | Control Checkpoint | `/controls` | admin | ano | Provozní checklist připravenosti workspace |
| 16 | Settings | `/settings` | všichni | role-aware | Nastavení (osobní; pro TL/admin i workspace) |
| 17 | Team Workspace | `/team` | TL, admin | ano | Správa týmů a operátorů |

**Poznámky k dnešnímu stavu:**

- `/telephony` (Local SIP, jen admin) v menu **není** — otevírá se z `/settings`.
- `/settings/users` a `/settings/scripts` (jen admin) v menu **nejsou** — otevírají se tlačítky
  uvnitř stránky Settings.

---

## 2. Zjištěné problémy

1. **Plochý seznam 15–17 položek** — u TL a admina se v jednom sloupci míchá každodenní práce
   (Console, Orders, Wallet) s dohledem (Analytics, Audit) a správou (Workflows, Controls).
2. **Čtyři překrývající se „reporting / oversight" plochy:** Dashboard, Analytics, Audit Log,
   Control Checkpoint. Není jasné, kterou otevřít kdy.
3. **Tři „týmové" plochy:** Team Workspace, Team Leader Review, Exception Queue. Opět se překrývá
   „kde řeším tým" a „kde řeším výjimku".
4. **Matoucí názvy:** AI Training (`/training`) vs Team Leader Review (`/training/reviews`) —
   stejný prefix, jiná role i účel.
5. **Admin funkce schované uvnitř Settings** (Users, Product Scripts) a Telephony mimo menu —
   administrátor nemá jedno místo, kde by viděl, co může spravovat.
6. **Míchaná čeština a angličtina** v názvech („Plánovač" vs „Orders", „Leads & Contacts").
7. **`/settings` jsou „dvě stránky v jedné"** — pro operátora osobní nastavení, pro TL/admin
   „Operator & Workspace Settings" (navíc wallet a telephony). Vzniká z toho nepořádek.

---

## 3. Posouzení položek a návrh rozhodnutí

U každé položky: doporučení **ponechat / seskupit / sloučit / skrýt z menu** a zařazení do sekce.
Nic se nemaže — jen se mění, kde a jak je to vidět.

| # | Položka | Doporučení | Zařazení |
|---|---|---|---|
| 2 | Operator Console | **ponechat** (jádro) | Práce |
| 3 | Orders | **ponechat** | Práce |
| 5 | Plánovač | **ponechat** | Práce |
| 4 | Wallet | **ponechat** | Práce |
| 6 | AI Training | **ponechat**, přejmenovat | Práce / Rozvoj |
| 10 | Product Catalog | **ponechat** | Práce / Podklady |
| 11 | Call Logs | **ponechat** (TL/admin), u operátora zvážit | Práce / Historie |
| 17 | Team Workspace | **ponechat** | Tým |
| 8 | Exception Queue | **ponechat** | Tým |
| 7 | Team Leader Review | **sloučit** s Team Workspace (záložka), přejmenovat | Tým |
| 9 | Leads & Contacts | **ponechat** | Tým / Data |
| 1 | Dashboard | **ponechat** | Reporting |
| 13 | Analytics | **ponechat**, zvážit sloučení s Dashboardem | Reporting |
| 14 | Audit Log | **ponechat** (TL/admin) | Reporting / Správa |
| 12 | Workflows | **skrýt z menu → Admin Hub** | Správa |
| 15 | Control Checkpoint | **skrýt z menu → Admin Hub** | Správa |
| 16 | Settings | **rozdělit**: osobní ponechat, workspace část do Admin Hubu | Práce + Správa |

---

## 4. Alternativní koncepty UI (a doporučení)

- **A) Plochý seznam** (současný stav). Jednoduché, ale u 15–17 položek se ztrácí orientace.
- **B) Sekce v levém menu.** Stejné položky, ale rozdělené nadpisy (Práce / Tým / Reporting / Správa).
  Malý zásah, velký přínos v přehledu.
- **C) Rolové „huby".** Zásadní redukce položek: Admin Hub sdruží správu do jedné plochy se záložkami.
  Větší zásah, nejlepší výsledek pro každodenní práci.
- **D) Primární + kontextová sub-navigace.** Nejsložitější na pochopení i údržbu; v pilotu zbytečné.

**Doporučení: B + C dohromady** — rozdělit menu do sekcí **a** schovat správu do jednoho Admin Hubu.
Důvod: sekce samy o sobě zlepší orientaci, ale adminovi pořád zůstane 15 položek. Sloučením správy
do jednoho hubu klesne adminovi i TL počet položek a zmizí překryvy z bodu 2.

### Návrh cílového menu podle role

**Operátor (5–6 položek):**
- Práce: Operator Console · Orders · Plánovač · Wallet
- Rozvoj: AI Training
- (podle domluvy) Podklady: Product Catalog · Historie: Call Logs

**Team Leader (8–9 položek):**
- Práce: Operator Console · Orders
- Tým: Team Workspace (včetně review) · Exception Queue · Leads
- Reporting: Dashboard · Analytics · Audit Log
- Osobní: Settings

**Administrátor (9–10 položek + Admin Hub):**
- jako TL
- **Admin Hub** (jediná položka „Správa") se záložkami: Uživatelé a týmy · Produkty a skripty ·
  Workflows a automatizace · Připravenost (Control Checkpoint) · Telefonie · Audit a bezpečnost

---

## 5. Rozhodnutí (PM, 12. 10. 2026)

1. **Koncept:** sekce v menu **+** jeden Admin Hub (doporučení B + C). PM chtěl nejdřív vidět
   vizuální návrh → [phase-1-menu-mockup.html](phase-1-menu-mockup.html).
2. **Jazyk:** všechny **názvy a nadpisy v angličtině**, napříč celým CRM systémem.
   Přejmenování stránek a úprava URL adres proběhne jako **samostatný krok** až po redukci menu.
3. **Team Leader Review:** **sloučit** do Team Workspace jako záložku.
4. **Operátor:** Product Catalog **ano**, Call Logs **skrýt** (zůstává pro TL/admin).
5. **Settings:** **rozdělit** — osobní nastavení zůstane všem, workspace nastavení (wallet,
   telephony) se přesune do Admin Hubu.
6. **Analytics:** zatím ponechat jako samostatnou plochu v sekci Reporting (sloučení s Dashboardem
   mimo tuto fázi).

### Odsouhlasené cílové menu (anglické názvy)

**Operator (6):** Work → Operator Console · Orders · Schedule · Wallet; Learn → AI Training ·
Product Catalog; + Settings (personal).

**Team Leader (8):** Work → Operator Console · Orders; Team → Team Workspace (Reviews jako záložka) ·
Exception Queue · Leads; Reporting → Dashboard · Analytics · Audit Log; + Settings (personal).

**Administrator (9):** jako Team Leader + Administration → **Admin Hub**; + Settings (personal).

**Admin Hub (jen admin):** Readiness · Users & Teams · Products & Scripts ·
Workflows & Automations · Workspace Settings · Telephony.

---

## 6. Co tato fáze NEDĚLÁ

- Nemění **práva ani serverové hlídání** — jen viditelnost, skupiny a jeden Admin Hub.
- Nepřidává **žádné nové funkce**.
- Přesuny rout děláme **až po schválení, po jednom, s ověřením** (lint / typecheck / test / build).
- **Fronty P1–P4** přijdou až ve Fázi 4 — v menu pro ně necháme místo (sekce „Kampaně").

---

## 7. Návrh implementace (po odsouhlasení)

1. Do `navigation.ts` přidat pole `section` a přejmenovat položky na anglické názvy
   (Operator Console · Orders · Schedule · Wallet · AI Training · Product Catalog · Team Workspace ·
   Exception Queue · Leads · Dashboard · Analytics · Audit Log · Admin Hub · Settings).
2. Sidebar vykreslit po sekcích; **Call Logs skrýt operátorovi** (zůstává pro TL/admin).
3. Vytvořit `/admin` (Admin Hub) se záložkami: Readiness · Users & Teams · Products & Scripts ·
   Workflows & Automations · Workspace Settings · Telephony. Stránky zůstanou, mění se jen vstup
   (`/controls`, `/settings/users`, `/settings/scripts`, `/workflows`, `/telephony`, wallet část).
4. Z `/settings` odstranit workspace a telephony část; nechat osobní nastavení.
5. Sloučit **Team Leader Review** do **Team Workspace** jako záložku.
6. Aktualizovat testy, které čtou `navigation.ts` / sledují položky menu.
7. Ověřit role: operátor nesmí vidět Admin Hub; TL vidí sekci Reporting, ne Admin Hub.
8. Ověření po každém kroku: `lint` · `typecheck` · `test` · `build`.

**Samostatný krok později:** revize názvů stránek a URL adres (PM se nelíbí současné názvy).

---

## 8. Výsledek implementace (12. 10. 2026)

Implementováno ve dvou commitech (`c93b62f` navigace, `e35e0bd` rozdělení Settings). Po každém kroku
proběhlo ověření: `lint` · `typecheck` · `test` (815/815) · `build` — vše zelené.

**Oprava oproti původnímu návrhu:** mockup u Team Leadera a admina omylem vynechal `Wallet`,
`Schedule`, `AI Training`, `Product Catalog` a `Call Logs`. V implementaci zůstaly, protože je role
dnes používají (např. měsíční uzávěrka Team Leadera je na `/wallet`). **Nic se neskrývá** — mění se
jen seskupení a vstupní body, proto jsou reálné počty vyšší než původní odhad.

| Role | Před | Po |
|---|---|---|
| Operátor | 8 | **7** |
| Team Leader | 15 | **14** |
| Administrátor | 17 | **15** |

### Skutečné cílové menu

**Operator (7):** Work → Operator Console · Orders · Schedule · Wallet; Learn → AI Training ·
Product Catalog; Account → Settings.

**Team Leader (14):** jako operátor, navíc Team → Team Workspace (+ záložka Training Reviews) ·
Exception Queue · Leads; Reporting → Dashboard · Analytics · Audit Log · Call Logs.

**Administrator (15):** jako Team Leader + Administration → **Admin Hub** (`/admin`).

**Admin Hub (`/admin`, jen admin):** Readiness (`/controls`) · Users & Teams (`/settings/users`) ·
Products & Scripts (`/settings/scripts`) · Workflows & Automations (`/workflows`) ·
Workspace Settings (`/admin/settings`) · Telephony (`/telephony`).

### Rozhodnutí o walletu (PM, 12. 10. 2026)

- **Wallet rules & commissions = jen admin** → v Admin Hubu (`/admin/settings`).
- **Ruční připisování/odečítání bonusů = TL i admin** → na `/wallet` (`canManage`), beze změny.
- Team Leader tak má plnou kontrolu nad bonusy svého týmu, ale **Admin Hub nevidí a nepotřebuje**.

### Co zůstalo beze změny

- Žádná routa se nemaže ani nepřesouvá (kromě vzniku nových `/admin` a `/admin/settings`).
- Nemění se práva ani serverové hlídání — jen viditelnost a vstupní body.
- Názvy stránek a URL adresy = **samostatný krok až později** (odloženo).
