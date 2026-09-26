# Kompletní produktový audit a strategické review: Countdown CRM

**Datum auditu:** 26. září 2026  
**Auditor:** Senior Product Engineer & UX Reviewer (Gemini)  
**Cílová role hodnocení:** Administrátor & Produktový manažer telemarketingového call centra  
**Specializace provozu:** Aktivní tele-sales / telemarketing doplňků stravy (nutraceutika, vitamíny, kloubní výživa)  
**Větev auditu:** `gemini/product-audit-2026-09-26`

---

## 1. Shrnutí celkového stavu a upřímná zpráva pro produktového manažera

> **Osobní vzkaz PM:**  
> Je zcela přirozené, že se po měsících vývoje cítíš vyčerpaný a ztrácíš motivaci, když se při každém kroku vynořují nové chyby. **Countdown CRM ale není mrtvý projekt a rozhodně to nebylo zbytečné.**  
> V kódu je obrovské množství poctivé práce: detailní datový model, propracované zabezpečení (RLS politiky), idempotence při objednávkách, Telnyx WebRTC integrace a promyšlený flow operátora.  
> 
> **Kde je skutečný kámen úrazu?**  
> Projekt trpí klasickou pastí **„feature creepu“ a rozptýlené identity**. Místo aby se dokončil jeden neprůstřelný řetězec *(přihlášení operátora → zvednutí hovoru → skript doplňku stravy → objednávka / callback → další lead)*, začal systém bobtnat do všech stran: vznikl generický object engine (`/objects/[slug]`), interní peněženka kreditů (`/wallet`), komplexní AI tréninkový simulátor (`/training`), automatizační workflow engine (`/workflows`), desítky dashboardů a příliš mnoho paralelních rozhraní.  
> 
> Když systém ořežeme o slepé uličky a soustředíme se na to, co call centrum skutečně živí, máme před sebou **velmi silný, prodejný a provozuschopný produkt**.

---

## 2. Nově formulované pochopení Countdown CRM

### Co Countdown CRM skutečně je
Countdown CRM je **vertikální provozní systém (Vertical SaaS) pro outbound a hybridní tele-sales doplňků stravy**.
Není to generický HubSpot, Pipedrive ani Salesforce. Tyto obecné nástroje v call centrech selhávají, protože operátor v nich musí klikat na deset míst, nemá integrovaný prodejní skript svázaný s námitkami a objednávkovým košíkem, a ztrácí drahocenné sekundy mezi hovory.

### Hlavní hodnota pro call centrum
1. **Rychlost a eliminace prodlev (Wrap-up time):** Operátor neztrácí čas hledáním, co má dělat. Systém mu servíruje leady z fronty, automaticky vytočí kontakt a předloží schválený skript.
2. **Standardizace prodeje doplňků stravy:** Prodej kloubní výživy či vitamínů vyžaduje striktní dodržování legislativních tvrzení (schválená zdravotní tvrzení dle EFSA), rychlé řešení námitek (cena, konkurence, lékař) a přesné dávkování/upsell balíčků (1 balení vs. kúra na 3 měsíce se slevou).
3. **Okamžitá distribuce do logistiky:** Objednávka vytvořená v hovoru jde rovnou do expedice (dobírka, kurýr, adresa).

---

## 3. Silné stránky projektu (Co stavět a nezahazovat)

1. **Robustní backend a integrita dat (Supabase & RLS):**
   - Transakční bezpečnost: Objednávky a změny stavu leadů jsou chráněny atomickými RPC funkcemi v PostgreSQL (`complete_lead_call_with_order_items_idempotent`). Hrozba duplicitních objednávek při dvojkliku operátora je eliminována.
   - Víceúrovňová izolace workspace a role-based access (Operátor, Team Leader, Admin).
2. **Architektura Operator Console (`/workspace`):**
   - Rozvržení tří sloupců (Kontext zákazníka | Skript & Hovor | Košík produktů & Výsledek) je pro telemarketing optimální. Operátor nemusí opustit jednu obrazovku.
