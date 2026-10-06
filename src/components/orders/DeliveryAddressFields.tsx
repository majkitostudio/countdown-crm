"use client";

import { useState, type ChangeEvent } from "react";
import { CheckCircle2, AlertCircle, Search, UserCheck, ShieldCheck } from "lucide-react";
import { parseDeliveryAddressSnapshot, type DeliveryAddressSnapshot } from "@/lib/deliveryAddress";

export interface DeliveryAddressDraft {
  recipient_name: string;
  line1: string;
  line2: string;
  city: string;
  postal_code: string;
  country: string;
}

export const EMPTY_DELIVERY_ADDRESS_DRAFT: DeliveryAddressDraft = {
  recipient_name: "",
  line1: "",
  line2: "",
  city: "",
  postal_code: "",
  country: "",
};

export function toDeliveryAddressSnapshot(
  draft: DeliveryAddressDraft,
): DeliveryAddressSnapshot | null {
  return parseDeliveryAddressSnapshot({
    recipient_name: draft.recipient_name,
    line1: draft.line1,
    ...(draft.line2.trim() ? { line2: draft.line2 } : {}),
    city: draft.city,
    postal_code: draft.postal_code,
    country: draft.country,
  });
}

/**
 * Intelligent helper to parse a freeform address string into structured fields
 * Handles common Czech, Slovak and international formats:
 * e.g. "Václavské náměstí 1, Praha 1, 11000, CZ"
 * e.g. "Nádražní 45/12, 602 00 Brno"
 */
export function parseFreeformAddress(raw: string): Partial<DeliveryAddressDraft> {
  const text = raw.trim();
  if (!text) return {};

  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  const result: Partial<DeliveryAddressDraft> = {};

  // Check for postal code (e.g. "110 00" or "60200" or "811 01")
  const postalMatch = text.match(/\b(\d{3}\s?\d{2})\b/);
  if (postalMatch) {
    result.postal_code = postalMatch[1].replace(/(\d{3})(\d{2})/, "$1 $2");
  }

  // Country detection
  if (/\b(sk|slovensko|slovakia)\b/i.test(text)) {
    result.country = "SK";
  } else if (/\b(cz|čr|česko|czechia|czech republic)\b/i.test(text)) {
    result.country = "CZ";
  }

  if (parts.length >= 2) {
    result.line1 = parts[0];
    
    // City often in part 2, possibly with postal code
    let cityCandidate = parts[1];
    // Strip postal code from city candidate if present
    cityCandidate = cityCandidate.replace(/\b\d{3}\s?\d{2}\b/, "").trim();
    if (cityCandidate) {
      result.city = cityCandidate;
    }

    if (parts.length >= 3 && !result.country) {
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart.length === 2) {
        result.country = lastPart.toUpperCase();
      }
    }
  } else {
    // Single line without commas: try to split street from city/zip
    result.line1 = text;
  }

  return result;
}

const COMMON_CITIES: Array<{ city: string; postal_code: string; country: string }> = [
  { city: "Praha", postal_code: "110 00", country: "CZ" },
  { city: "Brno", postal_code: "602 00", country: "CZ" },
  { city: "Ostrava", postal_code: "702 00", country: "CZ" },
  { city: "Plzeň", postal_code: "301 00", country: "CZ" },
  { city: "Liberec", postal_code: "460 01", country: "CZ" },
  { city: "Olomouc", postal_code: "779 00", country: "CZ" },
  { city: "České Budějovice", postal_code: "370 01", country: "CZ" },
  { city: "Hradec Králové", postal_code: "500 02", country: "CZ" },
  { city: "Pardubice", postal_code: "530 02", country: "CZ" },
  { city: "Zlín", postal_code: "760 01", country: "CZ" },
  { city: "Bratislava", postal_code: "811 01", country: "SK" },
  { city: "Košice", postal_code: "040 01", country: "SK" },
];

