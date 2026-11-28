# Velocity CRM — projektový průvodce

Tento dokument je jediným zdrojem aktuálních informací o produktu, prostředích, ověřeném stavu a otevřené práci. Stav níže byl naposledy ověřen 27. 11. 2026; starší revizní deníky a návrhy jsou odstraněné.

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
- Testovací Supabase projekt `countdown-crm-sandbox-20260824`, ref `lpvypihpxhyjljikfzqo`: ověřeno 27. 11. 2026, `Site URL` je alias preview `https://velocity-crm-git-codex-countdown-qa-branch-workflow-majkito.vercel.app`, povolená návratová adresa je pouze její cesta `/auth/invite` a vlastní SMTP má nakonfigurovaná přihlašovací pole. Hlavička dashboardu stále označuje větev `main` štítkem `PRODUCTION`; cílem je ovšem sandbox s výše uvedeným ref, nikoli oddělený produkční CRM projekt. Před každým zápisem znovu ověř ref. Lokální Supabase, linked sandbox a produkce jsou tři různé cíle.
- Oddělený produkční Supabase projekt `countdown-crm`, ref `qlzrsookyobtvyekhrqi`: snímek z 25. 11. 2026 ukázal `Site URL` `https://velocity-crm-majkito.vercel.app/` a 11 povolených návratových adres. Slouží pouze k identifikaci produkce; nepoužívej ho pro testování. Nastavení nebyla změněna.
- `supabase/config.toml` a starší databázové slugy mohou záměrně obsahovat `countdown`; jde o technické identifikátory, nikoli o název produktu. Nepřejmenovávej je bez samostatného ověření dopadu.
- Tajné hodnoty nepatří do Git, dokumentace, logů ani výstupu; pro P0.3 platí omezení tokenu uvedené výše.
- Před vzdálenou změnou migrací nejdřív ověř cíl a použij `npx supabase db push --linked --dry-run`. Samotný dry-run nic nenasazuje. Zápis do prostředí, pozvánky a nasazení vyžadují výslovný pokyn. Produkční telefonie, Telnyx a zákaznické hovory jsou odložené.
- Ověření Vercelu 27. 11. 2026: commit `6ca4883` je nasazený ve stavu `READY`; alias větve je `https://velocity-crm-git-codex-countdown-qa-branch-workflow-majkito.vercel.app`. Preview používá sandbox ref `lpvypihpxhyjljikfzqo`, ne produkční ref `qlzrsookyobtvyekhrqi`. `dev.majkito.com` zůstává navázané na jinou větev. Produkci nepoužívej k testování.

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

Kontroly provedené 25.–27. 11. 2026 na větvi `codex/countdown-qa-branch-workflow`:

