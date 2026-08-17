-- Keep order-only creation distinguishable from the existing call completion path.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_source TEXT NOT NULL DEFAULT 'previous_call',
  ADD COLUMN IF NOT EXISTS source_note TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_order_source_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_order_source_check
      CHECK (order_source IN ('previous_call', 'email', 'web_form', 'manual', 'other'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_order_source_idx ON public.orders(order_source);