export function DeliveryAddressFields({
  value,
  onChange,
  disabled = false,
  idPrefix,
  leadContext,
  onAddressConfirmed,
}: {
  value: DeliveryAddressDraft;
  onChange: (next: DeliveryAddressDraft) => void;
  disabled?: boolean;
  idPrefix: string;
  leadContext?: {
    recipient_name?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
  onAddressConfirmed?: (confirmed: boolean) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isConfirmedWithClient, setIsConfirmedWithClient] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const update = (field: keyof DeliveryAddressDraft) => (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, [field]: event.target.value });
  };

  const handleApplyFreeformSearch = () => {
    if (!searchQuery.trim()) return;
    const parsed = parseFreeformAddress(searchQuery);
    onChange({
      recipient_name: value.recipient_name || leadContext?.recipient_name || "",
      line1: parsed.line1 || value.line1,
      line2: value.line2,
      city: parsed.city || value.city,
      postal_code: parsed.postal_code || value.postal_code,
      country: parsed.country || value.country || "CZ",
    });
    setSearchQuery("");
    setShowSuggestions(false);
  };

  const handleSelectCitySuggestion = (suggestion: { city: string; postal_code: string; country: string }) => {
    onChange({
      ...value,
      city: suggestion.city,
      postal_code: suggestion.postal_code,
      country: suggestion.country,
    });
    setShowSuggestions(false);
  };

  const handlePrefillFromLead = () => {
    if (!leadContext) return;
    onChange({
      ...value,
      recipient_name: leadContext.recipient_name || value.recipient_name,
      city: leadContext.city || value.city,
      country: leadContext.country || value.country || "CZ",
    });
  };

  const handleToggleConfirmed = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.checked;
    setIsConfirmedWithClient(next);
    onAddressConfirmed?.(next);
  };

  const isComplete = Boolean(
    value.recipient_name.trim() &&
    value.line1.trim() &&
    value.city.trim() &&
    value.postal_code.trim() &&
    value.country.trim()
  );

  const filteredSuggestions = searchQuery.trim().length >= 2
    ? COMMON_CITIES.filter(
        (c) =>
          c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.postal_code.replace(/\s+/g, "").includes(searchQuery.replace(/\s+/g, ""))
      )
    : [];

  const fieldClassName =
    "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <fieldset disabled={disabled} className="space-y-3.5">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
        <div>
          <legend className="text-sm font-semibold text-zinc-100">Doručovací adresa (Delivery address)</legend>
          <p className="text-xs text-zinc-500">
            Povinné pro expedici objednávky. Ukládá se jako neměnný doručovací snapshot.
          </p>
        </div>
        {isComplete && isConfirmedWithClient && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Ověřeno s klientem
          </span>
        )}
      </div>

      {/* Rychlé vyhledání / vložení celé adresy jedním řádkem */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor={`${idPrefix}-search`} className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <span>Rychlé hledání adresy / One-line adresa:</span>
          </label>
          {leadContext?.recipient_name && !value.recipient_name && (
            <button
              type="button"
              onClick={handlePrefillFromLead}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-medium cursor-pointer transition-colors"
            >
              <UserCheck className="h-3 w-3" />
              <span>Doplnit z kontaktu ({leadContext.recipient_name})</span>
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id={`${idPrefix}-search`}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyFreeformSearch();
                }
              }}
              placeholder="Zadejte ulici, město nebo PSČ (např. Nádražní 12, Brno 602 00)..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
                {filteredSuggestions.map((sug) => (
                  <button
                    key={`${sug.city}-${sug.postal_code}`}
                    type="button"
                    onClick={() => handleSelectCitySuggestion(sug)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                  >
                    <span className="font-medium">{sug.city}</span>
                    <span className="font-mono text-zinc-400">{sug.postal_code} · {sug.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleApplyFreeformSearch}
            disabled={!searchQuery.trim()}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
          >
            Rozdělit do polí
          </button>
        </div>
      </div>

      {/* Formulářová pole pro kontrolu a přesnou editaci */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-zinc-400" htmlFor={`${idPrefix}-recipient-name`}>
          Jméno příjemce (Recipient name)
          <input
            id={`${idPrefix}-recipient-name`}
            autoComplete="shipping name"
            value={value.recipient_name}
            onChange={update("recipient_name")}
            required
            className={fieldClassName}
          />
        </label>
        <label className="text-xs text-zinc-400" htmlFor={`${idPrefix}-country`}>
          Stát / Země (Country)
          <input
            id={`${idPrefix}-country`}
            autoComplete="shipping country"
            value={value.country || "CZ"}
            onChange={update("country")}
            required
            className={fieldClassName}
          />
        </label>
      </div>

      <label className="block text-xs text-zinc-400" htmlFor={`${idPrefix}-line1`}>
        Ulice a číslo domu (Address line 1)
        <input
          id={`${idPrefix}-line1`}
          autoComplete="shipping address-line1"
          value={value.line1}
          onChange={update("line1")}
          required
          placeholder="např. Václavské náměstí 846/1"
          className={fieldClassName}
        />
      </label>

      <label className="block text-xs text-zinc-400" htmlFor={`${idPrefix}-line2`}>
        Doplňující údaje / Byt / Patro (Address line 2) <span className="text-zinc-600">(volitelné)</span>
        <input
          id={`${idPrefix}-line2`}
          autoComplete="shipping address-line2"
          value={value.line2}
          onChange={update("line2")}
          placeholder="např. Byt 3, 2. patro"
          className={fieldClassName}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-zinc-400" htmlFor={`${idPrefix}-postal-code`}>
          PSČ (Postal code)
          <input
            id={`${idPrefix}-postal-code`}
            autoComplete="shipping postal-code"
            value={value.postal_code}
            onChange={update("postal_code")}
            required
            placeholder="např. 110 00"
            className={fieldClassName}
          />
        </label>
        <label className="text-xs text-zinc-400" htmlFor={`${idPrefix}-city`}>
          Město (City)
          <input
            id={`${idPrefix}-city`}
            autoComplete="shipping address-level2"
            value={value.city}
            onChange={update("city")}
            required
            placeholder="např. Praha"
            className={fieldClassName}
          />
        </label>
      </div>

      {/* Ověření a potvrzení adresy s klientem */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 flex items-start gap-2.5">
        <input
          type="checkbox"
          id={`${idPrefix}-confirmed`}
          checked={isConfirmedWithClient}
          onChange={handleToggleConfirmed}
          className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-zinc-100 accent-zinc-500 focus:ring-zinc-500 cursor-pointer"
        />
        <label htmlFor={`${idPrefix}-confirmed`} className="text-xs text-zinc-300 leading-relaxed cursor-pointer select-none">
          <span className="font-semibold text-zinc-200">Adresa ověřena a zkontrolována s klientem do telefonu</span>
          <span className="block text-[11px] text-zinc-500">
            Operátor potvrdil, že klientovi přečetl doručovací adresu (ulici, číslo, město a PSČ) a klient ji odsouhlasil.
          </span>
        </label>
      </div>

      {/* Stavový box pro operátora */}
      <div className="pt-1">
        {isComplete && isConfirmedWithClient ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Adresa je kompletní a schválená pro odeslání do expedice.</span>
          </div>
        ) : isComplete ? (
          <div className="flex items-center gap-2 rounded-lg bg-zinc-900/80 border border-zinc-800 p-2.5 text-xs text-zinc-400">
            <AlertCircle className="h-4 w-4 text-zinc-500 shrink-0" />
            <span>Adresa je vyplněna. Přečtěte ji prosím klientovi a potvrďte ověření výše.</span>
          </div>
        ) : (
          <div className="text-[11px] text-zinc-500">
            * Před vytvořením objednávky musí být vyplněno jméno, ulice s číslem, město a PSČ.
          </div>
        )}
      </div>
    </fieldset>
  );
}
