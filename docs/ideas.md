# AI-Native Call Center CRM — Banka Nápadů a Inovací (Ideas & Backlog)

Tento dokument obsahuje seznam inovativních nápadů, rozšiřujících funkcí a technologických gadgetů, které posunou CRM systém výrazně před konkurenty na trhu.

---

## 🌟 1. Unikátní AI Funkce pro Operátory

### 🎙️ Live Voice Sentiment Heatmap (Náladoměr)
* **Koncept**: Vizuální ukazatel na obrazovce operátora, který v reálném čase měří sentiment zákazníka (např. *Zvědavý 🟢 -> Nejistý 🟡 -> Frustrovaný 🔴*).
* **Přínos**: Operátor hned vidí, kdy ztratil pozornost zákazníka a že musí změnit tón nebo přejít k jiné nabídce.

### 🛡️ Automated Regulatory Compliance Checker (Zákonný hlídač)
* **Koncept**: AI hlídá legislativní omezení při prodeji (např. zákazy uvádění lékopisných tvrzení u doplňků stravy, schválené záruční podmínky u elektra nebo kosmetické deklarace).
* **Přínos**: Pokud operátor řekne větu v rozporu s legislativou, AI ho jemně upozorní (*"Pozor: u tohoto doplňku stravy nesmíme garantovat vyléčení"*), čímž chráním firmu před pokutami.

### 🤖 AI Voice Roleplay Simulator pro nováčky
* **Koncept**: Režim trenažéru, kde nově nastupující operátor volá "virtuálnímu zákazníkovi" poháněnému AI (např. *Předstírej cholerického zákazníka, který odmítá drahé elektro*).
* **Přínos**: Zkrácení doby zaškolení nových operátorů ze 14 dnů na 2 dny bez rizika ztráty reálných zákazníků.

---

## 🛒 2. Inovace v Cross-Sellu a E-Commerce

### 📦 Cross-Category Dynamic Bundling (Chytré balíčky napříč nikami)
* **Koncept**: AI vytváří neobvyklé, ale vysoce konverzní kombinace produktů napříč kategoriemi na základě profilu zákazníka:
  - *Příklad*: Zákaznice kupující kosmetický krém proti vráskám dostane nabídku na hydrolyzovaný kolagen (doplněk stravy) a sonický masážní přístroj na obličej (elektro) za zvýhodněnou cenu balíčku.
* **Přínos**: Zvýšení průměrné hodnoty objednávky (AOV) o 30–50 %.

### ⏰ Predictive Re-order Engine (Předpověď spotřeby)
* **Koncept**: Algoritmus automaticky vypočítá, kdy zákazníkovi dojde zakoupené balení doplňků stravy (např. po 60 dnech) nebo kosmetiky a naplánuje opakovací hovor do fronty operátora přesně 7 dní předem.
* **Přínos**: Maximální retenční prodej a stálý příjem bez nutnosti drahé reklamy.

---

## 🏆 3. Gamifikace a Motivace Týmu

### 🎮 Gamified Leaderboard & Live Achievements
* **Koncept**: Operátoři vidí na obrazovce své denní plnění cílů formou dynamických achievementů (např. *„Hat-trick: 3 úspěšné obcházení námitek za sebou!“*, *„Cross-sell Master“*).
* **Přínos**: Zvýšení motivace a zdravé soutěživosti v týmu call centra.

---

## 🔌 4. Možnosti Budoucí Integrace (Post-MVP)

1. **Integrace reálné VoIP ústředny**: Napojení na Zadarma, Twilio nebo Asterisk (SIP WebRTC).
2. **WhatsApp & SMS Channel**: Možnost odeslat zákazníkovi odkaz na produkt přes WhatsApp přímo během hovoru.
3. **Platební brána přes SMS (Pay-by-Link)**: Odeslání platebního odkazu přes Stripe/GOPAY přímo během hovoru pro okamžitou úhradu karty.

---

## 🧭 Operator Console — návrhy z review 25. 8. 2026

Tyto body jsou zatím pouze To‑Do návrhy z průchodu Operator Console. Nejsou
schválením implementace ani změnou aktuálního call/outcome workflow.

- [ ] **Vymyslet užitečnější blok „Pilot suggestion“** — místo obecné věty
  nabídnout kontextovou další akci podle fáze hovoru, produktu a posledního
  výsledku. Pokud není uložený skript, zobrazit to otevřeně jako fallback.
- [ ] **Nahradit ikonku Product Scriptu** — vybrat ikonu, která lépe říká
  „schválený prodejní skript“ nebo „scénář hovoru“.
- [ ] **Zobrazit poslední úpravu skriptu** — u skriptu uvést datum poslední
  uložené změny a případně autora; údaj musí pocházet z uložené verze.
- [ ] **Ujasnit stav skriptu** — ověřit, zda má být při chybě nebo chybějícím
  skriptu stav `Failed`, `Unavailable`, nebo jiný pravdivý stav. Neměnit
  `Ready` jen vizuálně bez změny významu.
- [ ] **Doplnit zdroj leada** — místo obecného „Source unavailable“ zobrazit,
  odkud lead přišel, například kampaň, reklamu nebo formulář, pokud je tento
  údaj skutečně uložený.
- [ ] **Zvětšit prostor pro Lead Timeline** — upravit výšku nebo rozložení
  pravého panelu tak, aby timeline lépe navazovala na výšku Current Lead.
- [ ] **Zvětšit prostor pro Lead Notes** — dát poznámkám přibližně o třetinu
  více vertikálního prostoru bez zhoršení použitelnosti na menších displejích.
