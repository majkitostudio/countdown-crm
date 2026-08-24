# Cross-workspace izolace — ověření sandboxu

**Datum:** 24. 8. 2026
**Projekt:** schválený Supabase sandbox `lpvypihpxhyjljikfzqo`
**Typ:** dočasný read/write test s úplným cleanupem

## Co bylo ověřeno

V jedné testovací sadě vznikl dočasný druhý workspace s jedním leadem,
produktem, objednávkou a hovorem. Fixture byl vytvořen pouze kvůli testu a po
ověření odstraněn.

Při simulaci přihlášeného administrátora z hlavního workspace platilo:

- vlastní workspace: 4 leady, 3 produkty, 9 objednávek a 17 hovorů,
- dočasný druhý workspace: 0 leadů, 0 produktů, 0 objednávek a 0 hovorů.

Přihlášený uživatel bez membershipu viděl 0 záznamů v obou workspaces.
Anonymní role dostala při čtení leadů očekávané `permission denied` (`42501`).

## Cleanup

Po testu SQL kontrola vrátila nulový počet pro dočasný workspace, lead,
produkt, objednávku i hovor. V sandboxu po testu nezůstal žádný fixture a
migration history se neměnila.

## Závěr

Na úrovni serverového workspace/RLS guardu je nyní doloženo, že člen hlavního
workspace nevidí data druhého workspace. To uzavírá negativní cross-workspace
test pro hlavní administrátorskou relaci a uživatele bez membershipu.

Samostatně stále platí, že UI smoke pro operátora a rozhodnutí k některým
Supabase advisor upozorněním jsou oddělené důkazy; tento test je nenahrazuje.
