# Countdown CRM — projektová pravidla pro agenta

Pravidla se doplňují po každém použití `/learn`. Nové pravidlo se vždy připisuje ke stávajícím, nepřepisuje je.

## 1. Organizační hierarchie call centra

- **Workspace = Systém firmy.** Globální prostředí konkrétního call centra (data, produkty, integrace, uživatelé).
- **Department = Oddělení Workspace (P1–P4).** Anglicky „Department P1“–„Department P4“, v datech slug `p1`–`p4`:
  - **P1** — Senior Sales / Hot Leads (zkušení prodejci, prioritní leady, maximalizace košíku).
  - **P2** — Standard Sales / Leady z různých zdrojů (masové databáze, standardní operátoři).
  - **P3** — Retence, Upsell, udržení zákazníka. Lead vstupuje automaticky přesně 21 dní (3 týdny) od převzetí balíčku zákazníkem (`orders.delivered_at`).
  - **P4** — Poslední záchrana. Faily z P1/P2 jdou do P4 na druhý den (24 h); vratky (`returned`) na Re-ship; balíčky na výdejně déle než 3 dny, které dosud nebyly obvolány.
- **Tým = Rozdělení Departmentu.** Výchozí název týmu = department + iniciála příjmení Team Leadera (např. department P1 s TL Janem Kačmářem = `P1K`).
- **Team Leader = Supervisor a trenér** svého Týmu (dohled, koučink, pomoc při hovorech, kvalita).
- **Administrátor = Řídí a spravuje celý Workspace.**
- **Operátor = Pracuje na lince ve svém Týmu a Departmentu.**

## 2. Modulární kostra, ne hardcodované případy

- Call centrum zpracovává velké množství leadů denně, import je plně automatizovaný (API/webhooky), nikdo nic nenahrává ručně.
- Nikdy nehardcodovat konkrétní sortiment, akci nebo zdroj do kódu či SQL. Příklady od PM (vzorečky, web objednávky apod.) jsou jen ilustrace.
- Stavět obecnou kostru: stavy leadu/objednávky, oddělení (departments), týmy, zdroje leadů a časové intervaly.

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

## 6. Pojmenování a jazyk UI

Napříč celým CRM platí jednotné pravidlo (PM, 13. 10. 2026):

- **Název stránky** (titulek) = **anglicky** (např. `Schedule`, `Call Logs`, `Product Catalog`).
- **Popis** pod názvem = **česky**.
- **Obsah** stránky = **česky** (texty, tabulky, sloupce, hlášky).
- **Obecná tlačítka a štítky** = **anglicky** (`Submit`, `Back`, `Call`, `Schedule`, `Save`, `Cancel`).
- **URL adresa** = **anglicky** (`/console`, `/call-logs`, `/reports`).
- **Menu a názvy sekcí** = **anglicky** (`Work`, `Team`, `Reporting`, `Administration`).

## 7. Terminologie: Callback vs. scheduled call (Schedule)

PM, 16. 10. 2026:

- **Callback** = hovor vázaný na **konkrétního operátora**. Klient nemá čas, ale chce, aby mu později zavolal **právě ten** operátor. Ukládá se konkrétnímu operátorovi.
- **Scheduled call** (stránka `Schedule`, cesta `/schedule`; česky „naplánovaný hovor“) = naplánovaný hovor, který **neurčuje operátora**. Klient má termín (např. 16:00); hovor spadne do fronty v Operator Console operátorovi, který ho zadal. Když tento operátor v danou chvíli není volný, scheduled call **převezme někdo jiný** — a je to správně, nic se nerozbije.
- Rozdíl je tedy ve **vázanosti na operátora**: callback = pevně daný operátor, scheduled call = jen preference (toho, kdo ho zadal), ale vyřídit ho může kdokoli.
- V dokumentaci, popiscích a UI pro naplánované hovory používat **„Schedules“** / „naplánované hovory“, **ne** „callback“.
- **Texty v UI jsou sjednocené (PM, 16. 10. 2026).** Popisky, nadpisy, hlášky i chybové texty, které se propisují do UI, už „callback“ pro naplánovaný hovor nepoužívají (např. metrika v panelu Queues už neříká „Callback“). Nové texty psát rovnou takto.
- **Názvosloví v kódu a datech:** sjednocení názvosloví v kódu, migracích a datech (stav `waiting_callback`, sloupec `callback_scheduled_at`, `callbackAttention.ts`, action id `schedule_callback`, test id a interní proměnné) probíhá v dedikovaném refactoringu (17. 10. 2026), aby interní architektura přesně odpovídala rozlišení Callback vs. Scheduled call.
