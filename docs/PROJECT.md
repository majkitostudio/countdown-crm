# Velocity CRM — projektový průvodce

Tento dokument je jediným zdrojem aktuálních informací o produktu, prostředích, ověřeném stavu a otevřené práci. Stav níže byl naposledy ověřen 25. 11. 2026; starší revizní deníky a návrhy jsou odstraněné.

## Produkt a role

Velocity CRM podporuje call centrum prodávající doplňky stravy. Operator Console je hlavní pracovní plocha operátora, nikoli celý produkt.

- **Workspace** odděluje data, uživatele a nastavení jedné firmy.
- **Administrátor** spravuje celý Workspace. **Team Leader** vede svůj tým. **Operátor** pracuje se svou přiřazenou frontou.
- Oddělení P1–P4 se odvozuje z týmu; není samostatnou databázovou entitou. Tým sdružuje operátory pod Team Leaderem.
- **P1** je prioritní práce pro zkušené operátory. **P2** je běžná odchozí práce. **P3** vrací zákazníka do péče 21 dní po doručení. **P4** řeší jen vybrané neúspěchy, vratky určené k opětovnému odeslání a zásilky na výdejně déle než tři dny bez hovoru.
- Ne každý neúspěšný hovor se vrací do fronty. Opakovaný nákup posuzuje operátor; automatické založení další objednávky není schválené.
- Lead bez potvrzeného týmu je čekající záznam pro administrátora, ne chyba. Databázový trigger vytvoří frontovou položku při vložení leadu; externí příjem přes API/webhook tím není zaveden.

Rozhraní musí odpovídat skutečnému stavu: nesmí předstírat uložený výsledek, dostupnost integrace ani oprávnění. Chyby pro uživatele piš česky. Produkty, nabídky a zdroje leadů zůstávají konfigurovatelné, ne natvrdo zapsané v kódu. AI může pomáhat s kontextem, tréninkem a kvalitou, ale nerozhoduje o hovoru, objednávce ani přístupech.

## Prostředí a bezpečnost

- P0.3 linked kontrola se spouští příkazem `npm run verify:linked-security` (skript `scripts/p0-3-remote-db-evidence.mjs`). Vyžaduje `P0_3_LINKED_PROJECT_REF` a `SUPABASE_ACCESS_TOKEN`, nastavené bezpečně mimo Git. Použij pouze samostatný token omezený na jeden sandbox s oprávněními `Database: Read` a `Data API Config: Read`; runner odmítá `SUPABASE_SECRET_KEY` i `SUPABASE_SERVICE_ROLE_KEY`. Před během znovu ověř sandboxový project ref; kontrolu nikdy nesměruj na produkci. Výsledek dokládá pouze konkrétní read-only kontrolu katalogu a konfigurace PostgREST.
- **Produkce:** `https://velocity.majkito.com`. **Test:** `https://dev.majkito.com`. Produkci nepoužívej k testování.
- Testovací Supabase sandbox ověřený 25. 11. 2026: `lpvypihpxhyjljikfzqo`. Používej syntetická data a před zápisem znovu ověř cíl. Lokální Supabase, linked sandbox a produkce jsou tři různé cíle.
- `supabase/config.toml` a starší databázové slugy mohou záměrně obsahovat `countdown`; jde o technické identifikátory, nikoli o název produktu. Nepřejmenovávej je bez samostatného ověření dopadu.
- Tajné hodnoty nepatří do Git, dokumentace, logů ani výstupu; pro P0.3 platí omezení tokenu uvedené výše.
- Před vzdálenou změnou migrací nejdřív ověř cíl a použij `npx supabase db push --linked --dry-run`. Samotný dry-run nic nenasazuje. Zápis do prostředí, pozvánky a nasazení vyžadují výslovný pokyn. Produkční telefonie, Telnyx a zákaznické hovory jsou odložené.
- Vercel 25. 11. 2026 ukazoval `dev.majkito.com` připnuté na `codex/velocity-crm-rebrand`; větev `codex/countdown-qa-branch-workflow` neměla vlastní nasazení. Žádné testování této větve na `dev` ani změna produkce z toho nevyplývá.

