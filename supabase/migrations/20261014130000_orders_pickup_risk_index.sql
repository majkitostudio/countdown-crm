-- Fáze 3, krok 5: index pro dotaz Exception Queue na rizikové zásilky na výdejně.
-- Dotaz filtruje workspace_id + status = 'sent' a řadí podle package_arrived_at,
-- proto složený index (workspace_id, status, package_arrived_at) pokryje jak filtr,
-- tak řazení bez dořazování nad velkým objemem objednávek.

CREATE INDEX IF NOT EXISTS orders_workspace_status_package_arrived_idx
  ON public.orders (workspace_id, status, package_arrived_at);
