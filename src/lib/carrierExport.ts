import type { WorkspaceOrderDTO } from "./dal/activity";
import { parseDeliveryAddressSnapshot, type DeliveryAddressSnapshot } from "./deliveryAddress";

export type CarrierFormat = "zasilkovna" | "balikovna" | "gls" | "universal";

export interface CarrierExportOptions {
  format: CarrierFormat;
  filenamePrefix?: string;
}

export interface NormalizedOrderForCarrier {
  orderId: string;
  orderNumber: string;
  recipientName: string;
  firstName: string;
  lastName: string;
  street: string;
  streetNumber: string;
  fullStreet: string;
  city: string;
  postalCode: string;
  country: string;
  codAmount: number;
  currency: string;
  productsSummary: string;
  note: string;
  createdAt: string;
  hasValidAddress: boolean;
}

export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return /[",\r\n;]/.test(stringValue) ? `"${escaped}"` : escaped;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function splitStreet(line1: string): { street: string; number: string } {
  const trimmed = line1.trim();
  // Match common Czech address patterns like "Hlavní 123", "Náměstí Míru 123/4", "Kollárova 5a"
  const match = trimmed.match(/^(.*?)\s+(\d+[\w\/\-\d]*)$/);
  if (match) {
    return { street: match[1].trim(), number: match[2].trim() };
  }
  return { street: trimmed, number: "" };
}

export function normalizeOrderForCarrier(order: WorkspaceOrderDTO): NormalizedOrderForCarrier {
  let rawSnapshot = order.delivery_address_snapshot;
  if (typeof rawSnapshot === "string") {
    try {
      rawSnapshot = JSON.parse(rawSnapshot);
    } catch {
      rawSnapshot = null;
    }
  }

  const address: DeliveryAddressSnapshot | null = parseDeliveryAddressSnapshot(rawSnapshot);

  const recipientName = address?.recipient_name?.trim() || order.lead_name?.trim() || "Zákazník";
  const { firstName, lastName } = splitName(recipientName);

  const rawStreet = address?.line1?.trim() || "";
  const { street, number: streetNumber } = splitStreet(rawStreet);
  const fullStreet = address
    ? [address.line1, address.line2].filter(Boolean).join(", ")
    : "";

  const postalCode = address?.postal_code?.replace(/\s+/g, "") || "";
  const city = address?.city?.trim() || "";
  const country = address?.country?.trim() || "CZ";

  const productsSummary =
    Array.isArray(order.items) && order.items.length > 0
      ? order.items.map((i) => `${i.product_title} (${i.quantity}ks)`).join("; ")
      : order.product_title || "Doplněk stravy";

  return {
    orderId: order.id,
    orderNumber: order.id.slice(0, 8),
    recipientName,
    firstName,
    lastName,
    street,
    streetNumber,
    fullStreet,
    city,
    postalCode,
    country,
    codAmount: order.total_amount,
    currency: order.currency || "CZK",
    productsSummary,
    note: order.source_note?.trim() || "",
    createdAt: order.created_at,
    hasValidAddress: Boolean(address),
  };
}

export function buildCarrierCsv(orders: WorkspaceOrderDTO[], format: CarrierFormat): string {
  const normalized = orders.map(normalizeOrderForCarrier);

  let headers: string[];
  let rowMapper: (item: NormalizedOrderForCarrier) => (string | number)[];

  switch (format) {
    case "zasilkovna":
      // Standardní Packeta / Zásilkovna import CSV (verze pro doručení na adresu HD i výdejní místa)
      // Reference, Jméno, Příjmení, Firma, E-mail, Telefon, Dobírka, Měna, Hodnota, Hmotnost, ID pobočky, Ulice, Číslo domu, Obec, PSČ
      headers = [
        "Číslo objednávky",
        "Jméno",
        "Příjmení",
        "Firma",
        "E-mail",
        "Telefon",
        "Dobírka",
        "Měna",
        "Hodnota",
        "Ulice",
        "Číslo domu",
        "Obec",
        "PSČ",
        "Stát",
        "Obsah zásilky",
      ];
      rowMapper = (item) => [
        item.orderId,
        item.firstName,
        item.lastName,
        "", // Firma
        "", // E-mail
        "", // Telefon (z leadu pokud bude napojen)
        item.codAmount.toFixed(2),
        item.currency,
        item.codAmount.toFixed(2),
        item.street,
        item.streetNumber,
        item.city,
        item.postalCode,
        item.country,
        item.productsSummary,
      ];
      break;

    case "balikovna":
      // Česká pošta / Balíkovna (Podání online)
      headers = [
        "Číslo objednávky (VS)",
        "Jméno příjemce",
        "Ulice a č.p.",
        "Město",
        "PSČ",
        "Stát",
        "Dobírka",
        "Měna",
        "Obsah zásilky",
        "Poznámka",
      ];
      rowMapper = (item) => [
        item.orderId,
        item.recipientName,
        item.fullStreet,
        item.city,
        item.postalCode,
        item.country,
        item.codAmount.toFixed(2),
        item.currency,
        item.productsSummary,
        item.note,
      ];
      break;

    case "gls":
      // GLS Connect / MyGLS CSV import
      headers = [
        "Reference",
        "Name",
        "Street",
        "City",
        "ZipCode",
        "Country",
        "COD Amount",
        "COD Currency",
        "Content",
      ];
      rowMapper = (item) => [
        item.orderId,
        item.recipientName,
        item.fullStreet,
        item.city,
        item.postalCode,
        item.country,
        item.codAmount.toFixed(2),
        item.currency,
        item.productsSummary,
      ];
      break;

    case "universal":
    default:
      // Univerzální expediční CSV pro interní sklad a Excel
      headers = [
        "Kód objednávky",
        "Datum vytvoření",
        "Příjemce",
        "Ulice a č.p.",
        "Město",
        "PSČ",
        "Stát",
        "Částka dobírky",
        "Měna",
        "Objednané produkty",
        "Poznámka",
        "Ověřená adresa",
      ];
      rowMapper = (item) => [
        item.orderId,
        item.createdAt,
        item.recipientName,
        item.fullStreet,
        item.city,
        item.postalCode,
        item.country,
        item.codAmount.toFixed(2),
        item.currency,
        item.productsSummary,
        item.note,
        item.hasValidAddress ? "ANO" : "NE",
      ];
      break;
  }

  const rows = [
    headers.map(escapeCsvField).join(","),
    ...normalized.map((item) => rowMapper(item).map(escapeCsvField).join(",")),
  ];

  return rows.join("\r\n") + "\r\n";
}

/**
 * Triggers a browser download of the generated CSV file.
 * Automatically adds the UTF-8 BOM (\uFEFF) to guarantee that Microsoft Excel
 * on Windows opens Czech characters (č, ř, ž, š, etc.) with correct encoding.
 */
export function exportOrdersToCarrierCsv(
  orders: WorkspaceOrderDTO[],
  options: CarrierFormat | CarrierExportOptions
): void {
  if (typeof window === "undefined" || orders.length === 0) return;

  const format: CarrierFormat = typeof options === "string" ? options : options.format;
  const prefix = typeof options === "object" && options.filenamePrefix ? options.filenamePrefix : "expedice";

  const csvContent = buildCarrierCsv(orders, format);

  // UTF-8 BOM ensures proper display of Czech diacritics in Microsoft Excel
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const blob = new Blob([bom, csvContent], { type: "text/csv;charset=utf-8;" });

  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `${prefix}_${format}_${dateStr}.csv`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
