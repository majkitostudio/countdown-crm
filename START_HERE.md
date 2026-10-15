# Countdown CRM — START HERE

Tento soubor je první místo, kam se má člověk podívat při návratu k projektu.

## Co Countdown je

Countdown CRM je komplexní all-in-one CRM systém vytvořený na míru pro konkrétní telemarketingové call centrum, které prodává doplňky stravy.

Není to obecné „AI CRM pro každého“ ani sbírka náhodných obrazovek. Je to specializovaný provozní systém, který má propojit práci s leady, zákazníky, hovory, produkty, objednávkami, týmy, kvalitou, tréninkem, reportingem a administrací do jednoho použitelného prostředí.

## Organizační hierarchie

- **Workspace = Systém firmy:** Globální prostředí konkrétního call centra.
- **Department = Oddělení (P1–P4):** Anglický název „Department P1“–„Department P4“, v datech slug `p1`–`p4`.
  - **P1:** Senior Sales / Hot Leads (elitní prodejci, prioritní kontakty, maximalizace košíku).
  - **P2:** Standard Sales / Mass Outbound (masové databáze z různých zdrojů, běžní operátoři).
  - **P3:** Retence & Upsell (automaticky po 3 týdnech / 21 dnech od převzetí balíčku do ruky klienta).
  - **P4:** Poslední záchrana (faily po 24h na druhý den, vratky na Re-ship, zásilky ležící na výdejně > 3 dny bez hovoru).
- **Týmy = Rozdělení Departmentu:** Výchozí název týmu = department + iniciála příjmení Team Leadera (např. `P1K`).
- **Team Leader = Supervisor & Trenér:** Stará se o svůj Tým, trénuje, pomáhá při hovorech a řídí kvalitu.
- **Administrátor:** Řídí a spravuje celý Workspace.
- **Operátor:** Pracuje na lince ve svém Týmu a Departmentu.

## Kde jsme teď (stav k 15. 10. 2026)

Projekt má rozsáhlou modulární kostru, kterou průběžně stabilizujeme a vylepšujeme. Nejde o tlak na rychlé dokončení nebo prodej MVP:

