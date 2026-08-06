"use client";

export interface GenerateFollowupParams {
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  productName?: string;
  callOutcome: string;
  channel: "email" | "whatsapp";
  goal: "order_paylink" | "discount_offer" | "callback_reminder" | "graceful_thanks";
  appliedPitch?: string;
}

export interface GenerateFollowupResult {
  success: boolean;
  subject?: string;
  content: string;
  paylinkUrl?: string;
}

export async function generateFollowupAction(
  params: GenerateFollowupParams
): Promise<GenerateFollowupResult> {
  const { leadName, productName, channel, goal, appliedPitch } = params;
  const paylinkUrl = `https://pay.countdowncrm.com/pl_${Math.floor(1000 + Math.random() * 9000)}`;

  let subject = "";
  let content = "";

  if (channel === "email") {
    switch (goal) {
      case "order_paylink":
        subject = `Potvrzení objednávky ${productName || "vašeho balíčku"} — Countdown CRM`;
        content = `Dobrý den, ${leadName},\n\nděkujeme za příjemný rozhovor! Na základě naší dohody Vám zasíláme shrnutí a odkaz pro 1-klikové dokončení objednávky ${productName ? `špičkového produktu ${productName}` : "vybraného balíčku"}.\n\n👉 Odkaz pro platbu a dokončení: ${paylinkUrl}\n\n${appliedPitch ? `Poznámka k objednávce: ${appliedPitch}\n\n` : ""}V případě jakýchkoliv dotazů nás neváhejte kontaktovat.\n\nS pozdravem,\nJan Dvořák • Countdown CRM Team`;
        break;

      case "discount_offer":
        subject = `Exkluzivní VIP sleva 15 % na ${productName || "váš nákup"}`;
        content = `Dobrý den, ${leadName},\n\nnavazuji na náš hovor. Chápeme, že zvažujete rozpočet, a proto jsme Vám schválili speciální jednorázovou VIP slevu 15 % na balíček ${productName || "produkce"}.\n\n👉 Aktivovat slevu a objednat: ${paylinkUrl}\n\nSleva je platná následujících 48 hodin.\n\nS pozdravem,\nJan Dvořák • Countdown CRM`;
        break;

      case "callback_reminder":
        subject = `Potvrzení naplánovaného hovoru — Countdown CRM`;
        content = `Dobrý den, ${leadName},\n\npotvrzujeme naplánovaný hovor podle naší domluvy. Těšíme se na další rozhovor!\n\nPokud byste potřebovali termín změnit, stačí odpovědět na tento e-mail.\n\nS pozdravem,\nJan Dvořák • Countdown CRM`;
        break;

      case "graceful_thanks":
      default:
        subject = `Děkujeme za Váš čas — Countdown CRM`;
        content = `Dobrý den, ${leadName},\n\nděkujeme za Váš čas během dnešního hovoru. Pokud byste v budoucnu potřebovali poradit s výběrem nebo informacemi o našich produktech, jsme Vám plně k dispozici.\n\nPřejeme krásný den,\nJan Dvořák • Countdown CRM`;
        break;
    }
  } else {
    // WhatsApp / SMS format
    switch (goal) {
      case "order_paylink":
        content = `Dobrý den ${leadName}, děkuji za hovor! Posílám Vám slíbený odkaz na objednávku ${productName || "balíčku"}: ${paylinkUrl} Přeji pěkný den! Jan Dvořák, Countdown CRM`;
        break;

      case "discount_offer":
        content = `Dobrý den ${leadName}, posílám Vám speciální VIP slevu 15 % na ${productName || "vybraný balíček"}. Dokončit slevovou objednávku můžete zde: ${paylinkUrl} Platí 48h! Jan Dvořák`;
        break;

      case "callback_reminder":
        content = `Zdravím ${leadName}, děkuji za domluvu hovoru! V kalendáři mám zapsanou naši schůzku. V případě potřeby změny mi dejte vědět. Jan Dvořák`;
        break;

      case "graceful_thanks":
      default:
        content = `Dobrý den ${leadName}, děkuji za dnešní rozhovor a Váš čas. Přeji hezký zbytek dne! Jan Dvořák, Countdown CRM`;
        break;
    }
  }

  return {
    success: true,
    subject: channel === "email" ? subject : undefined,
    content,
    paylinkUrl,
  };
}
