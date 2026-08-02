/**
 * Industry Blueprints — Registry of Presets
 *
 * Pre-configured CRM templates tailored for specific business domains.
 */

import { IndustryBlueprint } from "./types";

export const INDUSTRY_BLUEPRINTS: IndustryBlueprint[] = [
  {
    id: "tele_sales",
    name: "Tele-Sales & Call Center",
    tagline: "High-speed outbound calling with live AI rebuttal cards",
    description:
      "Využijte sílu AI pro maximální konverzi odchozích hovorů. Obsahuje živé zpracování námitek, automatické AI shrnutí rozhovorů a dynamické skórování nákupního záměru.",
    icon: "PhoneCall",
    color: "amber",
    targetAudience: "Call centra, telesales týmy, aktivní telemarketing",
    customAttributes: [
      {
        id: "attr-ts-script-stage",
        key: "script_stage",
        name: "Fáze skriptu",
        type: "select",
        options: [
          { label: "Úvod & Pozdrav", value: "intro", color: "zinc" },
          { label: "Argumentace hodnoty", value: "value_prop", color: "cyan" },
          { label: "Řešení námitek", value: "objections", color: "amber" },
          { label: "Uzavření (Closing)", value: "closing", color: "emerald" },
        ],
      },
      {
        id: "attr-ts-callback-pref",
        key: "callback_preference",
        name: "Preferovaný čas hovoru",
        type: "text",
        defaultValue: "Odpoledne (14:00 - 17:00)",
      },
      {
        id: "attr-ts-call-attempts",
        key: "call_attempts_count",
        name: "Počet pokusů volání",
        type: "number",
        defaultValue: 1,
      },
      {
        id: "attr-ts-ai-objection-summary",
        key: "ai_objection_summary",
        name: "AI Analýza námitek",
        type: "ai_generated",
        aiConfig: {
          promptTemplate: "Identifikuj hlavní námitku zákazníka z transkriptu.",
          contextSources: ["transcript"],
          refreshTrigger: "on_call_end",
        },
      },
    ],
    defaultWorkflowRules: [
      {
        name: "AI Summary po úspešném hovoru",
        description: "Po dokončení hovoru s výsledkem 'order_placed' vygeneruje AI shrnutí a posune status na Customer.",
        enabled: true,
        trigger: "on_call_ended",
        conditions: [
          { field: "outcome", operator: "equals", value: "order_placed" },
        ],
        actions: [
          { type: "compute_ai_summary", config: {} },
          { type: "update_lead_status", config: { target_status: "customer" } },
        ],
      },
      {
        name: "Notifikace manažera u velké objednávky",
        description: "Automatické upozornění manažerovi při prodeji nad 1 000 Kč.",
        enabled: true,
        trigger: "on_order_placed",
        conditions: [
          { field: "orderValue", operator: "greater_than", value: "1000" },
        ],
        actions: [
          {
            type: "notify_manager",
            config: {
              message: "🎉 Významný prodej: {{lead_name}} zakoupil za {{order_value}} Kč!",
            },
          },
        ],
      },
    ],
    keyMetrics: [
      { label: "Call-to-Order Conversion", description: "% dokončených hovorů vedoucích k objednávce" },
      { label: "Average Call Duration", description: "Průměrná délka hovoru v sekundách" },
      { label: "AI Objection Resolution Rate", description: "% úspěšně vyřešených námitek zákazníků" },
    ],
    aiCapabilities: [
      "Gemini 2.5 Flash live transcription & objection battle-cards",
      "Automatické Lead Scoring s váhou firemního e-mailu a telefonu",
      "Real-time legal compliance monitor (Zákonný hlídač)",
    ],
  },
  {
    id: "b2b_saas",
    name: "B2B SaaS Sales Pipeline",
    tagline: "Account-based selling, ARR deals & automated demo follow-ups",
    description:
      "Šablona navržená pro B2B obchody s dlouhým prodejním cyklem. Sleduje roční hodnotu obchodu (ARR), rozhodovatele ve firmě, technologický stack a automatické připomínky vypršení trialu.",
    icon: "Building2",
    color: "cyan",
    targetAudience: "B2B SaaS startupy, IT konzultační firmy, enterprise obchodníci",
    customAttributes: [
      {
        id: "attr-b2b-arr",
        key: "annual_recurring_revenue",
        name: "ARR / Potenciál ($)",
        type: "number",
        defaultValue: 12000,
      },
      {
        id: "attr-b2b-decision-maker",
        key: "decision_maker_role",
        name: "Role rozhodovatele",
        type: "select",
        options: [
          { label: "CEO / Managing Director", value: "ceo", color: "emerald" },
          { label: "CTO / Head of Engineering", value: "cto", color: "cyan" },
          { label: "VP of Sales", value: "vp_sales", color: "amber" },
          { label: "Product Manager", value: "pm", color: "zinc" },
        ],
      },
      {
        id: "attr-b2b-tech-stack",
        key: "client_tech_stack",
        name: "Současný Tech Stack",
        type: "text",
        defaultValue: "HubSpot, React, Node.js",
      },
      {
        id: "attr-b2b-ai-painpoint",
        key: "ai_business_painpoint",
        name: "AI Analýza problémů (Pain-points)",
        type: "ai_generated",
        aiConfig: {
          promptTemplate: "Sumarizuj hlavní provozní problémy firmy na základě zápisu ze schůzky.",
          contextSources: ["lead_notes", "company_info"],
          refreshTrigger: "on_record_update",
        },
      },
    ],
    defaultWorkflowRules: [
      {
        name: "Lead Qualified → Posun do Demo stádia",
        description: "Při posunu leada do stádia Qualified se automaticky naplánuje demo follow-up.",
        enabled: true,
        trigger: "on_lead_status_changed",
        conditions: [
          { field: "newStatus", operator: "equals", value: "qualified" },
        ],
        actions: [
          {
            type: "send_email_followup",
            config: { template: "followup_call" },
          },
          {
            type: "notify_manager",
            config: {
              message: "💼 B2B Lead {{lead_name}} byl kvalifikován pro Demo!",
            },
          },
        ],
      },
    ],
    keyMetrics: [
      { label: "ARR Pipeline Total", description: "Celková roční hodnota rozjednaných B2B příležitostí" },
      { label: "Demo Booking Rate", description: "Procento kontaktů s dojednanou prezentací" },
      { label: "Average Deal Size", description: "Průměrná hodnota uzavřeného kontraktu" },
    ],
    aiCapabilities: [
      "B2B Pain-point extraction z firemních zápisů",
      "Propensity to Buy scoring podle velikosti podniku a rolí",
      "Automatizovaný follow-up e-mail generátor",
    ],
  },
  {
    id: "ecommerce_cs",
    name: "E-Commerce Customer Success",
    tagline: "Retention, LTV tracking & automated re-engagement workflows",
    description:
      "Kompletní balíček pro e-shopy a D2C značky. Zaměřuje se na opakované nákupy, hodnotu zákazníka (LTV), segmentaci rizika odchodu (Churn Risk) a automatickou péči po nákupu.",
    icon: "ShoppingBag",
    color: "emerald",
    targetAudience: "E-shopy, D2C předplatitelské služby, e-commerce podpůrné týmy",
    customAttributes: [
      {
        id: "attr-eco-ltv",
        key: "lifetime_value",
        name: "Customer LTV ($)",
        type: "number",
        defaultValue: 450,
      },
      {
        id: "attr-eco-churn-risk",
        key: "churn_risk_level",
        name: "Riziko odchodu (Churn Risk)",
        type: "select",
        options: [
          { label: "Nízké (Lojální)", value: "low", color: "emerald" },
          { label: "Střední", value: "medium", color: "amber" },
          { label: "Vysoké (Ohrožen)", value: "high", color: "rose" },
        ],
      },
      {
        id: "attr-eco-pref-category",
        key: "favorite_product_category",
        name: "Oblíbená kategorie",
        type: "text",
        defaultValue: "Supplements & Bio-Boost",
      },
      {
        id: "attr-eco-ai-recommender",
        key: "ai_next_product_recommendation",
        name: "AI Doporučený produkt pro Cross-sell",
        type: "ai_generated",
        aiConfig: {
          promptTemplate: "Doporuč další nejvhodnější produkt pro cross-sell na základě nákupní historie.",
          contextSources: ["purchase_history"],
          refreshTrigger: "on_record_update",
        },
      },
    ],
    defaultWorkflowRules: [
      {
        name: "Vysoká hodnota objednávky → VIP Notifikace",
        description: "Po vytvoření objednávky nad 2 000 Kč okamžitě upozorní zákaznickou péči.",
        enabled: true,
        trigger: "on_order_placed",
        conditions: [
          { field: "orderValue", operator: "greater_than", value: "2000" },
        ],
        actions: [
          {
            type: "notify_manager",
            config: {
              message: "🌟 VIP Zákazník {{lead_name}} právě vytvořil objednávku za {{order_value}} Kč!",
            },
          },
          {
            type: "send_email_followup",
            config: { template: "thank_you" },
          },
        ],
      },
    ],
    keyMetrics: [
      { label: "Customer Lifetime Value (LTV)", description: "Průměrný úhrnný výnos na 1 zákazníka" },
      { label: "Repeat Purchase Rate", description: "Procento zákazníků s více než 1 objednávkou" },
      { label: "Churn Risk Score", description: "Index rizika ztráty zákazníka" },
    ],
    aiCapabilities: [
      "AI Cross-sell & Up-sell doporučovací modul",
      "Detekce rizika odchodu zákazníka",
      "Post-purchase děkovné a re-engagement automatizace",
    ],
  },
];
