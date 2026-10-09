# Countdown CRM — projektová pravidla pro agenta

Pravidla se doplňují po každém použití `/learn`. Nové pravidlo se vždy připisuje ke stávajícím, nepřepisuje je.

## 1. Organizační hierarchie call centra

- **Workspace = Systém firmy.** Globální prostředí konkrétního call centra (data, produkty, integrace, uživatelé).
- **Kampaň = Rozdělení Workspace na oddělení (P1–P4):**
  - **P1** — Senior Sales / Hot Leads (zkušení prodejci, prioritní leady, maximalizace košíku).
  - **P2** — Standard Sales / Leady z různých zdrojů (masové databáze, standardní operátoři).
  - **P3** — Retence, Upsell, udržení zákazníka. Lead vstupuje automaticky přesně 21 dní (3 týdny) od převzetí balíčku zákazníkem (`orders.delivered_at`).
  - **P4** — Poslední záchrana. Faily z P1/P2 jdou do P4 na druhý den (24 h); vratky (`returned`) na Re-ship; balíčky na výdejně déle než 3 dny, které dosud nebyly obvolány.
- **Tým = Rozdělení Kampaně** (např. ranní směna, tým A/B).
- **Team Leader = Supervisor a trenér** svého Týmu (dohled, koučink, pomoc při hovorech, kvalita).
- **Administrátor = Řídí a spravuje celý Workspace.**
- **Operátor = Pracuje na lince ve svém Týmu a Kampani.**

## 2. Modulární kostra, ne hardcodované případy

- Call centrum zpracovává velké množství leadů denně, import je plně automatizovaný (API/webhooky), nikdo nic nenahrává ručně.
- Nikdy nehardcodovat konkrétní sortiment, akci nebo zdroj do kódu či SQL. Příklady od PM (vzorečky, web objednávky apod.) jsou jen ilustrace.
- Stavět obecnou kostru: stavy leadu/objednávky, kampaně, týmy, zdroje leadů a časové intervaly.

## 3. Telefonie

- Telefonie (VoIP, Telnyx) je odložena na neurčito. Žádné výdaje ani závislost na placeném poskytovateli.

## 4. Metoda revize obrazovek a funkcí

U každé obrazovky, funkce nebo prvku, který revidujeme, vždy projít tyto kroky:

1. Která role to používá a jak často?
2. Rozhodnutí: **ponechat / sjednotit s jinou / smazat**.
3. Seřadit ponechané podle důležitosti (od klíčových po doplňkové).
4. **Zvážit alternativní UI/UX koncept** (např. seznam s filtry → kanban board, tabulka → karty, samostatná stránka → panel v jiné obrazovce) a uvést vlastní doporučení s důvodem, ne jen popsat stav.

## 5. Komunikace

- Česky, jednoduše, „po lopatě“ — uživatel je projektový manažer, ne programátor.
- Při nejasnosti se ptát, nedomýšlet. Pokud je návrh PM podle mého názoru horší, říct to přímo a navrhnout lepší.
