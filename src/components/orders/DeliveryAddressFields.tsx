import type { ChangeEvent } from "react";
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

export function DeliveryAddressFields({
  value,
  onChange,
  disabled = false,
  idPrefix,
}: {
  value: DeliveryAddressDraft;
  onChange: (next: DeliveryAddressDraft) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const update = (field: keyof DeliveryAddressDraft) => (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, [field]: event.target.value });
  };
  const fieldClassName = "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="text-sm font-semibold text-zinc-100">Delivery address</legend>
      <p className="text-xs text-zinc-500">Required for every new order. It is saved as this order&apos;s immutable delivery snapshot.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-zinc-400" htmlFor={`${idPrefix}-recipient-name`}>
          Recipient name
          <input id={`${idPrefix}-recipient-name`} autoComplete="shipping name" value={value.recipient_name} onChange={update("recipient_name")} required className={fieldClassName} />
        </label>
        <label className="text-xs text-zinc-400" htmlFor={`${idPrefix}-country`}>
          Country
          <input id={`${idPrefix}-country`} autoComplete="shipping country" value={value.country} onChange={update("country")} required className={fieldClassName} />
        </label>
      </div>
      <label className="block text-xs text-zinc-400" htmlFor={`${idPrefix}-line1`}>
        Address line 1
        <input id={`${idPrefix}-line1`} autoComplete="shipping address-line1" value={value.line1} onChange={update("line1")} required className={fieldClassName} />
      </label>
      <label className="block text-xs text-zinc-400" htmlFor={`${idPrefix}-line2`}>
        Address line 2 <span className="text-zinc-600">(optional)</span>
        <input id={`${idPrefix}-line2`} autoComplete="shipping address-line2" value={value.line2} onChange={update("line2")} className={fieldClassName} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-zinc-400" htmlFor={`${idPrefix}-postal-code`}>
          Postal code
          <input id={`${idPrefix}-postal-code`} autoComplete="shipping postal-code" value={value.postal_code} onChange={update("postal_code")} required className={fieldClassName} />
        </label>
        <label className="text-xs text-zinc-400" htmlFor={`${idPrefix}-city`}>
          City
          <input id={`${idPrefix}-city`} autoComplete="shipping address-level2" value={value.city} onChange={update("city")} required className={fieldClassName} />
        </label>
      </div>
    </fieldset>
  );
}
