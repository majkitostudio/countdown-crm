-- The address belongs to the order that captured it, not to the mutable lead.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_delivery_address_snapshot_object_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_address_snapshot_object_check
  CHECK (
    delivery_address_snapshot IS NULL OR (
      jsonb_typeof(delivery_address_snapshot) = 'object'
      AND delivery_address_snapshot ?& ARRAY['recipient_name', 'line1', 'city', 'postal_code', 'country']
    )
  );

COMMENT ON COLUMN public.orders.delivery_address_snapshot IS
  'Immutable address snapshot captured with an order; never inferred from lead fields.';

ALTER TABLE public.workspace_user_preferences
  DROP CONSTRAINT IF EXISTS workspace_user_preferences_density_check;

ALTER TABLE public.workspace_user_preferences
  DROP COLUMN IF EXISTS client_profile_density;
