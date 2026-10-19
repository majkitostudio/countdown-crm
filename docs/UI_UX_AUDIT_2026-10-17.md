# Countdown CRM — Audit UI/UX designu a rozhraní (17. 10. 2026)

Tento dokument obsahuje komplexní revizi uživatelského rozhraní, ergonomie a toku práce napříč celým systémem.
Slouží jako orientační podklad pro budoucí redesign a vylepšování UI/UX.

---

## 1. Globální systémové nedostatky napříč CRM

1. **Vytržení operátora z hovoru při tvorbě objednávky (kritické UX)**
   - **Stav:** Po kliknutí na výsledek „Vytvořit objednávku“ (`outcome: order`) v Operator Console je operátor přesměrován na samostatnou URL `/orders/new`. Ztrácí z očí prodejní skript, námitky i historii hovoru.
   - **Doporučení:** Vytváření objednávky pro operátora na lince integrovat přímo do Operator Console (vysouvací boční panel nebo rychlý košík na místě skriptu). Operátor nesmí opustit hovor.

2. **Jazykový mix a nejednotnost textů**
   - **Pravidlo (AGENTS.md):** Titulek anglicky, popis česky, obsah a tabulky česky, obecná tlačítka a štítky anglicky.
   - **Stav:** V obsahu a hláškách zůstává angličtina (např. *„Customer history“*, *„Timeline, notes and questions — glance only“*, *„Workspace data could not be loaded“*). V záložkách Team Workspace se míchá čeština s angličtinou (*„Denní checkpoint“*, *„Queues“*, *„Kontrola kvality hovorů“*).
   - **Doporučení:** Důsledně pročistit obsah do češtiny, ovládací prvky sjednotit do angličtiny.

3. **Chybějící zohlednění oddělení P1–P4 v běžném UI**
   - **Pravidlo (AGENTS.md):** P1 (Hot Leads / Senior Sales), P2 (Standard Sales / Mass Outbound), P3 (Retence 21 dní po doručení), P4 (Poslední záchrana — faily, vratky, výdejny > 3 dny).
   - **Stav:** V databázovém modelu oddělení fungují, ale v běžném UI (Orders, Leads, Dashboard) chybí rychlé přepínače a filtry podle oddělení.
   - **Doporučení:** Zviditelnit kontext oddělení operátorovi v konzoli a vedoucímu v přehledech.

4. **Pozůstatky odložených funkcí**
   - V AGENTS.md platí, že telefonie (VoIP/Telnyx) je odložena na neurčito a import leadů je 100% automatický přes API/webhooky.
   - V rozhraní přesto zůstávají relikty: stránka `/telephony` se SIP konfigurací a tlačítka `Add Lead` / `Import CSV`, která by nikdo v běžném provozu neměl používat ručně.

---

## 2. Revize klíčových obrazovek dle metodiky projektu

Každá obrazovka je posouzena dle 4 kroků: (1) Kdo a jak často, (2) Ponechat / Sjednotit / Smazat, (3) Důležitost, (4) Doporučení a alternativní koncept.

---

### A. Operator Console (`/console`)
- **Role a četnost:** Operátor, permanentně (95 % času směny).
- **Rozhodnutí:** **Ponechat a zdokonalit**.
- **Důležitost:** **Priorita 1 (Klíčová)**.
- **Doporučení a UX koncept:**
  - Zaintegrovat košík a adresu přímo do konzole (žádné přesměrování na `/orders/new`).
  - Zobrazit trvalou nápovědu klávesových zkratek ve spodní liště (`[Mezerník]` Hovor, `[1]` Objednávka, `[2]` Schedule, `[3]` Nedostupný, `[N]` Poznámka).
  - Přidat štítek oddělení leadu (např. *„Oddělení P1 — Prioritní webový kontakt“*), aby operátor okamžitě věděl, jakou taktiku zvolit.

---

### B. Schedule (`/schedule`)
- **Role a četnost:** Operátor (průběžně během směny), Team Leader (kontrola neodbavených termínů).
- **Rozhodnutí:** **Ponechat a přeuspořádat**.
- **Důležitost:** **Priorita 2 (Vysoká)**.
- **Doporučení a UX koncept:**
  - Dokončit terminologii: striktně používat **Schedule** / **Naplánované hovory**, ne „callback“ (callback je vázaný na konkrétního operátora).
  - Doplnit denní časovou osu (Timeline s hodinovými sloty), aby operátor na první pohled viděl vytížení dne.
  - Z každé karty naplánovaného hovoru nabídnout okamžitou akci *„Zavolat v konzoli“*.

---

### C. Orders (`/orders`, `/orders/[orderId]`, `/orders/new`)
- **Role a četnost:** Team Leader (denně pro sledování balíčků a vratek), Operátor (kontrola doručených pro provize), Admin (exporty pro dopravce).
- **Rozhodnutí:** **Ponechat a upravit pro role**.
- **Důležitost:** **Priorita 2 (Vysoká)**.
- **Doporučení a UX koncept:**
  - Přidat dedikovaný akční filtr pro oddělení P4: *„K obvolání (Výdejna > 3 dny bez hovoru)“* a *„Vratky na Re-ship“*.
  - Kanban zjednodušit na 3 hlavní fáze (Příprava / V přepravě a na výdejně / Doručeno a vratky), aby se vešel na běžné monitory bez horizontálního scrollování.
  - Stránku `/orders/new` ponechat pouze pro administrátorské korekce; pro operátora ji integrovat do konzole.

---

