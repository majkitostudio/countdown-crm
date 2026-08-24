# Countdown CRM — aktuální stav a desatero

**Snapshot:** 24. 8. 2026  
**Větev:** `feat/lead-call-outcome-order`  
**Referenční HEAD před touto dokumentací:** `1c79c89 fix: harden call order completion migration`  
**Pracovní strom:** dokumentační změna v tomto commitu navazuje na ověřený kódový checkpoint  
**GitHub:** větev je pushnutá; draft PR #7 zůstává otevřený k review

## Jedna věta na úvod

Jsme ve fázi **stabilizace před bezpečným interním pilotem**. Základ CRM,
workspace oprávnění, fronta leadů, objednávky a lifecycle hovoru už existují.
Nejsme ale ve fázi, kdy bychom měli bez dalšího přidávat velké funkce nebo
tvrdit, že je produkt připravený pro běžný produkční provoz.

Nejbližší práce je hlavně o dokončení přihlášeného workflow od hovoru k objednávce
a o uzavření zbývajících bezpečnostních a provozních důkazů.

## Co je dnes skutečný základ

- Next.js 16.2.12, React 19, TypeScript, Tailwind 4 a Supabase Auth/Postgres.
- Přihlášení je chráněné proxy i samostatnou kontrolou uvnitř Server Actions.
- Workspace se hledá přes membership uživatele; role jsou `operator`,
  `team_leader` a `administrator`.
- Kritické zápisy vedou přes serverovou datovou vrstvu a podle potřeby přes
  databázové RPC: leady, produkty, hovory, fronta, objednávky, reminders,
  workflow a training sessions.
- Operator Console má serverem řízenou frontu, claim, start hovoru, heartbeat,
  cancel/recovery, outcome a callback. Telephony uvnitř prohlížeče je stále
  simulace, ne napojená ústředna.
- Objednávky mají lifecycle, historii stavů, řízené opravy detailů a auditní
  stopu. To je dobrý základ pro pilot, ale musí se znovu ověřit v přihlášeném
  browseru.
- Checkout po hovoru už posílá všechny položky objednávky najednou — včetně
  množství, skutečné prodejní ceny a případného bundle. Uložení hovoru,
  objednávky a položek probíhá jedním serverovým krokem.
- `78781cb` odstranil nepoužívané AI copilot, enrichment, follow-up,
  speech-recognition a některé dynamické UI plochy. To zmenšilo prostor pro
  nepravdivé sliby, ale starší dokumentace je stále místy popisuje jako hotové.

## Co je důležité nepřikrášlovat

- Product Script má workspace-scoped editor pro administrátora, draft/publish/archive
  verzování, sanitizaci a read-only zobrazení pro operátora. Pokud pro produkt
  není publikovaná verze, panel používá explicitní fallback; štítek `AI-assisted`
  není důkaz živé AI.
- Workflow pravidla a execution log se ukládají, ale některé akce runtime pouze
  vypíšou do konzole. E-mail, AI summary a manager notification proto nejsou
  skutečné externí integrace.
- Training je oddělený simulátor/session workflow. Není to produkční hovor a
  jeho provider může spadnout na lokální training engine.
- Dashboard a analytics používají reálná workspace data tam, kde existují.
  Forecast, live monitoring, sentiment z telephony a část KPI zůstávají
  `Unavailable`, což je správný stav.
- Presence existuje pro routing a heartbeat fronty. Monitor ale nemá skutečný
  live stream operátorů; „presence uložená pro routing“ neznamená „live
  supervisor monitoring hotový“.
- `NEXT_PUBLIC_ALLOW_DEMO_AUTH=true` je pouze lokální vývojová výjimka. Nesmí
  být zapnutá ve sdíleném stagingu ani v produkci.

## Aktuální stav Git a Supabase

Migration provenance je nyní srovnaná pro schválený sandbox projektu
`lpvypihpxhyjljikfzqo`: lokálně i vzdáleně je 60 migrací a každý version má
přesnou shodu. Suchý běh `db push` po nasazení nehlásí žádnou čekající změnu.
Vzdálený linked lint je čistý.

To neznamená, že je hotový celý pilot. Stále chybí čerstvý důkaz, že přihlášený
uživatel dokončí celý tok `hovor → outcome → objednávka → reload → SQL`.
Migration historie je tedy uzavřený gate; browser/persistence/RLS důkazy jsou
samostatný gate.