3. **Telemetrie a dohled nad kvalitou:**
   - Modul Call Review (`/calls/[callId]/review`) s hodnocením nahrávek a parametrů hovoru je pro Team Leadera hotový základ pro coaching.
4. **Resilience a Demo režim:**
   - Systém má zabudovaný offline demo režim (`NEXT_PUBLIC_ALLOW_DEMO_AUTH`), což je obrovská zbraň pro prodejní prezentace investorům nebo majitelům call center bez nutnosti živé databáze.

---

## 4. Hlavní produktové problémy

1. **Rozostřená identita (Generic CRM vs. Call Center):**
   - Přítomnost generického modulu `/objects/[slug]` (dynamické tabulky a schémata) působí v telemarketingovém CRM jako cizí těleso. Call centrum nepotřebuje vytvářet libovolné entity, potřebuje pevný model: *Lead → Hovor → Zákazník → Objednávka*.
2. **Přetížení rolí a nejasné hranice navigace:**
   - V navigaci se pletou operátorské obrazovky s manažerskými. Například obrazovky `/leads` a `/orders` v tabulkovém zobrazení svádějí operátory k "vybírání rozinek" (cherry-picking leadů) namísto práce s řízenou frontou.
3. **Předčasná složitost (Premature Overengineering):**
   - Modul `/wallet` (peněženka kreditů pro hovory a AI tokeny) je pro interní pilot zcela zbytečný. Call centrum platí operátory a fakturuje telekomunikační služby měsíčně; nepotřebuje mikrotransakční peněženku uvnitř CRM.
4. **Dvojkolejnost tvorby objednávek:**
   - Objednávka se dá vytvořit v Operator Console během hovoru, ale zároveň existuje samostatná routa `/orders/new`. Tím vzniká riziko obcházení procesu hovoru.

---

## 5. Hlavní UX a ergonomické problémy

1. **Vizuální hustota v Operator Console:**
   - Na obrazovce s rozlišením 1920×1080 je prostor využit dobře, ale na laptopech s menším displejem (časté u operátorů na home office) je UI přehlcené. Písma a ovládací prvky košíku soupeří se skriptem.
2. **Komplexita zadávání výsledku hovoru (Call Outcome):**
   - Pokud klient hovor položí, operátor musí rychle kliknout na jeden ze 3 stavů (Nedovoláno, Schůzka/Callback, Nezájem). V současném UI je výběr outcome smíchán s formulářem poznámek a důvodů selhání, což zdržuje.
3. **Chybějící zřetelný stav připravenosti:**
   - Operátor potřebuje obrovské a nepřehlédnutelné tlačítko: **ČEKÁM NA HOVOR / PAUZA**. Jakmile má pauzu (např. toaleta, oběd), automat nesmí tlačit další lead.

---

## 6. Hlavní technická a provozní rizika

1. **Závislost na stabilitě WebRTC (Telnyx / Asterisk):**
   - V reálném provozu call centra způsobují lokální sítě (firewally, nestabilní Wi-Fi) výpadky audia (SIP dropy). CRM musí mít okamžitou detekci pádu spojení s možností přepnutí na fallback (externí SIP klient nebo PSTN callthrough).
2. **Výkonnost dotazů při desítkách tisíc leadů:**
   - Tabulka `leads` a `calls` v databázi rychle poroste (stovky hovorů denně na jednoho operátora). Některé agregační dotazy v `src/lib/dal/activity.ts` a `analytics.ts` načítají plné sady dat namísto materializovaných pohledů.

---

## 7. Inventura obrazovek a doporučení (KEEP / IMPROVE / MERGE / HIDE / FREEZE / REMOVE)

