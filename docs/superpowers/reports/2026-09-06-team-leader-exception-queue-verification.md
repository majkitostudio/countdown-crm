# Team Leader Exception Queue — ověření

**Datum:** 6. 9. 2026

**Commit:** `aa3618c feat: add team leader exception queue`

**Stav:** lokálně i v linked sandboxu ověřeno

## Co bylo postaveno

Team Leader a administrátor mají na `/exceptions` pracovní seznam skutečných
problémů, které vyžadují zásah. Nejde o druhou databázovou frontu ani o AI odhad.
Položky se odvozují z existujících dat:

- recovery po hovoru bez dokončeného outcome,
- prošlý callback,
- propadlé přidělení kontaktu,
- failed workflow,
- aktivní produkt bez publikovaného skriptu.

Ukládá se pouze rozhodnutí manažera: vyřešeno nebo odloženo, důvod, autor,
čas a předchozí/nový stav. Změna se zapisuje také do centrálního auditu.

## Bezpečnost a pravdivost

- Operátor odkaz nevidí a přímá URL skončí pravdivým „pouze pro Team Leadera a administrátora“.
- Serverový guard i Supabase RLS vynucují roli a aktivní workspace.
- Manažer nemůže zapsat rozhodnutí pro vymyšlenou nebo už neaktivní výjimku.
- Identitu existujícího rozhodnutí nelze přepsat přímým databázovým zápisem.
- Výpadek jednoho zdroje nesmaže data z ostatních zdrojů a nevytvoří falešný „vše je v pořádku“ stav.
- Staré vyřešení neschová nový výskyt stejného provozního problému; nový výskyt se znovu ukáže a dostane vlastní auditní událost.

Současný model ještě nemá explicitní týmy. Team Leader proto dočasně vidí celý
aktivní workspace. Po zavedení Users & Permissions se jeho rozsah zúží na členy
jeho týmu.

## Důkaz ověření

- lokální databáze byla sestavena z prázdna přes všechny migrace,
- databázové testy: **92/92**,
- aplikační testy: **251/251 v 68 souborech**,
- Supabase schema lint: bez chyb,
- Supabase security/performance advisors: bez nálezů na úrovni warning/error,
- ESLint: bez chyb,
- TypeScript: bez chyb,
- produkční Next.js build: úspěšný, `/exceptions` je dynamická serverová route,
- browser jako Team Leader: skutečná položka se zobrazila, snooze se uložil a po refreshi přešel do historie,
- browser jako operátor: položka v navigaci chyběla a přímá URL byla odmítnuta,
- nový čistý operátorský browser průchod neměl console error.

Během browser kontroly se našla skutečná chyba: produktový zdroj dotazu používal
neexistující `updated_at`. Dotaz byl opraven na reálný `created_at` a dostal
regresní test.

## Vzdálený stav

Vzdálený `db push --dry-run` ukázal pouze:

- `20260906062331_team_leader_exception_queue.sql`

Následný push aplikoval právě tuto migraci bez seedů, změn rolí a Vault secrets.
Migration history je po nasazení srovnaná 81/81.

Vzdálené pgTAP soubory nešlo spustit celé, protože omezený CLI testovací login
nemá zápis do interních schémat `auth` a `private`. Proto byl proveden skutečný
Auth smoke test přes aplikační role:

- dočasný Team Leader tabulku přečetl a source guard odmítl neexistující výjimku,
- operátor neviděl manažerské řádky a jeho mutation byla odmítnuta,
- dočasný Team Leader účet i membership byly po testu odstraněny.

Vzdálené advisories nadále ukazují pouze dříve známé obecné položky: pgTAP v
`public`, starší zamýšlená privilegovaná RPC a vypnutou leaked-password ochranu.
Nová Exception Queue nepřidala vlastní advisor nález.

## Závěr

- Team Leader Exception Queue: **lokálně i v linked sandboxu ověřeno**
- Role a workspace hranice: **ověřeno testy, browser průchodem a linked Auth smoke testem**
- Linked sandbox: **migration history 81/81, smoke test prošel**
- Telnyx: **beze změny, záměrně odloženo kvůli externímu ověření čísla**
- Další priorita: **server-side osobní preference uživatelů**
