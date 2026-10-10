# Countdown CRM — produktová vize

## Identita produktu

Countdown CRM je komplexní all-in-one CRM systém na míru pro telemarketingové call centrum zaměřené na prodej doplňků stravy.

Jeho hodnotou není počet obrazovek ani množství funkcí. Hodnotou je, že propojí celý provoz call centra do jednoho pravdivého, srozumitelného a efektivního systému, který mohou lidé používat každý pracovní den.

Countdown proto není generický CRM produkt pro libovolné podnikání. Je to specializovaný provozní nástroj pro konkrétní typ call-centrového prodeje. Komplexita je žádoucí, pokud má jasnou strukturu, vlastníka, pracovní účel a srozumitelný tok.

## Produktové oblasti

1. **Leads a zákazníci** — evidence, kontext, historie, segmentace a další kontakt.
2. **Calls a telephony** — telefonní proces, call session, stav, výsledek a návazné kroky.
3. **Products a orders** — nabídka doplňků stravy, objednávky, prodejní tok a stav zákazníka.
4. **Operator Console** — pracovní plocha operátora pro aktuální lead a hovor. Její obsah a rozhraní se přizpůsobují podle oddělení (např. prodejní oddělení vs. Oddělení P4 pro retargeting odmítnutých prodejů a Sent/Returns).
5. **Team Operations** — fronty, výjimky, pomoc, směny, týmový dohled a řízení práce.
6. **Quality a coaching** — hodnocení hovorů, zpětná vazba, compliance a rozvoj lidí.
7. **Training** — onboarding a průběžné procvičování schválených scénářů.
8. **Analytics a reporting** — výkon, konverze, výsledky, trendy a provozní přehled.
9. **Administration** — workspace, uživatelé, role, týmy, skripty a technické nastavení.

Tyto oblasti představují celkový produktový prostor. Neznamenají, že všechny musí být dokončené najednou nebo že každá musí mít samostatnou položku v hlavní navigaci.

## Organizační hierarchie a struktura systému

Systém je postaven na jasné, modulární a škálovatelné hierarchii pro velká call centra s automatizovaným přísunem tisíců leadů denně:

1. **Workspace = Systém firmy**
   - Zastřešuje celou firmu a její provozní prostředí.
   - Izoluje data, produkty, integrace, uživatelské účty a globální pravidla.

2. **Kampaň = Rozdělení Workspace na jednotlivá oddělení (P1 až P4)**
   - Definuje hlavní provozní pilíře a fáze životního cyklu leadu:
     - **P1 — Senior Sales / Hot Leads:** Prioritní linka pro zkušenější prodejce a složitější či prioritní práci. Konkrétní zdroj leadu, produkt nebo akce nejsou pevně dané.
     - **P2 — Standard Sales / Mass Outbound:** Běžná odchozí linka pro standardní práci a operátory. Lead může přijít z různých budoucích zdrojů; do kódu se nehardcoduje konkrétní databáze ani nabídka.
     - **P3 — Retence, Upsell & Péče o zákazníka:** Plně automatizovaný přesun po doručení. Lead vstoupí do fronty P3 přesně **3 týdny (21 dní) od doručení balíčku do ruky klienta (`delivered`)**. Účelem je kontrola spokojenosti s užíváním doplňků po 3 týdnech, udržení zákazníka a nabídka pokračovací kůry nebo doplňkových synergických produktů.
     - **P4 — Poslední záchrana & Retargeting:** Záchranné záchyty pro kontakty a zásilky, které by jinak propadly:
       - *Faily z P1/P2:* Recyklovatelné námitky (cena, nedůvěra, neúspěch) jdou do P4 **hned na druhý den (cooldown 24 hodin)**.
       - *Vratky (Returns):* Nepřevzatý balíček od kurýra (`returned`) jde okamžitě do P4 pro záchranu a Re-ship. Úspěšná záchrana/nová objednávka navazuje retenční péčí v P3.
       - *Rizikové balíčky na výdejně:* Zásilka leží na výdejně/boxu déle než **3 dny a dosud nebyla obvolána**.

3. **Týmy = Rozdělení Kampaně do konkrétních týmů**
   - V rámci každé kampaně (oddělení) pracují jednotlivé operační týmy (např. ranní směna, odpolední směna, tým A, tým B).
   - Každý tým sdružuje své operátory a má svého konkrétního Team Leadera.

4. **Role v systému**
   - **Administrátor:** Člověk, který řídí a managuje celý Workspace (nastavení, integrace, globální pravidla, produkty, přístupy).
   - **Team Leader (Supervisor & Trenér):** Člověk, který se stará o svůj Tým. Dohlíží na směnu, trénuje operátory, pomáhá jim při hovorech (Request Help), schvaluje výjimky a kontroluje kvalitu a měsíční provize.
   - **Operátor:** Člověk na lince obsluhující leady a hovory v rámci své přidělené kampaně a týmu.

## Hlavní produktové principy

- **Modulární kostra, ne hardcodované výjimky:** Systém nestojí na pevných pravidlech pro konkrétní sortiment či akce, ale na obecné stavové mašině a časových intervalech.
- **Automatizovaný tok:** Ve velkém call centru tečou tisíce leadů přes API/webhooky. Žádný operátor ani manažer nerozděluje leady ručně – systém je směruje automaticky podle kampaně, stavu a priorit.

- Každá role má jasný pracovní prostor a další krok.
- Funkce se sdružují podle skutečné práce, ne podle databázových tabulek.
- Data musí být pravdivá; systém nesmí předstírat úspěšné napojení nebo dokončenou akci.
- Komplexita se řeší strukturou, hierarchií a kontextem, ne odstraněním důležitých schopností.
- Operator-first je pravidlo pro operátorský workflow, ne pravidlo pro celý produkt.
- AI pomáhá s kontextem, tréninkem a kvalitou, ale nemění bez kontroly pravdu o hovoru, objednávce nebo oprávnění.
- Design má podporovat práci a rozhodování, ne pouze vytvářet dojem bohatého systému.

## Co znamená „produkt za 200 000 Kč“

Prodejní hodnota nevzniká počtem komponent. Vzniká tím, že systém:

- pokrývá skutečné procesy konkrétního call centra;
- zkracuje každodenní práci a omezuje ruční přepisování;
- dává každé roli relevantní informace;
- zachovává auditní stopu a bezpečné hranice oprávnění;
- je spolehlivý, školitelný a použitelný při běžném provozu;
- dovoluje budoucí rozšíření bez dalšího chaosu.

## Jak se vize používá

Countdown se vyvíjí iterativně. Cílem není za každou cenu dokončit ani prodávat MVP; cílem je postupně stabilizovat systém, zpřesňovat jeho působnost a zlepšovat design, estetiku a použitelnost. Produktová rozhodnutí a nové úpravy jsou očekávanou součástí práce.

Při návrhu každé změny ujasníme, komu slouží, jaký pracovní problém řeší a jak poznáme, že je přínosná. To pomáhá držet systém srozumitelný, ale nebrání rozšiřovat jeho schopnosti podle vize. Reálný zdroj leadů ani produkční telefonie nejsou podmínkou pro iterování nad zbytkem systému.
