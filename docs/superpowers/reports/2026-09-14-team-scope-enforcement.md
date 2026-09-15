# Team scope enforcement — Sandbox

Datum: 2026-09-14

## Cíl

Zapnout skutečné oddělení práce podle týmů P1/P2/P3 tak, aby se Team Leader
nemohl dostat k cizím leadům nebo frontě a aby operátor nemohl převzít práci
jiného týmu. Administrátor zůstává workspace-wide.

## Provedené změny

- `20260914124110_team_scope_enforcement`
  - aktivní tým operátora je povinný pro claim/current lead,
  - claim vybírá pouze položky se stejným `team_id`,
  - start a heartbeat kontrolují shodu operátora a týmu,
  - release, reopen a reassign respektují týmový scope,
  - reassign přijme pouze aktivního operátora ze stejného týmu,
  - queue eventy nově ukládají týmový snapshot,
  - přímé změny queue položky odmítnou přiřazení operátora z jiného týmu,
  - operátor bez týmu dostane srozumitelnou chybu.
- `20260914124233_team_scope_policy_cleanup`
  - odstranila starou historickou policy, která znovu odemykala celou frontu
    Team Leaderům napříč workspace,
  - zachovala operátorovi pouze čtení vlastní presence.
- `20260914124659_team_scope_policy_consolidation`
  - sloučila manažerské a vlastní operátorské SELECT pravidlo do jedné policy,
    takže nová týmová vrstva nepřidává Supabase performance warning.
- Serverová vrstva filtruje seznam operátorů Team Leadera pouze na jeho aktivní
  týmy.
- Vytvoření leadu Team Leaderem automaticky použije jeho jediný aktivní tým;
  při více týmech systém raději odmítne nejednoznačné vytvoření.

## Skutečný Sandbox read-back

Workspace: `9015a0bf-bb9e-4900-bb3b-b769c4c71f0b`

- P1 Team Leader (`mikestudio@email.cz`): 5 leadů, 5 queue položek.
- P2 Team Leader (`mikestudio+amalka@email.cz`): 0 leadů, 0 queue položek,
  0 presence cizích operátorů.
- Administrator: 8 leadů, 5 queue položek.
- P1 operátor v transakční zkoušce nedostal testovací queue položku P2.
- Operátor bez týmu dostal chybu:
  `Operator is not assigned to an active team; contact an Administrator`.
- Transakční testovací data byla po ověření vrácena rollbackem.
- Production nebyla změněna.

## Co ještě není hotové

Tato vlna neřeší historický `team_id` snapshot při vytvoření hovorů a objednávek.
Neřeší také týmové analytiky, callbacks z přímých call záznamů ani kompletní
Team Leader dashboard. Tyto části zůstávají oddělené další kroky, aby se
nepřisoudila stará data týmu zpětně bez důkazu.

## Repo kontrola

- cílené týmové testy: 14/14 prošlo,
- celá aplikační sada: 128 souborů, 585 testů prošlo,
- `npm run lint`: prošlo,
- `npm run typecheck`: prošlo,
- `npm run build`: prošlo.
- Supabase performance advisor: nový warning o více permissive policies byl
  odstraněn; zůstávají pouze starší/nesouvisející nálezy a očekávané unused indexy
  v malém Sandboxu.