| Obrazovka / Modul | Cesta | Cílová role | Účel | Hodnocení | Doporučení | Priorita | Návrh dalšího kroku |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **Operator Workspace** | `/workspace` | Operátor | Hlavní pracovní plocha, skript, hovor, objednávka | 4/5 | **KEEP** | **P0** | Zachovat jako středobod celého produktu. Dokončit ergonomii outcome tlačítek. |
| **Team Management** | `/team` | Team Leader | Denní monitoring operátorů, fronty, asistence | 4/5 | **KEEP** | **P0** | Zachovat; je to hlavní cockpit pro vedoucího směny. |
| **Výjimky a eskalace** | `/exceptions` | Team Leader | Řešení zaseknutých leadů a stížností | 3.5/5 | **MERGE** | **P1** | Sloučit přímo jako záložku do `/team` (Team Leader nechce překlikávat). |
| **Call Review Detail** | `/calls/[callId]/review` | Team Leader | Poslech nahrávky, skórování kvality hovoru | 4.5/5 | **KEEP** | **P0** | Špičkový nástroj pro coaching. Ponechat a propojit s hodnocením operátora. |
| **Historie hovorů** | `/calls` | TL / Admin | Přehled proběhlých hovorů a filtr nahrávek | 4/5 | **KEEP** | **P1** | Ponechat jako archiv a podklad pro audit. |
| **Správa skriptů** | `/settings/scripts` | Admin / TL | Tvorba skriptů a stromu námitek pro doplňky | 3.5/5 | **IMPROVE** | **P0** | Klíčové pro doplňky stravy. Zjednodušit editor, přidat námitky pro konkrétní produkt. |
| **Katalog produktů** | `/products` | Všichni | Seznam produktů, balíčků, cen a skladů | 3.5/5 | **IMPROVE** | **P1** | Přidat produktové karty s argumentáriem (dávkování, benefity) pro operátory. |
| **Seznam leadů** | `/leads` | TL / Admin | Import a správa databází kontaktů | 3/5 | **IMPROVE** | **P1** | Pro operátory **SKRÝT** (nesmí vybírat leady ručně), ponechat pouze pro TL na importy. |
| **Detail leadu** | `/leads/[leadId]` | TL / Admin | Karta zákazníka, historie, objednávky | 3.5/5 | **KEEP** | **P1** | Zákaznická karta 360° pro řešení reklamací a vratek. |
| **Seznam objednávek** | `/orders` | TL / Admin | Přehled prodejů, export pro expedici | 3.5/5 | **IMPROVE** | **P1** | Doplnit rychlý CSV export pro kurýrní služby (PPL, DPD, Zásilkovna). |
| **Nová objednávka** | `/orders/new` | Operátor | Manuální tvorba objednávky | 2/5 | **MERGE** | **P2** | Odstranit z hlavní navigace; objednávky se mají tvořit v kontextu hovoru v `/workspace`. |
| **Trénink / Simulátor** | `/training` | Operátor / TL | AI trenažér nácviku prodeje | 3/5 | **FREEZE** | **P2** | Funkčně zajímavé, ale pro pilot call centra zbytné. Zmrazit a nerozšiřovat. |
| **Analytika** | `/analytics` | Admin / TL | Konverze, průměrná cena košíku, tržby | 3/5 | **IMPROVE** | **P1** | Zaměřit na metriky doplňků: AOV (průměrný košík), konverze na produkt, % storn. |
| **Kalendář / Callbacky** | `/calendar` | Operátor / TL | Přehled naplánovaných zpětných volání | 3/5 | **MERGE** | **P1** | Callbacky patří přímo do operátorské fronty v `/workspace`, kalendář nechat pro TL. |
| **Správa uživatelů** | `/settings/users` | Admin | Zakládání operátorů, přiřazení týmů | 4/5 | **KEEP** | **P0** | Nezbytné pro každodenní provoz. |
| **Nastavení telefonie** | `/telephony` | Admin | Konfigurace linek, SIP trunků a Telnyx | 3.5/5 | **KEEP** | **P0** | Technický základ. |
| **Audit Log** | `/audit` | Admin | Bezpečnostní záznamy přístupů a změn | 4/5 | **KEEP** | **P1** | Důležité pro GDPR a compliance. |
| **System Readiness** | `/readiness` | Admin | Kontrola spojení se službami a DB | 4.5/5 | **KEEP** | **P1** | Vynikající diagnostický nástroj při výpadcích. |
| **Monitor / Realtime** | `/monitor` | Admin / TL | Živý stav hovorů na lince | 3/5 | **MERGE** | **P1** | Sloučit s `/team`. |
| **Object Explorer** | `/objects/[slug]` | Nikdo | Generické tabulky a entity | 1/5 | **REMOVE** | **P2** | Zcela odstranit. Nemá v call centru pro doplňky stravy opodstatnění. |
| **Kreditní peněženka** | `/wallet` | Nikdo | Virtuální kredity a nákup tokenů | 1.5/5 | **REMOVE** | **P2** | Odstranit z navigace a zmrazit kód. Pro B2B instalaci call centra nedává smysl. |
| **Workflow Engine** | `/workflows` | Admin | Grafický konfigurátor webhooků a triggerů | 2/5 | **FREEZE** | **P2** | Zmrazit. Triggery (např. e-mail po objednávce) řešit jednoduchým kódem, ne vizuálním builderem. |