## Lokální vývoj a kontroly

Projekt vyžaduje Node.js `^22.22.2`, `^24.15.0` nebo `>=26.0.0`.

```powershell
npm ci
npm run dev
npm run verify:all
```

`npm run verify:all` spouští lint, kontrolu typů, testy a produkční build. Místní databázi spouštěj pouze pro testy, které ji potřebují (`npx supabase start`); její testy nejsou důkazem stavu sandboxu ani produkce.

- `npm run verify:migrations` kontroluje soubory migrací.
- `npm run verify:parity` kontroluje místní paritu. Pro linked sandbox použij výslovně `node scripts/verify-migration-parity.mjs --linked`; předem ověř správný projekt.
- `npm run seed:catalog` generuje lokální `supabase/seed.sql` z `data/seeds/catalog-seed-template.json`; samo nic nevkládá do vzdálené databáze.
- `npm run verify:linked-security` provádí omezenou read-only kontrolu linked sandboxu; potřebuje proměnné P0.3 popsané v runneru. Nikdy ji nesměruj na produkci.

## Aktuálně ověřeno

Kontroly provedené 25. 11. 2026 na větvi `codex/countdown-qa-branch-workflow`:

- `npm run verify:all` prošel: lint, TypeScript, 1 168 testů ve 227 souborech a produkční build.
- Praktická matice tří rolí prošla kontrolou 29 adres včetně hranic mezi týmy. Místní pgTAP prošel 326 testy v 18 souborech. Přímý pgTAP běh v linked sandboxu se nespustil, protože tam není dostupné rozšíření pgTAP.
- Syntetický operátor po ručním přiřazení zahájil místní SIP hovor s interní linkou 1002. To neověřuje Telnyx, veřejnou telefonní síť ani fyzickou slyšitelnost.
- Obnova hovoru přešla do formuláře nové objednávky; prohlížeč zobrazil výchozí zemi `CZ`. Objednávka nebyla odeslána.

Tyto výsledky se týkají uvedených kontrol a data. Nedokládají stav pozdějšího nasazení ani neprovedené scénáře.

## Otevřená práce

1. **Závislosti:** `npm audit` i produkční audit selhaly na DNS přístupu k registru npm. Kandidátní změny `uuid` a `minimatch` z druhého worktree nebyly ověřeny celou testovací sadou ani přeneseny. Aktuální zranitelnosti proto nejsou ověřené.
2. **Pozvánky:** sandbox měl `Site URL` `http://localhost:3000`, prázdné povolené návratové adresy a vypnutý vlastní SMTP. Pozvánka v sandboxu nebyla odeslána. Před tímto testem je nutné určit stabilní testovací URL a bezpečné doručení.
3. **Historický audit:** read-only dotaz našel sedm záznamů telefonie. Známé přímé přepnutí sandboxu na `simulation` nemá auditní záznam; úplnost starší historie nelze potvrdit ani zpětně rekonstruovat.
4. **Přístupnost:** zbývá skutečná čtečka obrazovky, zvětšení na 200 % a úplná kontrola klávesnicí. Klávesnicová editace, uložení a publikace syntetického skriptu už byly ověřeny.
5. **Call Logs a exporty:** dokončit kontrolu chybějících a nedostupných hodnot. Call Logs zobrazuje částky v CZK; před změnou datového modelu rozhodnout, zda je třeba měnu ukládat pro každý hovor.
6. **Měsíční uzávěrka:** výpočet a odpočet vratek byly ověřeny na syntetických datech, ale trvalé vytvoření účetního záznamu po uzavření měsíce ověřeno nebylo.
7. **Testovací větev:** rozhodnout, zda a jak bezpečně ověřit tuto větev na `dev.majkito.com`. Zatím se tam nenasazuje.

Nejprve uzavři ověřovací a provozní body 1–4 výše. Až potom začni samostatný vizuální refaktor: znovu posuď typografii a číslice, barevnou paletu, informační hierarchii a vybrané komponenty. Při kontrole doručení, opakovaných událostí a vratek používej pouze syntetická data.
