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

## Kde je projekt nyní (stav k 9. 10. 2026)

Projekt má postavenou pevnou, modulární kostru dat a byznys logiky:
- **100% test pass rate:** 823+ testů ve 174 souborech, 128 čistých migrací bez závislostních chyb.
- **Ověřená kostra kampaní:** Oddělení P1 až P4, 24h cooldown pro faily, 21 dní pro retenci P3 a záchrana zásilek pro P4.
- **Expedice a kurýři:** CSV exporty pro Zásilkovnu, Balíkovnu, GLS, sledovací čísla a linky na kurýry.
- **Provize a Mzdy:** Měsíční uzávěrka pro Team Leadera na `/wallet` a export podkladů pro mzdy v CSV.
- **Telefonie:** **Odložena na neurčito.** Žádné zbytečné výdaje na Telnyx ani složité VoIP nastavování, systém funguje se simulovaným/standardním workflow.

## Aktuální roadmapa k reálnému MVP

K reálnému a použitelnému MVP nás čeká doladění a začištění systému:
1. **Pročištění systému:** Odstranění zbytných/nepoužívaných částí (generické dealy v `/objects`, slepé uličky).
2. **Analýza mezer pro zlepšení:** Kontrola To-Do listů a nedodělků v jednotlivých workflow.
3. **UI/UX Upgrade & Sjednocení designu:** Zpřehlednění ovládání pro operátora i Team Leadera, jednotné komponenty a čistý moderní vzhled.
4. **Příprava na napojení ostrých leadů:** Automatizovaný přísun dat do kampaní P1 a P2 přes API.


## Co právě nemáme dělat

- nepřidávat nové obrazovky jen proto, aby systém působil větší;
- nepřepisovat důležitou business logiku kvůli vzhledu;
- nepřipojovat demo k náhodné živé databázi;
- nespoléhat na AI Studio jako na hlavní pracovní kopii repozitáře;
- nepublikovat změny na GitHub bez kontroly rozdílu, testů a tajných hodnot;
- nehodnotit celý produkt pouze podle Operator Console.

## Pravidlo návratu k práci

Před každou změnou si odpověz:

1. Která role tuto část používá?
2. Jaký provozní problém řeší?
3. Do které produktové oblasti patří?
4. Jak poznáme, že je řešení použitelné?
5. Neexistuje už stejná funkce jinde?

Podrobnější vize je v [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md), aktuální provozní pravidla v [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md) a kompaktní historie v [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md).
