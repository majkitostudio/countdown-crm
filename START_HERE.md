# Countdown CRM — START HERE

Tento soubor je první místo, kam se má člověk podívat při návratu k projektu.

## Co Countdown je

Countdown CRM je komplexní all-in-one CRM systém vytvořený na míru pro konkrétní telemarketingové call centrum, které prodává doplňky stravy.

Není to obecné „AI CRM pro každého“ ani sbírka náhodných obrazovek. Je to specializovaný provozní systém, který má propojit práci s leady, zákazníky, hovory, produkty, objednávkami, týmy, kvalitou, tréninkem, reportingem a administrací do jednoho použitelného prostředí.

## Organizační hierarchie

- **Workspace = Systém firmy:** Globální prostředí konkrétního call centra.
- **Kampaň = Oddělení (P1–P4):**
  - **P1:** Senior Sales / Hot Leads (elitní prodejci, prioritní kontakty, maximalizace košíku).
  - **P2:** Standard Sales / Mass Outbound (masové databáze z různých zdrojů, běžní operátoři).
  - **P3:** Retence & Upsell (automaticky po 3 týdnech / 21 dnech od převzetí balíčku do ruky klienta).
  - **P4:** Poslední záchrana (faily po 24h na druhý den, vratky na Re-ship, zásilky ležící na výdejně > 3 dny bez hovoru).
- **Týmy = Rozdělení Kampaně:** Jednotlivé směny a operační jednotky (např. ranní směna, směna A).
- **Team Leader = Supervisor & Trenér:** Stará se o svůj Tým, trénuje, pomáhá při hovorech a řídí kvalitu.
- **Administrátor:** Řídí a spravuje celý Workspace.
- **Operátor:** Pracuje na lince ve svém Týmu a Kampani.

## Kde je projekt nyní (stav k 10. 10. 2026)

Projekt má rozsáhlou modulární kostru, kterou průběžně stabilizujeme a vylepšujeme. Nejde o tlak na rychlé dokončení nebo prodej MVP:
- **Testy:** Při poslední kontrole prošlo 823 testů ve 173 souborech.
- **Kostru kampaní P1–P4:** Implementované jsou pravidla 24h cooldownu pro faily, retence P3 po 21 dnech a záchrany zásilek v P4; provozní nasazení je potřeba ověřit samostatně.
- **Migrace:** V repozitáři je 128 souborů. Statická kontrola prochází, ale dvě migrace sdílejí verzi `20261007140000`; čistý běh na databázi zatím není touto kontrolou potvrzen.
- **Expedice a kurýři:** CSV exporty pro Zásilkovnu, Balíkovnu, GLS, sledovací čísla a linky na kurýry.
- **Provize a Mzdy:** Měsíční uzávěrka pro Team Leadera na `/wallet` a export podkladů pro mzdy v CSV.
- **Telefonie:** **Odložena na neurčito.** Žádné zbytečné výdaje na Telnyx ani složité VoIP nastavování, systém funguje se simulovaným/standardním workflow.
- **Pročištění:** Odstraněné slepé routy a generický Object Builder jsou pryč.
- **Objednávky:** `/orders` už nabízí Kanban i tabulku; Kanban není čekající návrh.

## Jak chápat P1–P4

Nemusíme teď mít skutečný zdroj leadů. Stavíme připravenou kostru, do které se budoucí zdroj napojí. Až data přijdou, systém je podle nastavených pravidel zařadí do správného oddělení a fronty:

- **P1 a P2** jsou dvě odchozí linky: P1 pro prioritní/komplexnější práci zkušených operátorů, P2 pro běžnou odchozí práci. Konkrétní produkty, akce ani zdroje se do logiky natvrdo nezapisují.
- **P4** zachraňuje vybrané nedokončené případy z P1/P2, vratky a rizikové zásilky. Ne každý neúspěšný hovor sem patří; trvale uzavřené důvody zůstávají uzavřené. Úspěšná záchrana nebo nová objednávka navazuje do P3.
- **P3** oslovuje zákazníka znovu po doručení a uplynutí 21 dní.
- Operátor pracuje se svojí přidělenou frontou; Team Leader potřebuje přehled o provozu a výjimkách. Nejde o ruční výběr leadů ani o přidání dlaždic bez užitečných dat.

Zjednodušeně:

```text
Nové leady ──► P1 nebo P2 ──┬──► prodej ──► doručení ──► po 21 dnech P3
                            ├──► vhodný neúspěch ──► P4
                            └──► nezájem / neplatný případ ──► uzavřeno

Vratka nebo riziková zásilka ──► P4 ──► záchrana/nová objednávka ──► doručení ──► po 21 dnech P3
```

Zdroj dat může být budoucí API nebo webhook; jeho připojení není podmínkou pro současnou práci na vzhledu a použitelnosti. Přehled P1–P4 znamená, že vedoucí může později vidět, jak práce mezi odděleními proudí — ne že PM musí dodat leady.

## Současný způsob práce

Projekt se iterativně stabilizuje a rozvíjí: ladíme působnost systému, vzhled, estetiku a každodenní použitelnost. Prioritu určujeme podle aktuální potřeby, ne podle tlaku na termín MVP. Další možná zjištění jsou v [docs/PROJECT_ASSESSMENT_2026-10-10.md](docs/PROJECT_ASSESSMENT_2026-10-10.md); pořadí je orientační, ne závazný plán.


## Co právě nemáme dělat

- nepřidávat obrazovky jen proto, aby systém působil větší;
- neměnit business pravidla bez potvrzení jejich zamýšleného chování;
- nepřipojovat demo k náhodné živé databázi;
- nezaměňovat exportovaný snapshot nebo tvrzení z historického AI auditu za aktuální stav;
- nepublikovat změny na GitHub bez kontroly rozdílu, testů a tajných hodnot;
- nehodnotit celý produkt pouze podle Operator Console;
- neinvestovat do VoIP/Telnyx, dokud uživatel telefonii znovu nezařadí mezi priority.

## Pravidlo návratu k práci

Před každou změnou si odpověz:

1. Která role tuto část používá?
2. Jaký provozní problém řeší?
3. Do které produktové oblasti patří?
4. Jak poznáme, že je řešení použitelné?
5. Neexistuje už stejná funkce jinde?

Podrobnější vize je v [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md), aktuální provozní pravidla v [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md), kompaktní historii v [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md) a analýza mezer s doporučenými akcemi v [docs/PROJECT_ASSESSMENT_2026-10-10.md](docs/PROJECT_ASSESSMENT_2026-10-10.md).
