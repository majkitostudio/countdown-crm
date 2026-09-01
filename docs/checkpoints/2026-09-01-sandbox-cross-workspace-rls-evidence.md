# Checkpoint — Sandbox cross-workspace RLS evidence, 1. 9. 2026

## Rozsah

Tento checkpoint zaznamenává přímý RLS průchod proti schválenému Supabase
Sandboxu `lpvypihpxhyjljikfzqo`. Nemění aplikační kód, migrace, produkční
databázi ani deployment.

Test použil existující Sandbox identitu s rolí `operator`. Druhý, cizí
workspace a jeho řádky vznikly pouze uvnitř rollbackované transakce. Fixture
se připravil privilegovaně, ale všechny evidence dotazy a zápisy následně
běžely jako `authenticated` s JWT `sub` této existující identity.

## Pozitivní a negativní RLS evidence

- `auth.uid()` byl přítomný a operátor viděl právě jeden vlastní workspace;
  rollbackový cizí workspace viditelný nebyl (`1` / `0`).
- Vlastní membershipy byly čitelné (`5`), cizí membershipy ne (`0`).
- Vlastní objednávka operátora byla čitelná (`1`), cizí objednávka ne (`0`).
- Vlastní call byl čitelný (`1`) a jeho `UPDATE ... RETURNING` vrátil jeden
  řádek; cizí call byl neviditelný (`0`) a jeho update vrátil prázdný set.
- Update cizí objednávky rovněž vrátil prázdný set.
- RPC `create_order_with_items` proti cizímu workspace a leadu skončilo
  očekávanou chybou `Order lead is not available in the active workspace`.

Tento průchod je přímý Sandbox RLS důkaz row-level izolace pro skutečnou
existující identitu operátora, nikoli browser smoke ani důkaz vydání nové
uživatelské relace.

## Cleanup a hranice

Po každém úspěšném běhu následoval `ROLLBACK`; RPC běh skončil očekávanou
výjimkou a jeho transakce se také necommitla. Následný SQL read-back potvrdil
0 dočasných workspace, orders, calls i leads. Sandbox zůstal na 1 workspace a
5 membershipech.

Záměrně nebyly měněny produkční ref `qlzrsookyobtvyekhrqi`, žádné migrace,
ani dřívější záměrně ponechaná Sandbox testovací objednávka. Tento checkpoint
neprokazuje browserový průchod jiného uživatele, telephony ani produkční RLS.

## Ověření dokumentačního slice

- přímé Sandbox SQL read/write/RPC RLS evidence a oddělený cleanup read-back;
- explicitní Git diff, `git diff --check` a kontrola odkazů v registru;
- žádné aplikační testy se znovu nespouštěly, protože commit mění pouze
  dokumentaci; tyto testy by samy o sobě nebyly RLS důkazem.
