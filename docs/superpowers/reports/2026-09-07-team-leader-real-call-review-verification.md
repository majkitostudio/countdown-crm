# Ověření Team Leader Review reálného hovoru

- **Datum:** 7. 9. 2026
- **Větev:** sloučeno do `main` přes PR #76
- **Výchozí commit:** `34be446`
- **Lokální migrační soubor:** `supabase/migrations/20260906223213_team_leader_real_call_review.sql`

## Co je ověřeno

- Review je dostupný pouze rolím `team_leader` a `administrator`.
- Review čte konkrétní uložený call, outcome, fail reason, operátorskou poznámku,
  zdroj hovoru a transcript bez rekonstrukce chybějících dat.
- Budoucí call se zobrazeným snapshotem ukazuje přesnou publikovanou verzi skriptu
  (lokální fixture: verze 7, `Verified Joint Support`).
- Starý call bez vazby ukazuje `Script version was not recorded for this call` a
  legacy plain transcript; systém nehádá historickou verzi skriptu.
- Call bez transcriptu ukazuje `Transcript unavailable` a nic nedoplňuje.
- Dokončení review vytvořilo revizi 1. Oprava vytvořila revizi 2 s důvodem;
  revize 1 zůstala viditelná v timeline.
- Audit zobrazil události `Call review completed` a `Call review corrected` a po
  rozbalení přesný previous/new verdict, coaching, reviewer ID a correction reason.
- Operátor nemá review link v Call Logs; při přímé URL dostane bezpečnou stránku
  s informací, že oblast je pouze pro Team Leaders a Administrators.
- Manažer v Call Logs vidí stav `Not reviewed`, `Reviewed` nebo `Corrected`, může
  filtrovat `Unreviewed`, vidí počet čekajících review a otevře přesný review
  přímo z řádku; návrat z review zachová filtr a po vyprázdnění fronty se zobrazí
  pravdivý prázdný stav. Operátor stav, filtr ani odkaz nevidí.
- Exception Queue neodkazuje na review, pokud nemá prokazatelnou vazbu
  `queue item → telephony session → completed_call_id`.
- AI nevytváří verdict ani revizi; formulář je označen jako lidské rozhodnutí.
- Vizuální pass Call Logs a workspace ponechává barvu u Call Outcome a důležitých
  provozních stavů, zatímco běžné kontextové karty, profily, review affordance a
  nadpisy Product Scriptu používají neutrální nebo výrazně ztlumené zacházení.
- Team Leader Daily Brief zobrazuje počet nehodnocených hovorů s odkazem na
  `/calls?review=unreviewed`; při nedostupnosti review fronty zůstává stav
  `Unavailable` a nepředstírá nulu.

## Lokální autentizovaný browser smoke

Použité lokální účty (vytvořené pouze pro tento ephemeral test):

- `review-team-leader@example.test` — Team Leader
- `review-admin@example.test` — Administrator
- `review-operator@example.test` — Operator

Ověřené fixture calls:

| Call | Scénář | Výsledek |
| --- | --- | --- |
| `50000000-0000-4000-8000-000000000002` | strukturovaný transcript, přesný snapshot publikované verze 7 | Team Leader vytvořil revizi 1 a opravil ji na revizi 2; audit read-back prošel |
| `50000000-0000-4000-8000-000000000001` | starý plain transcript bez telephony/session vazby | zobrazeno „verze nebyla zaznamenána“, bez domýšlení skriptu |
| `50000000-0000-4000-8000-000000000003` | administrátorský průchod, transcript unavailable, built-in fallback snapshot | Administrator vytvořil revizi 1 |

Browser smoke proběhl proti `http://localhost:3000` po lokálním `supabase db reset`.
Testovací data ani účty nejsou součástí repozitáře; po resetu lokální databáze zmizí.

## Automatizované ověření

Po poslední změně permission boundary proběhl celý checklist znovu:

- `npm test`: 88 souborů / 345 testů prošlo
- `npm run lint`: exit 0
- `npm run typecheck`: exit 0
- `npm run build`: exit 0; route `/calls/[callId]/review` je v buildu
- `git diff --check`: bez chyb
- `npx supabase db reset`: exit 0; lokální migrace aplikované
- `npx supabase test db`: 8 souborů / 154 testů prošlo
- `npx supabase db advisors --local --type all --level warn --fail-on error`: `No issues found`

## Vzdálený sandbox

Po sloučení PR #76 byl potvrzen dříve zdokumentovaný sandbox `lpv…zqo`.
`npx supabase migration list --linked` ukázal jedinou lokální migraci bez
vzdáleného protějšku a `npx supabase db push --linked --dry-run` plánoval pouze
`20260906223213_team_leader_real_call_review.sql`, bez seedů a rolí. Po lokálním
replay a průchodu 154/154 databázových testů byla migrace aplikována. Následná
historie je 84/84 a opakovaný dry-run je prázdný.

Autentizovaný smoke test v sandboxu ověřil:

- Team Leader vytvořil revizi 1 a administrátor opravu jako revizi 2;
- Team Leader načetl obě revize;
- operátor a anonymní klient review data nenačetli ani nezapsali;
- Team Leader nezapsal review hovoru z cizího workspace;
- přímý `UPDATE` hotové revize byl odmítnut;
- vznikly dvě odpovídající auditní události s before/new detaily.

Dočasné workspaces, leady, calls, revize, auditní řádky, memberships a Auth účty
byly po ověření odstraněny. Přímý Data API přístup nového `sb_secret` klíče k
tabulce `workspaces` je kvůli chybějícímu `service_role` grantu odmítnut; fixture
setup proto použil privilegované CLI databázové spojení. Tento stav potvrzuje
existující To-Do pro privilegovaný vzdálený test runner, ale neovlivňuje ověřené
aplikační role.

Linked advisors skončily bez `ERROR`. Zůstává sedm starších `WARN`: `pgtap` v
`public`, pět existujících `SECURITY DEFINER` RPC dostupných roli `authenticated`
a vypnutá kontrola uniklých hesel. Nová call-review funkce je `SECURITY INVOKER`
a mezi nálezy není.

## Co zůstává mimo tento důkaz

- živý Telnyx hovor, veřejný webhook, nahrávání a externí transcription,
- Gemini návrh míst k pozornosti. Budoucí AI může pouze navrhnout pozornost;
  verdikt a auditní revizi musí stále vydat člověk.