---

## 8. Cílová architektura navigace podle rolí

Aby se operátor ani Team Leader neztráceli, navigace musí být radikálně zjednodušena:

### A. Operátor (Čistá hlava, maximální soustředění na prodej)
Operátor nepotřebuje vidět 15 položek v menu. Vidí pouze:
1. **Pracovní plocha (`/workspace`)** – jeho jediný domov po celou směnu.
2. **Moje callbacky (`/workspace/callbacks`)** – kontakty, které si vyžádaly zavolání zpět.
3. **Katalog produktů (`/products`)** – rychlý tahák (složení doplňků, dávkování, kontraindikace).
*(Vše ostatní je pro operátora skryté!)*

### B. Team Leader (Řízení směny, dohled, coaching)
1. **Tým & Směna (`/team`)** – kdo volá, kdo má pauzu, kdo potřebuje pomoc, výjimky.
2. **Kontrola hovorů (`/calls`)** – nahrávky, hodnocení kvality a feedback operátorům.
3. **Leady & Databáze (`/leads`)** – kontrola stavu databází, přiřazování kontaktů.
4. **Objednávky (`/orders`)** – kontrola podezřelých objednávek před odesláním.
5. **Výsledky & Konverze (`/analytics`)** – tržby a prodeje směny.

### C. Administrátor (Systém, technika, compliance)
1. **Nastavení uživatelů a týmů (`/settings/users`)**
2. **Skripty a námitky (`/settings/scripts`)**
3. **Telefonie a SIP linky (`/telephony`)**
4. **Zdraví systému & Audit (`/readiness`, `/audit`)**

---

## 9. Doporučené pořadí kroků (Action Plan)

### Krok 1: Vyčištění navigace a rolí (Okamžitý psychologický efekt)
- Z postranního menu odstranit `/objects/[slug]`, `/wallet` a `/workflows`.
- Skrýt pro roli `operator` přístup do celkových tabulek `/leads` a `/orders`.
- **Dopad:** Systém okamžitě začne působit jako hotový, profesionální a klidný nástroj.

### Krok 2: Ladění prodejního skriptu pro doplňky stravy v `/workspace`
- Prodej doplňků stravy stojí a padá na skriptu. Operátor potřebuje v pravém sloupci:
  - **Strom námitek (Objection handling):** Rychlé klikací záložky: *"Je to drahé"*, *"Už beru jiné léky"*, *"Musím se poradit s lékařem"*, *"Pošlete mi to e-mailem"*. Po kliknutí se operátorovi zobrazí schválená odpověď.
  - **Upsell logika:** Pokud vybere 1 balení, systém mu zvýrazní výzvu: *"Nabídněte 3měsíční kúru s dopravou zdarma a dárkem"*.

