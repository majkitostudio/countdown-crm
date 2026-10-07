# 📦 Šablona reálného katalogu produktů (Doplňky stravy)

Tento soubor slouží jako přehledný průvodce pro **Produktového manažera** k naplnění ostrých dat v CRM:
- **Produkty** (názvy, ceny v CZK, popisy, skladová dostupnost),
- **Prodejní skripty hovorů** (strukturované kroky pro operátora v konzoli),
- **Katalog námitek** (rychlé odpovědi na pochybnosti zákazníků po telefonu).

Datový soubor se nachází v:  
👉 [`data/seeds/catalog-seed-template.json`](file:///c:/Users/mikes/.projects/countdown-crm/data/seeds/catalog-seed-template.json)

---

## 🏗️ Struktura jedné položky v šabloně

Každý produkt v JSONu má následující strukturu:

### 1. Základní informace o produktu
- `id`: Jedinečný identifikátor (standardní formát UUID, např. `11111111-0000-0000-0000-000000000001`).
- `title`: Obchodní název produktu (např. *ArthroFlex Active Forte*).
- `category`: Pro doplňky stravy vždy `"supplements"`.
- `price`: Základní telefonická cena v celých korunách (např. `1199`).
- `currency`: Měna, pro ČR `"CZK"`.
- `description`: Stručný popis složení a účinků produktu (viditelný pro operátory i v přehledu objednávek).
- `image_url`: Cesta k obrázku nebo ilustraci produktu.
- `in_stock`: `true` (skladem) nebo `false` (vyprodáno).

### 2. Prodejní skript pro hovor (`script`)
Operátor vidí tento skript přímo na obrazovce aktivního hovoru:
- `opening`: Úvodní věta a navázání kontaktu (první pozitivní dojem).
- `discoveryQuestions`: Diagnostické otázky na potřeby klienta (seznam otázek k odhalení problému).
- `approvedBenefits`: Schválené přínosy a argumenty (vysvětlení účinku a složení).
- `pricingOffer`: Nabídka cenových balíčků (např. běžná cena vs. akční cena dnes vs. plná kúra s e-knihami).
- `closing`: Závěrečná věta a ujištění (dobírka, doručení do 2 dnů, ověření adresy).
- `guardrails`: Mantinely a bezpečnostní pravidla (co operátor **nesmí** říkat – např. neslibovat lékařské vyléčení, nevymýšlet si slevy).

### 3. Námitky a protiargumenty (`objections`)
Rychlá rozklikávací nápověda pro operátora při pochybnostech klienta:
- `title`: Co klient namítá (např. *Cena je příliš vysoká*, *Musím se poradit*, *Nevěřím tomu*).
- `rebuttals`: Seznam 2–3 konkrétních a věcných odpovědí, které operátorovi pomohou námitku překonat.

---

## 🚀 Jak šablonu aplikovat do databáze
Po úpravě textů v souboru `catalog-seed-template.json` stačí spustit příkaz:
```bash
npm run seed:catalog
```
Tento příkaz:
1. Zkontroluje správnost všech polí (délky textů, bezpečnostní HTML značky),
2. Automaticky vygeneruje soubor `supabase/seed.sql`,
3. Umožní čistý start a okamžité naplnění CRM reálnými daty.
