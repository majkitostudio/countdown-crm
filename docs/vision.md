# [Historická vize] AI-Native Call Center CRM — Vize a Architektura Projektu

> Tato vize je inspirační podklad z dřívější fáze. Popisuje plánovaný live AI,
> telephony a realtime provoz; není to popis aktuálního runtime. Pro dnešní
> architekturu použij [`architecture.md`](architecture.md).

## 1. Souhrn Vize (Executive Summary)

**Countdown CRM** je moderní, AI-native CRM systém vytvořený na míru pro výkonnostní call centra prodávající široké spektrum produktů — od doplňků stravy přes kosmetiku až po elektrospotřebiče.

Na rozdíl od tradičních CRM systémů, které fungují pouze jako pasivní databáze kontaktů, funguje Countdown CRM jako **aktivní kopilot operátora v reálném čase**. Umělá inteligence naslouchá hovoru, vyhodnocuje námitky zákazníka, dynamicky upravuje prodejní scénář a doporučuje okamžitý cross-sell/up-sell.

Projekt je navržen tak, aby v prototypové fázi dosahoval **nulových provozních nákladů (0 Kč / měsíc)** díky využití bezplatných limitů (free-tier) cloudových služeb a moderních browser API.

---

## 2. Klíčové Zásady Systému (Core Principles)

1. **Zero-Latency Operator Experience**: Operátor nesmí čekat na načítání stránek. Všechny informace o zákazníkovi, historii a produktech musí být dostupné okamžitě (pod 100 ms).
2. **AI v Reálném Čase (Live AI Copilot)**: AI nepomáhá až po hovoru, ale přímo během komunikace se zákazníkem — nabízí argumenty na obcházení námitek.
3. **Multi-Product Flexibility**: Systém jednoduše zvládá specifika různých produktových kategorií (dávkování u doplňků stravy, odstíny a typy pleti u kosmetiky, záruky a technické parametry u elektra).
4. **Zero-Cost Foundation**: Architektura stvořená tak, aby prototyp běžel bez potřeby platit měsíční paušály za servery, databáze či telefonní ústředny.

---

## 3. Uživatelské Role a Jejich Práce v CRM

### A. Operátor Call Centra
* **Pult operátora (Workspace)**: Integrovaný softphone / simulátor hovorů, přepis řeči na text v reálném čase.
* **Objection Handling Engine**: Při detekci věty zákazníka typu *"Je to moc drahé"* se okamžitě zobrazí 3 prověřené prodejní argumenty navržené AI.
* **Rychlé vytvoření objednávky**: Předvyplněný košík na základě rozhovoru, výběr akčních balíčků jedním klikem.

### B. Team Leader
* **Živý monitoring**: Přehled o probíhajících hovorech, aktuálním sentimentu zákazníků a vytížení operátorů.
* **A/B Testování scénářů**: Možnost porovnávat úspěšnost AI scénářů a argumentů mezi jednotlivými týmy.
* **Analytika prodejů**: Přehled tržeb podle kategorií produktů, úspěšnosti cross-sellu a stornovosti.

### C. Administrator
* **Správa katalogu produktů**: Zadávání produktů, tvorba prodejních argumentů, nastavení křížového prodeje.
* **Import & Skórování leadů**: Nahrávání databází kontaktů (CSV/Excel) a jejich automatické AI skórování.

---

## 4. Architektura a Hosting (Kde co běží za 0 Kč)

| Komponenta | Vybrané Řešení | Měsíční Náklady | Popis a Funkce |
| :--- | :--- | :--- | :--- |
| **Frontend & API** | **Vercel (Hobby Plan)** | **0 Kč** | Hosting pro Next.js 14/15 app router. Globální CDN, automatické SSL, bezplatný CI/CD deploy z GitHubu. |
| **Databáze & Auth** | **Supabase Cloud (Free Tier)** | **0 Kč** | PostgreSQL databáze (500 MB zdarma), Autentizace uživatelů (50 000 MAU zdarma), Supabase Realtime pro živé přenosy stavů. |
| **AI LLM Engine** | **Google Gemini 2.0 / 1.5 Flash** | **0 Kč** | Google AI Studio poskytuje bezplatný limit (až 15 RPM) s extrémní rychlostí odezvy a 1M+ tokenovým kontextovým oknem. |
| **Speech-to-Text (STT)** | **Web Speech API / Browser AI** | **0 Kč** | Využití nativního rozpoznávání hlasu v prohlížeči (Google Chrome Engine) bez platby za external STT API. |
| **Simulátor Hovoru** | **Nativní WebRTC / Audio Engine** | **0 Kč** | Vlastní simulátor příchozích a odchozích hovorů přímo na frontendu pro potřeby prototypování a testování. |

---

## 5. Datové Entity (Základní Schéma)

1. **Users / Operators**: Profil operátora, role, statistiky.
2. **Leads / Customers**: Kontaktní údaje, nákupní historie, AI skóre nákupního potenciálu, preference.
3. **Products**: Název, kategorie (doplňky, kosmetika, elektro), specifikace, skladovost, akční ceny.
4. **Objections & Pitch Templates**: Databáze námitek a nejlepších prodejních argumentů propojených s produkty.
5. **Calls & Transcripts**: Záznamy o hovorech, kompletní přepisy, sentiment, sumarizace, výsledný stav (Uzavřeno, Odmítnuto, Zavolat později).
6. **Orders**: Vytvořené objednávky, položky košíku, stav doručení.
