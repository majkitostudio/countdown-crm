# Pracovní postup pro změny

Toto je krátká týmová dohoda pro vývoj Countdown CRM. Nejde o skrytý příkaz pro Codex a nenahrazuje konkrétní zadání.

## 1. Vymezení změny

Před implementací napiš:

- co se mění a proč,
- co do změny nepatří,
- kterých rolí, workspace hranic a dat se dotýká,
- jak poznáme, že je změna hotová.

Nový tab nebo stránka musí řešit konkrétní operátorský či administrátorský problém. Samotné rozšíření počtu funkcí není důvodem ke změně.

## 2. Implementace

- zachovej workspace scope a existující serverové guardy,
- kritické mutace veď přes serverovou datovou vrstvu nebo RPC,
- migraci odděl od UI změny, pokud to není nezbytné,
- tajné údaje drž pouze v serverovém environmentu,
- simulace a externí integrace označ pravdivě,
- u nové logiky nejdřív popiš nebo otestuj kontrakt chování.

## 3. Ověření

Minimum pro běžnou změnu:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

U UI změny ověř hlavní flow v browseru. U persistence ověř po reloadu skutečný záznam. U oprávnění ověř povolenou roli, nepovolenou roli a cizí workspace. U migrace ověř cílové schéma, RLS a migration history.

## 4. Předání

Před commitem zkontroluj diff, nezahrnuté lokální soubory a tajné hodnoty. Commit pojmenuj podle jedné tematické změny. Po pushi uveď, co bylo ověřeno a co zůstává blockerem.

## 5. Co tento postup neříká

Neurčuje povinný počet kroků, zákaz práce na konkrétní větvi ani automatické pořadí všech budoucích funkcí. Aktuální pořadí práce je pouze v [AKTUALNI_STAV_A_DESATERO.md](AKTUALNI_STAV_A_DESATERO.md).
