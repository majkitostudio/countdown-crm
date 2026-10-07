export type SupportedCarrier =
  | "zasilkovna"
  | "balikovna"
  | "ceska_posta"
  | "gls"
  | "dpd"
  | "ppl"
  | "other";

export interface CarrierMeta {
  code: SupportedCarrier;
  label: string;
  badge: string;
  website: string;
  buildTrackingUrl: (trackingNumber: string) => string;
}

export const CARRIERS: Record<SupportedCarrier, CarrierMeta> = {
  zasilkovna: {
    code: "zasilkovna",
    label: "Zásilkovna (Packeta)",
    badge: "Packeta",
    website: "https://www.zasilkovna.cz",
    buildTrackingUrl: (trackingNumber: string) =>
      `https://tracking.packeta.com/cs/?id=${encodeURIComponent(trackingNumber.trim())}`,
  },
  balikovna: {
    code: "balikovna",
    label: "Česká pošta (Balíkovna)",
    badge: "Balíkovna",
    website: "https://www.balikovna.cz",
    buildTrackingUrl: (trackingNumber: string) =>
      `https://www.balikovna.cz/cs/sledovat-balik?trackingNumber=${encodeURIComponent(trackingNumber.trim())}`,
  },
  ceska_posta: {
    code: "ceska_posta",
    label: "Česká pošta",
    badge: "Česká pošta",
    website: "https://www.ceskaposta.cz",
    buildTrackingUrl: (trackingNumber: string) =>
      `https://www.postaonline.cz/trackandtrace/-/zasilka/cislo?parcelNumbers=${encodeURIComponent(trackingNumber.trim())}`,
  },
  gls: {
    code: "gls",
    label: "GLS",
    badge: "GLS",
    website: "https://gls-group.com",
    buildTrackingUrl: (trackingNumber: string) =>
      `https://gls-group.com/CZ/cs/sledovani-zasilek?match=${encodeURIComponent(trackingNumber.trim())}`,
  },
  dpd: {
    code: "dpd",
    label: "DPD",
    badge: "DPD",
    website: "https://www.dpd.com",
    buildTrackingUrl: (trackingNumber: string) =>
      `https://www.dpd.com/cz/cs/sledovani-zasilek/?parcel=${encodeURIComponent(trackingNumber.trim())}`,
  },
  ppl: {
    code: "ppl",
    label: "PPL",
    badge: "PPL",
    website: "https://www.ppl.cz",
    buildTrackingUrl: (trackingNumber: string) =>
      `https://www.ppl.cz/vyhledat-zasilku?shipmentId=${encodeURIComponent(trackingNumber.trim())}`,
  },
  other: {
    code: "other",
    label: "Jiný dopravce",
    badge: "Dopravce",
    website: "",
    buildTrackingUrl: (trackingNumber: string) => {
      const trimmed = trackingNumber.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
      }
      return "";
    },
  },
};

export const CARRIER_LIST: CarrierMeta[] = Object.values(CARRIERS);

export function getCarrierMeta(carrierCode?: string | null): CarrierMeta {
  if (!carrierCode) return CARRIERS.other;
  const normalized = carrierCode.toLowerCase().trim();
  if (normalized in CARRIERS) {
    return CARRIERS[normalized as SupportedCarrier];
  }
  return CARRIERS.other;
}

export function getCarrierTrackingUrl(
  carrierCode?: string | null,
  trackingNumber?: string | null
): string | null {
  if (!trackingNumber || !trackingNumber.trim()) return null;
  const meta = getCarrierMeta(carrierCode);
  const url = meta.buildTrackingUrl(trackingNumber.trim());
  return url || null;
}

export function detectCarrierFromTrackingNumber(trackingNumber: string): SupportedCarrier | null {
  const code = trackingNumber.trim().toUpperCase();
  if (!code) return null;

  // Zásilkovna often starts with Z followed by digits, or 9-10 digits starting with 1/2/3/4/5
  if (/^Z\d{8,11}$/i.test(code)) return "zasilkovna";

  // Česká pošta / Balíkovna codes typically start with letters like DR, RR, NP, BA, BN, etc.
  if (/^B[A-Z]\d{8,10}/i.test(code)) return "balikovna";
  if (/^[A-Z]{2}\d{9,10}[A-Z]{2}$/i.test(code) || /^(DR|NP|RR|VL)\d{9,10}/i.test(code)) {
    return "ceska_posta";
  }

  // GLS standard 11 or 12 digit format
  if (/^\d{11,12}$/.test(code)) return "gls";

  return null;
}
