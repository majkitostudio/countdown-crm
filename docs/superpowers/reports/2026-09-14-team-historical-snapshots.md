# P2 — ověření historických týmových snapshotů

**Datum:** 14. 9. 2026
**Prostředí:** Supabase Sandbox `countdown-crm-sandbox-20260824`
**Production:** beze změny

## Cíl

Nový hovor nebo objednávka si má zapamatovat tým, který za něj odpovídal v okamžiku vzniku. Pozdější přesun leadu nebo operátora nesmí přepsat historický údaj. Starší záznamy zůstávají bez týmu, pokud z jejich historie nelze tým bezpečně zjistit.

## Provedené změny

- `calls.team_id` a `orders.team_id` se při vložení automaticky doplní podle leadu.
- Post-call dokončení používá výslovně tým queue položky pro hovor i objednávku.
- Přímé zápisy operátora ověřují tým přes úzkou serverovou kontrolu, aniž by operátor dostal širší přístup k leadům.
- Historický `team_id` nelze později změnit.
- Přímý klientský pokus vložit cizí tým je odmítnut RLS/databázovým pravidlem.
- Není proveden žádný zpětný odhad týmu u starých hovorů a objednávek.

## Migrace

- `20260914143010_team_historical_snapshots`
- `20260914143426_team_snapshot_policy_visibility`

## Ověření

Lokální kontrola:

- nový kontraktní test historických snapshotů: 6 testů prošlo,
- navazující post-call a team-scope testy: 16 testů prošlo,
- `npm run typecheck`: prošlo,
- `npm run lint`: prošlo.

Sandbox read-back:

1. Triggery pro doplnění snapshotu existují na `calls` a `orders`.
2. Triggery pro zákaz změny snapshotu existují na `calls` a `orders`.
3. Vložený testovací call bez zadaného týmu dostal P1 podle leadu.
4. Vložená testovací objednávka bez zadaného týmu dostala P1 podle leadu.
5. Oba testovací zápisy byly provedeny v transakci a vráceny zpět.
6. Autentizovaný P1 operátor dokázal vytvořit call a Sandbox vrátil P1 snapshot.
7. Pokus stejného operátora vložit leadu tým P2 byl odmítnut RLS.
8. Pokus změnit historický tým existujícího callu byl odmítnut databázovým triggerem.
9. `Production` nebyl použit ani změněn.

## Co ještě není důkazem dokončení celé P2

- Nebyl proveden autentizovaný browser smoke jako Team Leader po této migraci, protože k dispozici není samostatná přihlášená Team Leader session.
- Idempotence je stále krytá existujícími post-call testy, ale samostatný linked concurrency test pro nové týmové snapshoty zůstává otevřený.
- Historické snapshoty jsou připravené pro další krok: týmově omezené Analytics, callbacks, exceptions, Daily Brief a `/team` pracovní plochu.
