# P0.2 — privileged RPC a `pgtap`

**Datum:** 7. 9. 2026

**Stav:** lokální implementace připravená; linked nasazení a read-back čekají

## Rozsah

Linked Security Advisor označil pět veřejných `SECURITY DEFINER` RPC dostupných
roli `authenticated` a extension `pgtap` umístěnou v exponovaném schématu
`public`:

- `add_wallet_bonus_rule(uuid,text,numeric,numeric,date)`,
- `add_wallet_manual_adjustment(uuid,uuid,numeric,text)`,
- `complete_call_with_order_items_idempotent(uuid,uuid,uuid,integer,text,text,text,jsonb,timestamptz,text,text)`,
- `complete_lead_call_with_order_items_idempotent(uuid,uuid,uuid,integer,text,text,text,jsonb,timestamptz,text,text)`,
- `update_wallet_settings(uuid,text,numeric)`.

Dva informační nálezy k tabulkám s RLS bez policy a Auth upozornění na
leaked-password protection patří do samostatných bodů P0 a tato změna je neřeší.
Do linked databáze se při přípravě tohoto řešení nezapisovalo.

## Zjištěný kontrakt

Katalogový read-back linked prostředí potvrdil, že všech pět funkcí vlastnil
`postgres`, běželo jako `SECURITY DEFINER`, mělo `search_path` nastavený na
`public, private, pg_temp` a oprávnění pouze pro `postgres`, `authenticated` a
`service_role`. Těla už ověřovala `auth.uid()`, členství, workspace a příslušnou
roli; call-completion funkce navíc svazovaly session, frontu a idempotentní klíč
s přihlášeným operátorem.

Riziko tedy nebylo odstraněno vymazáním kontrol ani rozšířením grantů. Stabilní
veřejné RPC signatury zůstávají zachované jako `SECURITY INVOKER` SQL wrappery s
prázdným `search_path`. Původní privilegované implementace se přesouvají do
neexponovaného schématu `private`, rovněž s prázdným `search_path`, a mají
explicitní minimální grant pouze pro `authenticated` a `service_role`.

## `pgtap`

Samostatná idempotentní migrace vytvoří neexponované schéma `extensions` a
přesune do něj `pgtap`, pokud je extension instalovaná v `public`. Pokud na nové
lokální databázi ještě instalovaná není, migrace bezpečně nic neudělá. Neočekávané
jiné schéma nebo nepřemístitelná instalace skončí chybou, aby migrace netajila
odlišný stav cíle.

Lokálně byl před migrací nasimulován linked stav instalací `pgtap` do `public`.
Advisor reprodukoval původní warning; migrace poté zachovala verzi `1.3.3`,
přesunula extension do `extensions` a warning zmizel.

## Důkazy

Testy byly nejprve spuštěny proti původnímu schématu. Bez migrace selhaly přesně
kontroly nové hranice: veřejné invoker funkce, privátní definer implementace,
jejich explicitní granty a prázdný veřejný `search_path`.

Po migracích pokrývají databázové testy:

- security režim, umístění, `search_path` a granty všech pěti funkcí,
- zákaz vykonání pro `PUBLIC` a `anon`,
- povolené wallet operace administrátora a Team Leadera ve vlastním workspace,
- zákaz wallet operací operátorovi a administrátorovi z jiného workspace,
- zákaz dokončit cizí queued i direct call session,
- úspěšné dokončení vlastního queued i direct callu a read-back uloženého hovoru.

Čistý lokální reset aplikoval obě nové migrace od nuly. Následná kompletní pgTAP
sada prošla **183/183** testy. Lokální Security Advisor na úrovni `info` ponechal
jen dva známé nálezy `rls_enabled_no_policy`, které nejsou součástí P0.2; pět
function warningů ani `pgtap` v `public` už nehlásil. Aplikační sada prošla
**351/351** testy v 89 souborech; zelený je také lint, TypeScript typecheck a
produkční build.

## Uzavírací podmínka

P0.2 se označí za dokončené až po review a sloučení změny, bezpečné aplikaci obou
migrací do linked sandboxu a novém linked read-backu:

1. migration history obsahuje obě nové migrace,
2. veřejné signatury zůstávají dostupné jako `SECURITY INVOKER`, privátní těla
   jako `SECURITY DEFINER` s očekávanými ACL a prázdným `search_path`,
3. `pgtap` je v `extensions`, nikoli v `public`,
4. linked Security Advisor už nehlásí těchto šest původních příčin.

Teprve potom pokračuje pořadí P0.3 — bezpečný privileged runner pro vzdálené
databázové důkazy.
