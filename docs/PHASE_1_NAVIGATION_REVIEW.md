# Fáze 1 — Revize navigace a návrh Admin Hubu

**Typ:** návrh k odsouhlasení (před implementací).
**Datum:** 12. 10. 2026.
**Metoda:** podle pravidel projektu (AGENTS, bod 4) — u každé plochy zjišťujeme roli a četnost,
rozhodujeme ponechat / sloučit / skrýt / odstranit, řadíme podle důležitosti a zvažujeme
alternativní UI s vlastním doporučením.

> Tento dokument je pracovní. Po odsouhlasení a implementaci se jeho výsledek zapíše do
> [ROADMAP.md](ROADMAP.md) a dokument se zařadí mezi historické.

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

## 5. Otevřené otázky (s mým doporučením)

1. **Jazyk názvů.** Doporučuji sjednotit **vše na češtinu** (dnes je mix). Je to český produkt
   a uživatel je český operátor. → *Návrh: sjednotit na češtinu.*
2. **Vidí operátor Call Logs a Product Catalog?** Operátor má skript v Console. → *Návrh: Product
   Catalog ano (podklady při hovoru), Call Logs spíš přesunout k vedoucím, u operátora skrýt.*
3. **Team Leader Review zůstane samostatně, nebo jako záložka v Team Workspace?** → *Návrh: záložka,
   méně položek a logické spojení „tým → jeho tréninky".*
4. **Analytics sloučit s Dashboardem?** Obojí je reporting. → *Návrh: nechat dvě plochy, ale obě
   v sekci Reporting a časem zvážit sloučení (mimo tuto fázi).*
5. **`/settings` rozdělit?** → *Návrh: osobní nastavení zůstane všem; workspace nastavení (wallet,
   telephony) se přesune do Admin Hubu.*

---

## 6. Co tato fáze NEDĚLÁ

- Nemění **práva ani serverové hlídání** — jen viditelnost, skupiny a jeden Admin Hub.
- Nepřidává **žádné nové funkce**.
- Přesuny rout děláme **až po schválení, po jednom, s ověřením** (lint / typecheck / test / build).
- **Fronty P1–P4** přijdou až ve Fázi 4 — v menu pro ně necháme místo (sekce „Kampaně").

---

## 7. Návrh implementace (po odsouhlasení)

1. Do `navigation.ts` přidat pole `section` a seskupit položky; sidebar vykreslit po sekcích.
2. Vytvořit `/admin` (Admin Hub) se záložkami a přesunout do něj: `/settings/users`,
   `/settings/scripts`, `/workflows`, `/controls`, `/telephony` (stránky zůstanou, mění se jen vstup).
3. Z `/settings` odstranit workspace a telephony část; nechat osobní nastavení.
4. Aktualizovat testy, které čtou `navigation.ts` / sledují položky menu.
5. Ověřit role: operátor nesmí vidět Admin Hub; TL vidí sekci Reporting, ne Admin Hub.
