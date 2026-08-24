# Supabase sandbox cutover

## Aktuální stav

K 24. 8. 2026 je Countdown CRM převedený na nový testovací Supabase projekt a připravený na další malý produktový slice. Data i přihlášené UI jsou ověřené; deployment ještě nebyl přepnutý a starý projekt zůstává jako záloha.

- Nový sandbox: `countdown-crm-sandbox-20260824`, ref `lpvypihpxhyjljikfzqo`
- Původní projekt: ref `qlzrsookyobtvyekhrqi`
- Ověřený lokální server: `http://localhost:3001`
- Ověřená větev: `chore/close-pilot-readiness-gate`, HEAD `f5391ca`
- Draft PR #6 zůstává otevřený: `chore/close-pilot-readiness-gate` → `main`

Lokální `.env.local` v hlavním checkoutu míří na nový sandbox. Soubor je ignorovaný Gitem a žádný klíč z něj nepatří do commitu. Starý běžící proces na portu 3000 nebyl násilně ukončen; jako aktuální důkaz se používá nový server na portu 3001.

## Co se přeneslo

- 5 Auth účtů, 5 profilů a 5 workspace členství
- 1 organizace a 1 workspace
- 4 leady a 3 produkty
- 8 objednávek a 8 záznamů historie stavů objednávek
- 16 hovorů, 2 lead notes a queue data
- workflow, training data a 11 auditních záznamů

Identifikátory a vazby zůstaly zachované. Hesla byla přenesena pouze jako původní hash; žádné heslo nebylo zobrazeno. Aktivní relace, resetovací/potvrzovací tokeny, push subscriptions a přechodný stav presence se nepřenášely.

## Důkazy

### Databáze

- nový projekt obsahuje 55 Auth/schema migration řádků;
- lokálně existuje 55 migration souborů;
- porovnání verzí: `MIGRATION_DIFF_COUNT=0`;
- žádné orphan profily, membershipy, objednávky ani order-history záznamy;
- v novém Auth nejsou neprázdné resetovací ani potvrzovací tokeny;
- starý projekt byl během migrace pouze čtený.

### Přihlášené UI

Na novém serveru byla v přihlášené relaci po načtení a reloadu ověřena:

- workspace/operator console včetně existujícího leadu a produktu;
- Leads: 4 záznamy;
- Products: 3 záznamy;
- Orders: 8 záznamů;
- Settings včetně načteného workspace schema.

Browser konzole po průchodu nehlásila chybu ani varování. Počáteční stav „načítám“ se po doběhnutí dat změnil na správný obsah; nejde o ztrátu dat.

### Repository gates

- Vitest: 29/29 testů prošlo;
- lint, typecheck a production build prošly;
- `npm audit --audit-level=high`: 0 zranitelností;
- `git diff --check`: prošel.

Lint stále hlásí tři neblokující upozornění na nepoužité hodnoty v `src/app/workspace/page.tsx`. Nejsou součástí tohoto cutoveru.

## Co zůstává mimo tento slice

- deployment/Vercel proměnné zatím nebyly přepnuté na nový sandbox;
- starý Supabase projekt se nemaže a historie migrací se nereconciliuje zpětně;
- telephony a live presence zůstávají explicitně unavailable/simulation podle aktuálního produktu;
- Product Scripts, nové Leads změny a redesign Console nejsou součástí cutoveru.

## Doporučený další krok

Po samostatném ověření deployment konfigurace začít jedním produktovým slice `lead → call → outcome → order`. Cílem je ověřit celý hlavní obchodní tok přes autentizovaný serverový boundary, s reload persistence a workspace/RLS důkazem. Teprve potom má smysl rozšiřovat Product Scripts a objection engine.

## Pravidlo pro uzavření cutoveru

Cutover je ověřený pro lokální interní pilot. Za plně přepnutý ho lze označit až po samostatném přepnutí deployment environmentu a novém přihlášeném smoke testu mimo lokální port 3001. Build a testy samy o sobě tento krok nepotvrzují.
