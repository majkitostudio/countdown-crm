import "server-only";

import { createDataClient } from "./db";
import { DataAccessError } from "./errors";

/** Prevent the legacy order RPCs from silently treating missing product currencies as USD. */
export async function requireStoredOrderProductCurrencies(
  productIds: string[],
  workspaceId: string,
): Promise<void> {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, currency")
    .eq("workspace_id", workspaceId)
    .in("id", productIds);

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Měny produktů se nepodařilo ověřit. Zkuste to znovu.");
  }
  if (data.length !== new Set(productIds).size) {
    throw new DataAccessError("VALIDATION", "Některý produkt není v pracovním prostoru dostupný.");
  }
  if (data.some((product) => !product.currency?.trim())) {
    throw new DataAccessError("VALIDATION", "U produktu chybí uložená měna. Správce ji musí doplnit v katalogu.");
  }
}
