# P2 — Team Leader scope historických záznamů

**Datum:** 14. 9. 2026
**Prostředí:** Supabase Sandbox `countdown-crm-sandbox-20260824`
**Production:** beze změny

## Co bylo omezeno

Team Leader nyní přes databázi vidí pouze hovory a objednávky z aktivních týmů, které vede. Stejné týmové omezení platí pro běžné seznamy a pro možnost měnit týmové záznamy.

Nově je výslovně oddělený seznam a detail:

- `/orders` zůstává týmově omezený; cizí objednávka se v seznamu neobjeví,
- známou objednávku ve stejném workspace lze otevřít přes přímou URL nebo profil zákazníka,
- známé cizí review lze otevřít také; operátor je pouze čte, Team Leader cizí tým pouze čte,
- Administrator zůstává workspace-wide,
- cross-workspace ID zůstává nedostupné.

Aplikační dotazy dál používají workspace jako základní dotaz, ale databáze nyní odstraní nepovolené řádky sama. Klientská obrazovka tedy není bezpečnostní hranicí. Přímé detaily používají samostatné serverové databázové funkce, takže rozšíření detailu automaticky nerozšíří seznam.

## Další ochrana

- seznam operátorů pro Team Leadera ignoruje archivované týmy,
- starší hovory a objednávky bez známého `team_id` se Team Leaderovi nepřisuzují,
- workflow/product/wallet zůstávají workspace-global, protože zatím nemají vlastnictví týmem; nebylo by správné je filtrovat podle domněnky.

## Ověření Sandboxu

Do transakce byly vloženy dočasné P1 a P2 testovací hovory a objednávky a transakce byla vrácena zpět:

- P1 Team Leader viděl 1 P1 call a žádný P2 call.
- P2 Team Leader viděl 1 P2 call a žádný P1 call.
- P1 Team Leader viděl 1 P1 order a žádný P2 order.
- P2 Team Leader viděl 1 P2 order a žádný P1 order.
- Administrator testovací záznamy viděl oba.

Žádná testovací data v Sandboxu nezůstala.

## Lokální ověření

- `tests/team-leader-historical-scope.test.ts`: 5 testů,
- navazující team/historické scope testy: 30 testů celkem,
- `npm run typecheck`: prošlo,
- `npm run lint`: prošlo.

## Browser smoke — Administrator v Sandboxu

Lokální aplikace na `http://127.0.0.1:3000` byla ověřena proti Sandboxu jako Administrator:

- `/team` se načetl a zobrazil frontu i členy workspace,
- `/calls` se načetl; prázdný seznam odpovídá aktuálnímu stavu po vrácení dočasných testů,
- `/orders` se načetl a zobrazil 16 objednávek,
- `/analytics` se načetl po restartu místního serveru a zobrazil skutečná Sandbox data: 25 hovorů, 5 dokončených objednávek a obrat 1 968,46 USD.

Toto potvrzuje funkčnost administrátorského pohledu.

## Browser smoke — Team Leader P1.7 v odděleném Sandbox přihlášení

Použit byl připravený testovací účet `P1.7 Test Team Leader` v izolovaném prohlížeči. Heslo nebylo vyžadováno ani zobrazováno.

- `/calls`: zobrazil 1 hovor z vedeného týmu, nikoli administrátorských 26 hovorů,
- `/orders`: zobrazil 0 objednávek, protože vedený tým nemá objednávku,
- `/analytics`: zobrazil `No activity`, 0 hovorů a 0 objednávek; globální administrátorská čísla nebyla vidět,
- `/calendar`: načetl se s prázdným stavem callbacků a připomínek,
- `/exceptions`: před změnou zobrazil 4 workspace‑globální výjimky; po nové Sandbox migraci `team_leader_exception_scope` (v Sandboxu evidované jako `20260914183420`) Team Leader zobrazí 0 týmových výjimek a pravdivé upozornění, že globální kontroly jsou pouze pro Administrátora, zatímco Administrator dál vidí všechny 4,
- `/training/reviews`: zobrazil 1 tréninkovou relaci; trénink zůstává workspace‑globální podle současného návrhu,
- přímé otevření známé cizí P1.6 objednávky zobrazilo detail objednávky, ale bez ovládání změn,
- přímé otevření cizího P1.6 review hovoru zobrazilo uložené důkazy v read-only režimu,
- přímý profil stejného zákazníka zobrazil Customer 360 historii a navázanou objednávku.