- **Roadmapa:** Další fáze práce (Fáze 0–7) jsou v [docs/ROADMAP.md](docs/ROADMAP.md). **Fáze 0 (pročištění), Fáze 1 (navigace + Admin Hub), Fáze 2 (názvy, sloučení obrazovek a nové URL), Fáze 3 (Objednávky), Fáze 4 (P1–P4 jako provozní model), Fáze 5 (data model a migrace), Fáze 5.1 (databázové testy a CI gate), Fáze 5.1b (vlastnictví záznamů: kaskáda + viditelné počítadlo) i Fáze 5.1c (nové leady se automaticky zařadí do fronty) jsou hotové**; na řadě je **Fáze 6 — Team Leader dashboard a reporty**.
- **Testy:** 880 testů v 181 souborech prochází; `lint`, `typecheck` i `build` jsou zelené. Databázové pgTAP testy (`npx supabase test db`) procházejí na čisté databázi (**13 souborů, 236 testů**) a běží i v CI jako job `database-tests`.
- **Migrace:** 132 souborů, **0 duplicit**; kontrola duplicit i **migration parity** (`npm run verify:parity`) jsou součástí kontroly. Čistý běh celého řetězce na prázdné databázi ověřen (132 migrací + seed). Detaily: [docs/PHASE_5_MIGRATIONS_REVIEW.md](docs/PHASE_5_MIGRATIONS_REVIEW.md).
- **Vstup leadů do fronty:** každý nový lead se zařadí automaticky (trigger na `leads`) — ať vznikne ručním zadáním, importem CSV nebo budoucím API/webhookem. Položka převezme tým leadu; import bez týmu zůstane „bez přiřazení“ a doplní jej kaskáda z Fáze 5.1b. Už uzavřený lead (`customer`/`unresponsive`) se zařadí jako `closed`.
- **Vlastnictví záznamů:** dokud není tým potvrzený, záznam (`team_id IS NULL`) vidí jen administrátor. Potvrzení týmu u leadu i u položky fronty se navzájem doplní, ale nikdy nepřepíše už potvrzený tým. Administrátor to spravuje na **`/admin/ownership`** a počítadlo „bez přiřazení“ je vidět na kartě v **Management** (`/admin`).
- **P1–P4:** Pravidla 24h cooldownu pro faily, retence P3 po 21 dnech a záchrany zásilek v P4 jsou v databázové logice. Oddělení = **Department P1–P4** (anglicky); přehled front je hotový jako view **Queues** v Team Workspace; sdílený model `src/lib/department.ts` je hotový.
- **Expedice a kurýři:** CSV exporty pro Zásilkovnu, Balíkovnu, GLS, sledovací čísla a linky na kurýry.
- **Provize a mzdy:** Měsíční uzávěrka pro Team Leadera na `/wallet` a export podkladů pro mzdy v CSV.
- **Objednávky:** `/orders` už nabízí Kanban i tabulku.
- **Telefonie:** **Odložena na neurčito.** Žádné zbytečné výdaje na Telnyx ani složité VoIP nastavování.
- **Pročištění (Fáze 0):** hotovo — odstraněny slepé routy, blueprints, custom schema i kanban/filtry u leadů; navigace neobsahuje mrtvé odkazy.
- **Navigace (Fáze 1):** hotovo — levé menu rozdělené do sekcí (Work · Team · Reporting · Learn · Administration · Account), anglické názvy, Team Leader Review jako záložka v Team Workspace, Call Logs skryté operátorům a jedna položka **Admin Hub** (`/admin`) pro admina. Detaily: [docs/PHASE_1_NAVIGATION_REVIEW.md](docs/PHASE_1_NAVIGATION_REVIEW.md).
- **Struktura a názvy (Fáze 2):** ✅ hotovo — revize všech obrazovek (role, četnost, sloučení A–F), **pravidlo pojmenování** (název anglicky · popis česky · obsah česky · obecná tlačítka a URL anglicky) a tři vlny: názvy → sloučení → URL. Nové cesty jsou `/console`, `/schedule`, `/call-logs`, `/reports`, `/automations`, `/admin/users` a `/team/*`, staré cesty přesměrované. Otevřené body (produktová karta, koncept Schedule) pokračují samostatně. Detaily: [docs/PHASE_2_STRUCTURE_REVIEW.md](docs/PHASE_2_STRUCTURE_REVIEW.md).
- **Trenažér (AI Training):** čeká velký samostatný refactor (vyňat z Fáze 2). Plán: [docs/TRAINING_REFACTOR.md](docs/TRAINING_REFACTOR.md).

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

Projekt se iterativně stabilizuje a rozvíjí: ladíme působnost systému, vzhled, estetiku a každodenní použitelnost. Prioritu určujeme podle aktuální potřeby, ne podle tlaku na termín MVP. Plán dalších fází je v [docs/ROADMAP.md](docs/ROADMAP.md).

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

## Dokumentace

Živé zdroje (aktuální):

- **[docs/ROADMAP.md](docs/ROADMAP.md)** — plán dalších fází a jejich stav.
- [docs/PHASE_2_STRUCTURE_REVIEW.md](docs/PHASE_2_STRUCTURE_REVIEW.md) — revize struktury, názvů a sloučení obrazovek (Fáze 2).
- [docs/TRAINING_REFACTOR.md](docs/TRAINING_REFACTOR.md) — plánovaný refactor trenažéru (AI Training).
- [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md) — produktová identita a oblasti.
- [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md) — pracovní a technická pravidla.
- [docs/HISTORY_COMPACT.md](docs/HISTORY_COMPACT.md) — stručná historie rozhodnutí a vývoje.
- [docs/P0_3_REMOTE_DB_RUNNER.md](docs/P0_3_REMOTE_DB_RUNNER.md) — technický runbook pro ověření linked databáze.
- [docs/ai/AI_STUDIO_BASE_PROMPT.md](docs/ai/AI_STUDIO_BASE_PROMPT.md) — kontext pro AI Studio.

Historické (není zdroj aktuálního stavu, pouze kontext): [docs/archive/](docs/archive/).