### Krok 3: Export objednávek do expedice
- V `/orders` přidat tlačítko na stažení CSV pro fulfillment (jméno, telefon, adresa, produkty, dobírková částka). To umožní okamžitý reálný test s reálnými balíčky.

### Krok 4: Pilotní test v 1 týmu (3–5 operátorů)
- Nezkoušet nasadit celý systém na 100 lidí najednou.
- Vybrat jednoho schopného Team Leadera a 3 operátory na jednu konkrétní kampaň (např. reaktivace starých zákazníků na nový kolagen).
- Sbírat zpětnou vazbu po každé směně.

---

## 10. Co nyní rozhodně NEDĚLAT (Stop-List)

1. **Nevyvíjet vlastní fakturační či platební bránu:** V telemarketingu doplňků stravy v ČR/SK se 95 % objednávek posílá na dobírku kurýrem. Online platby kartou nejsou v první fázi nutné.
2. **Nepokračovat ve vývoji generických objektů (`/objects`):** Je to ztráta času a zbytečná abstrakce.
3. **Netrávit čas na AI zákaznickém simulátoru (`/training`):** Operátoři se nejlépe učí stínováním zkušenějšího kolegy (poslech hovorů přes `/calls/[callId]/review`).
4. **Nekomplikovat vizuální styl ani nedělat velký redesign od nuly:** Současný tmavý design (Zinc/Dark theme) je moderní, čistý a funkční. Problém nebyl v barvách, ale v nadbytku nepodstatných obrazovek.

---

## 11. Doporučení pro prezentaci a prodej majitelům call center

Když budeš Countdown CRM prezentovat vedení nebo majitelům call centra, **neukazuj jim nastavení ani technické moduly**. Ukaž jim konkrétní byznysový příběh:

1. **Ukázka č. 1: Den operátora (3 minuty)**
   - *"Podívejte se: operátor přijde do práce, klikne na jediné tlačítko. Systém mu okamžitě zvedne hovor. Vidí historii paní Novákové, že si před půl rokem koupila kloubní výživu. Má před sebou přesný skript na pokračovací kúru, jedním klikem vyřeší námitku na cenu, zaškrtne zvýhodněný balíček a hovor ukončí. Za 4 sekundy má na uchu dalšího klienta. Žádné překlikávání, žádné ruční hledání v tabulkách."*
2. **Ukázka č. 2: Kontrola a koučink Team Leadera (2 minuty)**
   - *"Team Leader vidí v reálném čase, kdo zrovna volá a kdo má neobvykle dlouhý hovor. Po skončení směny si rozklikne hovory s námitkou, poslechne si nahrávku a přímo do systému napíše operátorovi zpětnou vazbu k argumentaci."*
3. **Ukázka č. 3: Export do skladu (1 minuta)**
   - *"Na konci směny jedním klikem vygenerujete data pro kurýra a balíčky odcházejí klientům."*

Tento scénář pochopí každý ředitel call centra během 10 minut, protože řeší jeho reálné peníze a efektivitu lidí.

---

## 12. Seznam neověřených položek (Limity auditu)

Následující oblasti vyžadují ověření s reálným hardwarem a produkční infrastrukturou:
- **Živé audio a zpoždění (Jitter/Latency):** Chování WebRTC SIP klienta v reálné síti s desítkami současně probíhajících hovorů.
- **Rychlost exportu velkých datasetů:** Export 50 000+ leadů do CSV při plném vytížení databáze.
- **Kompatibilita náhlavních souprav:** Funkce tlačítek příjmu/zavěšení na USB/Bluetooth sluchátkách (Jabra, Plantronics) v prohlížeči.

---
*Audit byl sestaven nezávisle a objektivně na základě revize architektury, zdrojových kódů a provozních principů telemarketingu.*
