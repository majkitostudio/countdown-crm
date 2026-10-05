import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DeliveryAddressFields,
  parseFreeformAddress,
  toDeliveryAddressSnapshot,
} from "@/components/orders/DeliveryAddressFields";

describe("delivery address search, parse and confirmation", () => {
  it("parses Czech multi-part freeform address text correctly", () => {
    const parsed = parseFreeformAddress("Václavské náměstí 846/1, Praha 1, 110 00, CZ");
    expect(parsed.line1).toBe("Václavské náměstí 846/1");
    expect(parsed.city).toBe("Praha 1");
    expect(parsed.postal_code).toBe("110 00");
    expect(parsed.country).toBe("CZ");
  });

  it("parses short address with postal code and city", () => {
    const parsed = parseFreeformAddress("Nádražní 45, 60200 Brno");
    expect(parsed.line1).toBe("Nádražní 45");
    expect(parsed.city).toBe("Brno");
    expect(parsed.postal_code).toBe("602 00");
  });

  it("renders search bar, prefill button and client confirmation checkbox", () => {
    const html = renderToStaticMarkup(
      React.createElement(DeliveryAddressFields, {
        value: {
          recipient_name: "Jan Novák",
          line1: "Hlavní 12",
          line2: "",
          city: "Brno",
          postal_code: "602 00",
          country: "CZ",
        },
        onChange: () => {},
        idPrefix: "test-addr",
        leadContext: {
          recipient_name: "Jan Novák",
          city: "Brno",
          country: "CZ",
        },
      }),
    );

    expect(html).toContain('id="test-addr-search"');
    expect(html).toContain('id="test-addr-confirmed"');
    expect(html).toContain("Adresa ověřena a zkontrolována s klientem do telefonu");
    expect(html).toContain('id="test-addr-recipient-name"');
    expect(html).toContain('id="test-addr-line1"');
    expect(html).toContain('id="test-addr-city"');
    expect(html).toContain('id="test-addr-postal-code"');
  });

  it("produces valid delivery snapshot for complete address", () => {
    const snapshot = toDeliveryAddressSnapshot({
      recipient_name: "Jan Novák",
      line1: "Hlavní 12",
      line2: "Byt 4",
      city: "Brno",
      postal_code: "602 00",
      country: "CZ",
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.recipient_name).toBe("Jan Novák");
    expect(snapshot?.line1).toBe("Hlavní 12");
    expect(snapshot?.line2).toBe("Byt 4");
    expect(snapshot?.city).toBe("Brno");
    expect(snapshot?.postal_code).toBe("602 00");
  });
});