## Ověření tohoto průchodu

| Kontrola | Výsledek | Poznámka |
|---|---|---|
| `npm test` | **prošlo** | 5 souborů, 31 testů |
| `npm run check` | **prošlo** | lint, typecheck a build; zůstávají 3 starší warningy ve workspace stránce |
| `git diff --check` | **prošlo** | bez whitespace chyb |
| Supabase local lint | **prošlo** | bez schema errors |
| Supabase linked lint | **prošlo** | bez errorů na sandboxu |
| Migration list + dry-run | **prošlo** | 60/60 shod, žádná čekající migrace |
| Přihlášený browser smoke | **částečně prošel** | workspace, lead, produkt a simulovaný aktivní hovor; celý order checkout s reloadem zatím neprokázán |
| Dependency/security audit | **otevřeno** | starší auditní nálezy zůstávají k samostatnému řešení |

Tento snapshot **neprohlašuje celý přihlášený workflow za hotový**. Kód,
testy a SQL metadata jsou důkaz jedné vrstvy. Přihlášený browser potvrdil
workspace a simulovaný hovor, ale neuložil v tomto průchodu novou objednávku
se všemi položkami. To zůstává otevřený důkazní krok, ne důvod k domněnce.

## Aktualizovaný pracovní postup pro databázové změny

Od tohoto slice platí krátký pevný postup:

1. Nejprve zkontrolujeme Git, větev, pracovní strom a aktuální migration list.
2. Novou změnu vytvoříme přes `supabase migration new`; historii live databáze
   nepřepisujeme a ruční SQL nepovažujeme za zdroj pravdy.
3. Před nasazením spustíme lokální lint a dry-run proti schválenému sandboxu.
4. Po nasazení znovu spustíme linked lint, migration list a dry-run. Dokud
   lokální a vzdálená historie nesedí, další aplikační ověřování se nepovažuje
   za platné.
5. Teprve potom ověřujeme přihlášený browser, reload, SQL výsledek a případně
   RLS negativní scénář. Testy a build samy o sobě tento důkaz nenahrazují.
6. Kód/migrace, dokumentace a případné další změny mají oddělené focused
   commity; před pushnutím se kontroluje přesný seznam souborů.

## Doporučené pořadí commitů

Každý bod níže je jeden tematický commit. Nepřidávat do něj nesouvisející UI
nebo novou funkci jen proto, aby byl commit větší.

1. **HOTOVO — srovnat Git a živé migrace**

   `chore: reconcile repository and remote migration history`

   Provenance byla obnovena z ověřeného sandboxu, lokální a vzdálený seznam
   nyní odpovídají a linked lint je čistý. Další schema změny už musí projít
   novým postupem popsaným výše.

2. **P0 — uzavřít dependency/security audit**

   `chore: upgrade Next.js and close production dependency audit`

   Aktualizovat Next.js a související balíčky kontrolovaně, po přečtení
   aktuálních Next.js pravidel z `node_modules/next/dist/docs/`. Neprovádět
   slepě `npm audit fix --force`. Znovu ověřit test, lint, typecheck, build a
   audit. Součástí je i rozhodnutí k ochraně proti uniklým heslům v Supabase.

3. **P0 — dokončit důkaz přihlášeného checkoutu**

   `test: verify authenticated pilot workflows against Supabase`

   V reálném Auth účtu projít: login → workspace → aktivní hovor → outcome
   `order_placed` → objednávka s více položkami → reload → ověření v SQL.
   Zapsat roli, datum, výsledek a případné fixture cleanup; neuvádět hesla.

4. **HOTOVO — sjednotit call checkout s uložením položek**

   `feat: persist call checkout order items`

   Checkout nyní předává položky objednávky jedním atomickým serverovým
   voláním pro administrátora i operátora. Ověřeny jsou množství, ceny,
   workspace produktu, skladová dostupnost a návaznost na vytvořenou objednávku.

5. **HOTOVO — zapojit zdroj Product Scriptu**

   `feat: persist and publish workspace product scripts`

   Používá se `product_scripts` a `product_script_versions`, draft/publish/archive
   přes DAL a RLS, bezpečné formátování a read-only runtime pro operátora.
   Zbývá pouze oddělené role-only ověření, pokud bude k dispozici příslušná
   přihlášená relace.

