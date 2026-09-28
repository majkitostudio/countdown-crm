# Countdown CRM — START HERE

Tento soubor je první místo, kam se má člověk podívat při návratu k projektu.

## Co Countdown je

Countdown CRM je komplexní all-in-one CRM systém vytvořený na míru pro konkrétní telemarketingové call centrum, které prodává doplňky stravy.

Není to obecné „AI CRM pro každého“ ani sbírka náhodných obrazovek. Je to specializovaný provozní systém, který má propojit práci s leady, zákazníky, hovory, produkty, objednávkami, týmy, kvalitou, tréninkem, reportingem a administrací do jednoho použitelného prostředí.

## Role v systému

- **Operátor** — pracuje s leadem, zákazníkem, hovorem, skriptem, výsledkem a dalším krokem.
- **Team Leader** — řídí tým, fronty, výjimky, pomoc operátorům, kvalitu a výsledky.
- **Administrátor** — spravuje workspace, uživatele, role, týmy, skripty a provozní nastavení.

Operator Console je jeden hlavní workflow scope, nikoli definice celého produktu.

## Kde je projekt nyní

Projekt má rozsáhlý funkční základ, role-aware navigaci, Operator Console, týmové pracovní plochy, správu uživatelů a týmů, objednávky, telefonní integrační vrstvy, trénink a AI podporu kvality. Některé části jsou ověřené automatickými nebo browser testy, jiné stále vyžadují produktový audit a ověření v souvislém pracovním dni.

Demo režim slouží k rychlému lokálnímu ověření bez živé databáze. Není náhradou produkční autentizace ani skutečných provozních dat.

## Aktuální hlavní úkol

Vrátit systému jasnou identitu a strukturu bez dalšího nekontrolovaného přidávání funkcí:

1. zvalidovat všechny současné produktové oblasti a obrazovky;
2. oddělit důležité pracovní prostory od podpůrných a administrativních nástrojů;
3. zjednodušit navigaci bez ochuzení potřeb call centra;
4. auditovat použitelnost jednotlivých workflow;
5. teprve potom redesignovat obrazovky, které to skutečně potřebují.

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