- V cloudové pracovní kopii založené na commitu `025673256163d0bf0d21cfa249e19a2527d639f3` prošly na Node.js `v24.22.3` čistá instalace `npm ci`, `npm audit`, `npm audit --omit=dev` a `npm run verify:all`. Registry npm byla dostupná; po cílených overridech `uuid` a zranitelných větví `minimatch` audity hlásily nula zranitelností. `verify:all` zahrnoval lint, TypeScript, 1 168 testů ve 227 souborech a produkční build.
- Po synchronizaci prošlo stejné ověření i v místní složce na Node.js `v26.12.0`: `npm ci`, oba audity (nula zranitelností), `npm ls uuid minimatch` a `npm run verify:all` (lint, TypeScript, 1 168 testů ve 227 souborech a produkční build).
- Tři testovací soubory pozvánek prošly: 25 testů. Samostatný lokální Mailpit zachytil syntetickou zprávu na doméně `.test`; kontejner byl poté zastaven a odstraněn. To neověřuje doručení přes Supabase Auth.
- Dne 26. 11. se podařilo spustit lokální CRM proti místnímu Supabase Auth a Inbucketu. Přihlášení syntetického administrátora prošlo. První pozvánka na `.test` mezitím vypršela; nová pozvánka byla přijata v oddělené nepřihlášené relaci a nastavení hesla přihlásilo testovacího operátora do `/console`. Tím je ověřena lokální cesta od formuláře přes zachycený e-mail až po přijetí pozvánky a heslo. Konzole následně zobrazila chybu načtení dat pracovního prostoru; její běžné pracovní funkce proto ověřené nejsou. Oba syntetické účty byly odstraněny z místního Auth a obě místní zprávy s jednorázovými odkazy smazány. Žádná zpráva neopustila místní prostředí. To nedokládá doručení ze vzdáleného sandboxu.
- Dne 27. 11. bylo v sandboxu ověřeno vlastní SMTP, `Site URL` a allowlist omezený na `/auth/invite` aliasu preview. Resend označil dřívější testovací pozvánku jako doručenou; Auth sandbox zaznamenal její potvrzení a přihlášení. Při navazujícím testu dorazily do dočasné schránky další dvě syntetické pozvánky. Jedna byla přijata v lokální aplikaci připojené k sandboxu, druhá přímo na preview po odhlášení již přihlášeného operátora; nastavení hesla dokončilo přihlášení. Auth potvrdil e-mail a poslední přihlášení, databáze přiřazení role `operator` a nulový počet peněženkových transakcí. Oba účty vytvořené v tomto navazujícím testu byly poté odstraněny ze sandboxu; zprávy i dočasná schránka byly smazány. Formulář pro pozvání byl spuštěn lokálně, protože Vercel Preview nemá administrátorský klíč pro Supabase Auth.
- Praktická matice tří rolí prošla kontrolou 29 adres včetně hranic mezi týmy. Místní pgTAP prošel 326 testy v 18 souborech. Přímý pgTAP běh v linked sandboxu se nespustil, protože tam není dostupné rozšíření pgTAP.
- Syntetický operátor po ručním přiřazení zahájil místní SIP hovor s interní linkou 1002. To neověřuje Telnyx, veřejnou telefonní síť ani fyzickou slyšitelnost.
- Obnova hovoru přešla do formuláře nové objednávky; prohlížeč zobrazil výchozí zemi `CZ`. Objednávka nebyla odeslána.
- Kontrola historického auditu sandboxu (read-only, 27. 11. 2026) je uzavřená s limitem: sedm záznamů `SETTINGS_CHANGE` pro telefonní adaptér uvádí `local_sip`; aktuální řádek nastavení je také `local_sip`, naposledy změněný 22. 11. Přímý záznam přepnutí na `simulation` chybí. Aplikace však vrací `simulation`, pokud řádek nastavení chybí, a tabulka nemá vlastní auditní trigger. Starší stav proto nelze rekonstruovat ani určit, zda šlo o výchozí hodnotu, nebo přímou změnu.
- Přístupnost (místní aplikace, 27. 11. 2026): v Edge bylo na `/login` i `/auth/forgot-password` skutečně nastaveno zvětšení stránky na 200 %. Oba formuláře se přeskupily do jednoho sloupce; při průchodu klávesou Tab se zobrazily pole, tlačítka a odkazy s viditelným fokusem a stránka posunula další ovládací prvek do záběru. Na přihlášení byla ověřena cesta pracovní e-mail → heslo → přihlášení → obnova; na obnově e-mail → odesílací tlačítko → návrat na přihlášení. Přístupnostní strom zpřístupnil nadpisy, popisek pole, tlačítka a odkazy. Enter na prázdném přihlášení zobrazil nativní hlášku „Vyplňte prosím toto pole.“; formulář nebyl odeslán. Skutečné hlasové čtení se ověřit nepodařilo: Narrator zobrazil uvítací obrazovku, která uvádí zkratku Windows+Ctrl+Enter ke spuštění čtečky, ale hlasový výstup nebylo možné potvrdit dostupným ovládáním. Přihlášená CRM zůstala nepřístupná, protože toto místní spuštění míří na vzdálenou Supabase konfiguraci a místní Supabase kontejnery neběžely; vzdálené přihlášení ani žádný zápis nebyly provedeny.

Tyto výsledky se týkají uvedených kontrol a data. Nedokládají stav pozdějšího nasazení ani neprovedené scénáře.

## Otevřená práce

1. **Přístupnost:** místní `/login` a `/auth/forgot-password` prošly kontrolou klávesnice při 200% zvětšení: obsah se přeskupil do jednoho sloupce, fokus byl viditelný a důležité ovladače šlo projít. Skutečná mluvená čtečka nebyla ověřena a úplná kontrola klávesnicí přihlášené CRM zůstává otevřená, protože v této relaci nebyla dostupná místní autentizace. Klávesnicová editace, uložení a publikace syntetického skriptu už byly ověřeny.
2. **Měsíční uzávěrka:** výpočet a odpočet vratek byly ověřeny na syntetických datech, ale trvalé vytvoření účetního záznamu po uzavření měsíce ověřeno nebylo.
3. **Call Logs a exporty:** dokončit kontrolu chybějících a nedostupných hodnot. Call Logs zobrazuje částky v CZK; před změnou datového modelu rozhodnout, zda je třeba měnu ukládat pro každý hovor.

Nejprve uzavři zbývající ověřovací a provozní body 1–3 výše. Až potom začni samostatný vizuální refaktor: znovu posuď typografii a číslice, barevnou paletu, informační hierarchii a vybrané komponenty. Při kontrole doručení, opakovaných událostí a vratek používej pouze syntetická data.