Po obnovení stránky zůstala identita i omezený pohled zachována. Žádná data nebyla změněna.

## Nově ověřený seznam/detail checkpoint

Migrace `direct_detail_access` byla v Sandboxu evidována jako `20260914194804`, následná migrace `direct_review_mutation_scope` jako `20260914195353`, bezpečnostní migrace čtecích funkcí jako `20260914200512` (lokální soubor: `20260914201000_harden_direct_read_functions.sql`) a oprava viditelnosti naplánovaných callbacků operátora jako `20260914200921` (lokální soubor: `20260914202000_operator_scheduled_callback_visibility.sql`).

- seznam objednávek zůstal omezený podle týmu,
- Team Leader i operátor otevřeli známou cizí objednávku přes přímou URL,
- Team Leader i operátor otevřeli známé cizí review; oba bez možnosti měnit cizí týmové review,
- operátor otevřel známý cizí profil zákazníka v read-only režimu,
- Admin `/orders` nadále zobrazil všech 16 workspace objednávek,
- Production migration history zůstala beze změny a neobsahuje týmové migrace.
- Veřejné RPC názvy zůstaly stejné, ale jejich privilegovaná těla jsou nyní v `private`; veřejné wrappery běží jako `SECURITY INVOKER`. Sandbox Security Advisor už těchto pět upozornění nehlásí.
- Operátor nyní přes RLS uvidí vlastní naplánované callbacky ve stavu `waiting_callback`; pravidlo nepřidává cizí záznamy ani práva měnit callbacky.
- Produktové rozhodnutí: callback není výhradně zamčený na nepřítomného operátora. Preferovaný operátor má přednost, ale po ztrátě dostupnosti callback přejde při dalším vyzvednutí do společné fronty volným operátorům stejného týmu. Samostatný systém suplování se neimplementuje.

## Team Leader `/team` checkpoint

Po rozšíření pracovní plochy byla stránka ověřena v Sandboxu jako `P1.7 Test Team Leader`:

- stránka zobrazila pouze jeden povolený aktivní tým `P3`,
- zobrazila pouze členy tohoto týmu a jednoho jeho operátora,
- zobrazila stav operátora z posledního uloženého signálu; starý signál byl správně označen jako `Offline / stale`,
- zobrazila pouze týmovou frontu; po vrácení testovacích dat zůstala prázdná bez vymyšlených položek,
- administrátorská správa členů zůstala Team Leaderovi skrytá.

Ověření proběhlo přes lokální aplikaci proti Sandboxu. Production nebyla použita.

## Co je stále otevřené

- úplný týmový tok přímých callbacků, Daily Brief a navazující týmové analytiky; základní viditelnost vlastního naplánovaného callbacku v kalendáři a read-only presence na `/team` jsou nyní pokryté,
- týmový výběr a další týmově specifické provozní stavy, které přesahují současný `/team` přehled,
- produktové rozhodnutí, zda workflow/product/wallet zůstanou globální, nebo dostanou vlastní týmové vlastnictví,
- důkaz idempotentního post-call zápisu při souběžném dokončení.
- Workflow/product/wallet/telephony diagnostika potřebuje samostatné produktové rozhodnutí, zda mají být globální, nebo dostat vlastní týmové vlastnictví.
- Linked concurrency důkaz idempotentního post-call zápisu zůstává otevřený.
