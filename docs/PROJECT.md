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

- P0.3 linked kontrola se spouští příkazem `npm run verify:linked-security` (skript `scripts/p0-3-remote-db-evidence.mjs`). Vyžaduje `P0_3_LINKED_PROJECT_REF` a `SUPABASE_ACCESS_TOKEN`, nastavené bezpečně mimo Git. Použij pouze samostatný token omezený na jeden sandbox s oprávněními `Database: Read` a `Data API Config: Read`; runner odmítá `SUPABASE_SECRET_KEY` i `SUPABASE_SERVICE_ROLE_KEY` a další klíče typu service-role. Před během znovu ověř sandboxový project ref; kontrolu nikdy nesměruj na produkci. Výsledek dokládá pouze konkrétní read-only kontrolu katalogu a konfigurace PostgREST. Není to produkční readiness test ani důkaz pro živou telefonii nebo zápis. Lokální pgTAP není důkaz linked sandboxu. Runner lze spustit mimo Docker nebo v Dockeru; token předávej pouze při běhu.
- **Produkce:** `https://velocity.majkito.com`. **Test:** `https://dev.majkito.com`. Produkci nepoužívej k testování.
- Testovací Supabase projekt `countdown-crm-sandbox-20260824`, ref `lpvypihpxhyjljikfzqo`: snímek z 25. 11. 2026 ukázal `Site URL` `http://localhost:3000`, žádné povolené návratové adresy a vypnuté vlastní SMTP. Hlavička dashboardu označovala větev `main` štítkem `PRODUCTION`; nejde však o níže uvedený produkční CRM projekt, který má jiný název i ref. Nastavení nebyla změněna. Před zápisem znovu ověř cíl a používej syntetická data. Lokální Supabase, linked sandbox a produkce jsou tři různé cíle.
- Oddělený produkční Supabase projekt `countdown-crm`, ref `qlzrsookyobtvyekhrqi`: snímek z 25. 11. 2026 ukázal `Site URL` `https://velocity-crm-majkito.vercel.app/` a 11 povolených návratových adres. Slouží pouze k identifikaci produkce; nepoužívej ho pro testování. Nastavení nebyla změněna.
- `supabase/config.toml` a starší databázové slugy mohou záměrně obsahovat `countdown`; jde o technické identifikátory, nikoli o název produktu. Nepřejmenovávej je bez samostatného ověření dopadu.
- Tajné hodnoty nepatří do Git, dokumentace, logů ani výstupu; pro P0.3 platí omezení tokenu uvedené výše.
- Před vzdálenou změnou migrací nejdřív ověř cíl a použij `npx supabase db push --linked --dry-run`. Samotný dry-run nic nenasazuje. Zápis do prostředí, pozvánky a nasazení vyžadují výslovný pokyn. Produkční telefonie, Telnyx a zákaznické hovory jsou odložené.
- Poslední kontrola Vercelu před pushnutím této větve 25. 11. 2026 ukazovala `dev.majkito.com` připnuté na `codex/velocity-crm-rebrand`; tato větev tehdy vlastní nasazení neměla. Stav nasazení po pushi nebyl ověřen. Produkci nepoužívej k testování.

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

- V cloudové pracovní kopii založené na commitu `025673256163d0bf0d21cfa249e19a2527d639f3` prošly na Node.js `v24.22.3` čistá instalace `npm ci`, `npm audit`, `npm audit --omit=dev` a `npm run verify:all`. Registry npm byla dostupná; po cílených overridech `uuid` a zranitelných větví `minimatch` audity hlásily nula zranitelností. `verify:all` zahrnoval lint, TypeScript, 1 168 testů ve 227 souborech a produkční build.
- Po synchronizaci prošlo stejné ověření i v místní složce na Node.js `v26.12.0`: `npm ci`, oba audity (nula zranitelností), `npm ls uuid minimatch` a `npm run verify:all` (lint, TypeScript, 1 168 testů ve 227 souborech a produkční build).
- Tři testovací soubory pozvánek prošly: 25 testů. Samostatný lokální Mailpit zachytil syntetickou zprávu na doméně `.test`; kontejner byl poté zastaven a odstraněn. To neověřuje doručení přes Supabase Auth.
- Lokální Supabase stack se nepodařilo spustit: stahování obrazů narazilo na limit registru a Docker hlásil nedostatek místa při rozbalování. Konfigurace obou vzdálených projektů byla pouze přečtena; Auth URL ani SMTP se neměnily a žádná pozvánka ven neodešla.
- Praktická matice tří rolí prošla kontrolou 29 adres včetně hranic mezi týmy. Místní pgTAP prošel 326 testy v 18 souborech. Přímý pgTAP běh v linked sandboxu se nespustil, protože tam není dostupné rozšíření pgTAP.
- Syntetický operátor po ručním přiřazení zahájil místní SIP hovor s interní linkou 1002. To neověřuje Telnyx, veřejnou telefonní síť ani fyzickou slyšitelnost.
- Obnova hovoru přešla do formuláře nové objednávky; prohlížeč zobrazil výchozí zemi `CZ`. Objednávka nebyla odeslána.

Tyto výsledky se týkají uvedených kontrol a data. Nedokládají stav pozdějšího nasazení ani neprovedené scénáře.

## Otevřená práce

1. **Pozvánky:** sandbox `lpvypihpxhyjljikfzqo` měl `Site URL` `http://localhost:3000`, žádné povolené návratové adresy a vypnutý vlastní SMTP. Produkční projekt `qlzrsookyobtvyekhrqi` má `Site URL` `https://velocity-crm-majkito.vercel.app/`; nepoužívej ho k testování. Stabilní URL nasazení této větve není potvrzená. Mailpit zachytil pouze syntetickou zprávu; lokální Supabase Auth se kvůli chybě při stahování a rozbalování Docker obrazů nespustil. Pozvánka přes aplikaci ani sandbox odeslána nebyla.
2. **Historický audit:** read-only dotaz našel sedm záznamů telefonie. Známé přímé přepnutí sandboxu na `simulation` nemá auditní záznam; úplnost starší historie nelze potvrdit ani zpětně rekonstruovat.
3. **Přístupnost:** zbývá skutečná čtečka obrazovky, zvětšení na 200 % a úplná kontrola klávesnicí. Klávesnicová editace, uložení a publikace syntetického skriptu už byly ověřeny.
4. **Call Logs a exporty:** dokončit kontrolu chybějících a nedostupných hodnot. Call Logs zobrazuje částky v CZK; před změnou datového modelu rozhodnout, zda je třeba měnu ukládat pro každý hovor.
5. **Měsíční uzávěrka:** výpočet a odpočet vratek byly ověřeny na syntetických datech, ale trvalé vytvoření účetního záznamu po uzavření měsíce ověřeno nebylo.
6. **Testovací větev:** ověřit, zda push vytvořil bezpečné preview pro tuto větev; `dev.majkito.com` podle poslední kontroly ukazoval jinou větev. Teprve poté rozhodnout o testu pozvánek.

Nejprve uzavři ověřovací a provozní body 1–3 a 6 výše. Až potom začni samostatný vizuální refaktor: znovu posuď typografii a číslice, barevnou paletu, informační hierarchii a vybrané komponenty. Při kontrole doručení, opakovaných událostí a vratek používej pouze syntetická data.
