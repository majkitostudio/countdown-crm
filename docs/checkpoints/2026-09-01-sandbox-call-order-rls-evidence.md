# Checkpoint — Sandbox call, order a RLS evidence, 1. 9. 2026

## Rozsah

Tento checkpoint zachycuje autentizovaný průchod lokálního runtime proti
schválenému Supabase Sandboxu `lpvypihpxhyjljikfzqo`. Nemění aplikační kód,
migrace, produkční databázi ani deployment.

## Připravenost Sandboxu

- Lokální `.env.local` míří na `lpvypihpxhyjljikfzqo.supabase.co`.
- `supabase migration list --linked --project-ref lpvypihpxhyjljikfzqo`
  potvrdil shodnou lokální a vzdálenou historii včetně call/order, RLS a
  Wallet migrací.
- `supabase db push --dry-run --linked --project-ref
  lpvypihpxhyjljikfzqo --skip-vault` vrátil `upToDate: true`; žádná migrace
  ani seed se neaplikovaly.

## Browser a persistence důkaz

- Autentizovaný Administrator vstoupil do lokálního `/workspace` a relace
  přežila reload.
- Call start se pravdivě vrátil do stavu `Audio session could not be
  initialized`; počet callů v Sandboxu zůstal 18. To není důkaz živé
  telephony ani dokončeného call/outcome průchodu.
- Po explicitním potvrzení vznikla jedna Sandbox testovací objednávka
  `2ea63bf2-44b1-4948-84b1-14c57173a428`: jeden item, `CZK 1800.00`, zdroj
  `previous_call`, stav `in_progress`.
- Reload detailu objednávky znovu zobrazil item, částku, zdroj a historii.
- Read-only SQL porovnal počty před/po: `orders` 11 → 12, `order_items` 5 →
  6 a `audit_logs` 17 → 18. Přímý read-back potvrdil jeden item a shodné
  `total_amount` / `items_total` `1800.00`.

Testovací objednávka zůstává záměrně v Sandboxu. Odstranění vyžaduje samostatné
potvrzení; tento checkpoint neprovádí cleanup.

## Negativní RLS důkaz

V rollbackované transakci se `SET LOCAL ROLE authenticated` bez JWT vrátilo
na 0 viditelných řádků v `leads`, `calls` i `orders`. To je živý negativní
test chybějící identity proti Sandboxu.

Cross-workspace isolation a role-by-role runtime denial tím prokázané nejsou:
Sandbox obsahuje jediný workspace. Tento checkpoint proto není prohlášením o
úplné pilotní ani produkční připravenosti.

## Hranice produkce

Produkční ref `qlzrsookyobtvyekhrqi` zůstává oddělený a bez změny dat. Jeho
starší RPC/schema nesmí být pro Sandbox evidence zaměněno.

## Ověření dokumentačního slice

- explicitní Git diff a `git diff --check`;
- kontrola relativních Markdown odkazů v tomto checkpointu a registru;
- žádné aplikační testy se znovu nespouštěly, protože tento commit mění pouze
  dokumentaci a jejich starší výsledky nejsou novým browser/RLS důkazem.