### D. Team Workspace (`/team`, `/team/exceptions`, `/team/reviews`)
- **Role a četnost:** Team Leader (denně hlavní nástroj), Administrátor.
- **Rozhodnutí:** **Sjednotit a zjednodušit**.
- **Důležitost:** **Priorita 1 (Klíčová pro vedení týmů)**.
- **Doporučení a UX koncept:**
  - Dnes je rozhraní přehlcené (3 horní záložky + 6 vnitřních pod-pohledů + několik stripů).
  - Sjednotit do **3 logických pilířů pro Team Leadera**:
    1. **Live dohled (Denní přehled):** Kdo je online, kdo volá, jak plníme denní cíl, kde visí neodbavené hovory.
    2. **Fronty a Výjimky (Exceptions):** Zpožděné termíny, uvíznuté leady, balíčky po termínu na výdejně.
    3. **Kvalita a Koučink (Reviews):** Poslech hovorů k hodnocení a tréninky operátorů.
  - Změnit výchozí přistávací stránku po přihlášení Team Leadera z technických `/team/exceptions` na hlavní **Denní přehled týmu** (`/team`).

---

### E. Leads (`/leads`, `/leads/[leadId]`)
- **Role a četnost:** Team Leader a Administrátor (občas pro dohledání historie). Operátor má zakázán přístup (správně).
- **Rozhodnutí:** **Ponechat, očistit od zbytečností**.
- **Důležitost:** **Priorita 3 (Doplňková)**.
- **Doporučení a UX koncept:**
  - Odstranit nebo skrýt tlačítka `Add Lead` a `Import CSV` (odporují pravidlu automatického příjmu z webhooků).
  - Jako hlavní prvek zachovat rychlý boční panel (`LeadDetailDrawer`); plnou stránku `/leads/[leadId]` nechat jen pro audit a hluboké odkazy.

---

### F. Reports (`/reports`)
- **Role a četnost:** Administrátor (denně/týdně), Team Leader (denně pro sledování výkonu).
- **Rozhodnutí:** **Ponechat a vypilovat**.
- **Důležitost:** **Priorita 2 (Vysoká)**.
- **Doporučení a UX koncept:**
  - Odstranit operátorská tlačítka ze záhlaví (`Add Lead`, `Launch Operator Console`).
  - Přidat rychlé porovnání konverzí a tržeb podle 4 oddělení (P1 vs P2 vs P3 vs P4).

---

### G. Call Logs (`/call-logs`) & Audit Log (`/audit`)
- **Role a četnost:** Team Leader (poslech hovorů), Administrátor (bezpečnostní audit).
- **Rozhodnutí:** **Call Logs propojit s Team Workspace, Audit ponechat samostatně**.
- **Důležitost:** Call Logs: Vysoká, Audit Log: Bezpečnostní.
- **Doporučení a UX koncept:**
  - Denní hodnocení hovorů soustředit do Team Workspace; `/call-logs` ponechat jako globální archív s filtry.

---

### H. AI Training (`/training`) & Product Catalog (`/products`)
- **Role a četnost:** Operátor (nácvik a studium), Team Leader (kontrola připravenosti), Admin (správa produktů/skriptů).
- **Rozhodnutí:** **Ponechat a zpříjemnit**.
- **Důležitost:** **Priorita 3 (Střední)**.
- **Doporučení a UX koncept:**
  - Skrýt technické parametry modelů (`gemini-flash`, `rule-engine`) před operátorem.
  - Doplnit scénáře pro oddělení P3 (retence po 21 dnech) a P4 (záchrana námitek a vratek).
  - V katalogu produktů propojit karty produktů přímo s prodejními argumenty a námitkami.

---

### I. Wallet (`/wallet`)
- **Role a četnost:** Operátor (kontrola výdělků), Team Leader a Admin (uzávěrky provizí).
- **Rozhodnutí:** **Ponechat**.
- **Důležitost:** **Priorita 2 (Vysoká motivační hodnota)**.
- **Doporučení a UX koncept:**
  - Velmi čistě navržená stránka. Doplnit pouze proklik z `OperatorCommissionBadge` v horní liště přímo do Walletu.

---

### J. Administration (`/admin`, `/admin/settings`, `/admin/users`, `/automations`, `/telephony`)
- **Role a četnost:** Pouze Administrátor.
- **Rozhodnutí:** **Očistit a sjednotit navigaci**.
- **Důležitost:** **Priorita 3 (Administrativní)**.
- **Doporučení a UX koncept:**
  - Skrýt `/telephony` a konfiguraci SIP účtů (telefonie odložena).
  - Všechny administrativní cesty sjednotit pod `/admin/*` s přehlednými kartami v Management Hubu.

---

## 3. Doporučený fázový postup realizace

| Fáze | Zaměření | Hlavní úkol |
|---|---|---|
| **1** | **Operator Console & Orders** | Tvorba objednávky přímo v konzoli (bez přesměrování), viditelné klávesové zkratky. |
| **2** | **Team Workspace** | Zjednodušení na 3 pilíře (Live dohled, Výjimky, Kontrola kvality) a oprava výchozí stránky TL. |
| **3** | **Oddělení P1–P4 v UI** | Rychlé filtry pro výdejny > 3 dny a vratky v Orders, rozpad metrik v Reports. |
| **4** | **Schedule & Terminologie** | Dokončení přejmenování Schedule a časová osa pro operátora. |
| **5** | **Úklid a jazyk** | Odstranění reliktů manuálních importů a telefonie, vyčištění českých textů v obsahu. |