6. **P1 — uzavřít Operator Console lifecycle**

   `test: close operator queue and order lifecycle smoke`

   Doplnit opakovatelný smoke pro dva operátory, callback affinity, heartbeat,
   pád/recovery, order creation, status change a detail edit. Zaměřit se na
   race conditions a na to, že po chybě není lokální stav vydáván za uložený.

7. **P1 — oddělit reálné workflow od simulací**

   `refactor: isolate workflow simulations from production actions`

   U každé akce rozhodnout: skutečně ji implementujeme, nebo ji zobrazíme jako
   `Unavailable`/`Simulation`. Console log nesmí být vydáván za odeslaný
   e-mail, AI analýzu nebo notifikaci. Odstranit také demo payloady typu
   `Demo test transcript...` z cesty, kterou může uživatel považovat za realitu.

8. **P1 — uklidit RLS a výkonové warningy**

   `fix: close remaining Supabase policy and index warnings`

   Zapnout leaked-password protection, projít duplicitní permissive policies a
   doplnit jen odůvodněné FK indexy. Každou změnu ověřit security/performance
   advisorem a negativním přístupovým testem.

9. **P2 — sjednotit dokumentaci se skutečným produktem**

   `docs: align architecture and roadmap with pilot reality`

   Aktualizovat `README.md`, `docs/architecture.md`, `docs/roadmap.md` a
   `docs/commits.md`, aby nepopisovaly odstraněný Copilot, live AI nebo hotové
   externí integrace jako současný stav. Vizi zachovat, ale oddělit ji od
   ověřeného pilotu.

## Nové desatero pro práci na projektu

1. **Nejdřív řekneme, co přesně měníme.** Každý úkol má cíl, co do něj
   nepatří, riziko a jasný způsob ověření.
2. **Jeden commit řeší jednu věc.** Funkce, refaktor, migrace a dokumentace se
   nemíchají jen kvůli pohodlnějšímu pushi.
3. **Kód není důkaz hotového workflow.** U každého důležitého zápisu chceme
   přihlášení, správnou roli, reload a kontrolu výsledku v databázi.
4. **Bezpečnost žije na serveru a v RLS.** UI může něco skrýt, ale nesmí být
   jedinou ochranou workspace nebo role.
5. **Lokální migrace a live databáze musí být ve shodě.** Každá schema změna
   má migration, dry-run, linked lint a kontrolu migration listu. Ruční SQL mimo
   Git je dočasný incident, ne nový zdroj pravdy.
6. **Nevyrábíme falešné signály.** Žádné smyšlené latency, online stav,
   AI skóre, e-mail, telephony nebo „success“, když se nic neuložilo.
7. **Simulace jsou viditelně simulace.** Training, softphone a lokální fallback
   nesmí vypadat jako produkční call centrum.
8. **Kontroly spouštíme v pořadí.** Nejprve lokální test/lint/typecheck/build,
   potom migration lint/provenance, a u datové změny nakonec browser + reload +
   SQL smoke. Jedna zelená vrstva nenahrazuje druhou.
9. **Opravujeme příčinu, ne masku.** Nevypínat pravidla, nezakrývat chybu
   fallbackem a nemažme test jen proto, aby vyšel zeleně.
10. **Po práci necháme stopu.** Aktualizovat stavový dokument, přesně uvést
    ověření, stageovat konkrétní soubory a push/merge dělat až po kontrole
    divergence větví. Dokumentace musí říct i to, co ještě prokázané není.

## Kdy smíme říct „interní pilot je připravený“

Teprve až platí všechno níže:

- Git a live Supabase mají stejnou migrační historii;
- bezpečnostní audit nemá otevřený P0 problém;
- reálný Auth uživatel projde hlavním workflow a zápisy přežijí reload;
- role a cizí workspace jsou ověřené negativním testem;
- Product Script má jasný a ověřený zdroj pravdy;
- simulované části jsou zřetelně oddělené od produkčních záznamů;
- testy, lint, typecheck, build a dependency audit mají vysvětlený výsledek;
- dokumentace odpovídá tomu, co skutečně běží.

Do té doby je správný status: **stabilizační práce / interní pilot v přípravě**.
