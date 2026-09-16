# Team Assistance — browser verification

Datum: 16. 9. 2026

## Rozsah

Ověření proběhlo pouze proti lokální aplikaci napojené na Sandbox
`lpvypihpxhyjljikfzqo`. Production nebyla použita ani změněna.

## Ověřeno

- lokální server běžel na `http://localhost:3000`,
- testovací operátor se přihlásil do Operator Console,
- testovací Team Leader se přihlásil do Team Workspace,
- Team Workspace zobrazil otevřenou žádost v části `Co vyžaduje pozornost`,
- operátor viděl `Request Help` i `SOS` už před zahájením hovoru u aktivně
  přiřazeného leadu,
- žádost z přímého kliknutí operátora na `Request Help` během vytáčení zobrazila
  operátora, tým `P1` a čekací dobu,
- dříve byla stejným způsobem ověřena také urgentní varianta `SOS` včetně
  poznámky,
- Team Leader žádost převzal; stav se změnil na `Převzato` a zobrazilo se
  jméno přebírajícího Team Leadera,
- Team Leader žádost uzavřel; zobrazil se prázdný stav a počet otevřených
  žádostí klesl na nulu,
- panel Daily Checkpoint současně zobrazil týmové objednávky, callbacky a
  tabulku výsledků operátorů.

## Omezení testu

Simulovaný hovor se po krátkém vytáčení stále ukončil a aplikace správně
přešla do stavu obnovy přerušeného hovoru. Přesto se v krátkém okně vytáčení
podařilo přímo kliknout na `Request Help`; v Sandboxu vznikla žádost typu
`help` s jednou auditní událostí. Nebyl vytvořen falešný dokončený hovor.

## Výsledek

Celý asistenční tok `Request Help → open → claimed → resolved` prošel
autentizovaným browser smoke testem. Operátor může žádost odeslat před hovorem
i během vytáčení; samostatně prošla také urgentní varianta `SOS`. Zůstává pouze
technické omezení simulovaného telefonního zvuku, které neblokuje samotnou
asistenční funkci, ale zaslouží si další opravu nebo jasnější režim simulace bez
mikrofonu.
