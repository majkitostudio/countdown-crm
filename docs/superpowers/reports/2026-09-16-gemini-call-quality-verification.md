# Ověření AI kontroly kvality poznámek

**Datum:** 16. 9. 2026  
**Prostředí:** Sandbox `countdown-crm-sandbox-20260824` (`lpvypihpxhyjljikfzqo`)  
**Production:** beze změny  
**Účel:** ověřit skutečné serverové napojení Gemini bez použití osobních údajů

## Výsledek

Ověření prošlo.

- API klíč z lokálního `.env.local` nebyl vypsán ani uložen do repozitáře.
- Gemini odpověděl přes aktuální model `gemini-3.6-flash`.
- Anonymizovaný hovor nejprve vytvořil záznam AI kontroly ve stavu `pending`.
- První worker získal atomický claim.
- Druhý souběžný claim byl odmítnut, takže stejný záznam nemůže být zpracován dvakrát současně.
- Gemini vrátil strukturovaný výsledek `ok` s důvěrou `0,95`.
- Výsledek se uložil jako serverové doporučení; hovor ani objednávka se nezměnily.
- Testovací hovor a jeho AI záznam byly po ověření odstraněny.

Po cleanupu Sandbox obsahoval původních 25 hovorů a 0 záznamů v `call_quality_reviews`.

## Opravy zjištěné při ověření

Google již pro nový klíč nepřijal původní výchozí model `gemini-2.5-flash`. Výchozí model byl proto změněn na `gemini-3.6-flash` v:

- `src/lib/ai/geminiCallQuality.ts`
- `src/lib/dal/callQualityReviews.ts`

Novější model používá část limitu na interní zpracování. Limit odpovědi byl proto zvýšen z 600 na 1200 tokenů, aby se krátký JSON výsledek nekrátil.

Serverový runtime klíč potřeboval v Sandboxu pouze čtecí přístup k tabulce `calls`. Tento přístup byl přidán migrací:

- `supabase/migrations/20260916170000_grant_service_role_call_quality_source_access.sql`

Migrace dává serverové roli pouze `SELECT`; nemění práva běžných uživatelů a nepovoluje serverové roli měnit nebo mazat hovory.

## Repo kontroly

- `npm test`: 140 souborů, 642 testů
- `npm run lint`: prošlo
- `npm run typecheck`: prošlo
- `npm run build`: prošlo
- diagnostika upravených AI souborů: bez chyb a varování

Varování o `after()` při ručním testu mimo webový požadavek je očekávané. Produkční cesta je navržená tak, že `pending` vznikne okamžitě a vlastní AI zpracování probíhá po odeslání odpovědi.

## Co tento důkaz nepotvrzuje

- Production migrace ani Production Gemini konfigurace nebyly změněny.
- Nebyl proveden autentizovaný browser smoke Team Leadera v rámci tohoto konkrétního AI testu.
- AI je doporučení pro Team Leadera, nikoli automatický verdikt nad operátorem.
- Audio nahrávání, transcription a živá telefonie zůstávají samostatné pozdější úkoly.
