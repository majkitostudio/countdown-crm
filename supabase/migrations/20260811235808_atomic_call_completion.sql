-- Countdown CRM: complete a call, optional order, and lead status atomically.
--
-- This function intentionally runs as SECURITY INVOKER. RLS and the active
-- authenticated workspace membership remain the authorization boundary.

CREATE OR REPLACE FUNCTION public.complete_call_with_order(
  p_lead_id UUID,
  p_duration_seconds INTEGER,
  p_outcome TEXT,
  p_transcript TEXT,
  p_ai_sentiment TEXT,
  p_order_product_id UUID DEFAULT NULL,
  p_order_total_amount NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  call_id UUID,
  order_id UUID,
  lead_status TEXT
)
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_workspace_id UUID;
  v_lead_status TEXT;
  v_call_id UUID;
  v_order_id UUID;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_lead_id IS NULL THEN
    RAISE EXCEPTION 'Call requires a lead';
  END IF;

  IF p_duration_seconds IS NULL OR p_duration_seconds < 0 THEN
    RAISE EXCEPTION 'Call duration must be a non-negative integer';
  END IF;

  IF p_outcome NOT IN ('order_placed', 'followup_scheduled', 'objection', 'no_answer', 'completed') THEN
    RAISE EXCEPTION 'Unsupported call outcome';
  END IF;

  IF (p_order_product_id IS NULL) <> (p_order_total_amount IS NULL) THEN
    RAISE EXCEPTION 'Order product and amount must be provided together';
  END IF;

  SELECT lead.workspace_id
  INTO v_workspace_id
  FROM public.leads AS lead
  WHERE lead.id = p_lead_id;

  IF v_workspace_id IS NULL OR NOT private.is_workspace_member(v_workspace_id) THEN
    RAISE EXCEPTION 'Lead does not belong to the active workspace';
  END IF;

  IF p_order_product_id IS NOT NULL THEN
    IF p_order_total_amount < 0 THEN
      RAISE EXCEPTION 'Order amount must be a non-negative number';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.products AS product
      WHERE product.id = p_order_product_id
        AND product.workspace_id = v_workspace_id
    ) THEN
      RAISE EXCEPTION 'Order product does not belong to the active workspace';
    END IF;
  END IF;

  INSERT INTO public.calls (
    workspace_id,
    lead_id,
    agent_id,
    duration_seconds,
    outcome,
    transcript,
    ai_sentiment
  )
  VALUES (
    v_workspace_id,
    p_lead_id,
    (SELECT auth.uid()),
    p_duration_seconds,
    p_outcome,
    p_transcript,
    COALESCE(NULLIF(p_ai_sentiment, ''), 'Neutral')
  )
  RETURNING calls.id INTO v_call_id;

  IF p_order_product_id IS NOT NULL THEN
    INSERT INTO public.orders (
      workspace_id,
      lead_id,
      product_id,
      agent_id,
      total_amount,
      status
    )
    VALUES (
      v_workspace_id,
      p_lead_id,
      p_order_product_id,
      (SELECT auth.uid()),
      p_order_total_amount,
      'completed'
    )
    RETURNING orders.id INTO v_order_id;
  END IF;

  v_lead_status := CASE
    WHEN p_order_product_id IS NOT NULL THEN 'customer'
    WHEN p_outcome = 'no_answer' THEN 'unresponsive'
    WHEN p_outcome = 'objection' THEN 'qualified'
    ELSE 'contacted'
  END;

  UPDATE public.leads
  SET status = v_lead_status,
      updated_at = NOW()
  WHERE leads.id = p_lead_id
    AND leads.workspace_id = v_workspace_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead status could not be updated';
  END IF;

  RETURN QUERY SELECT v_call_id, v_order_id, v_lead_status;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_call_with_order(UUID, INTEGER, TEXT, TEXT, TEXT, UUID, NUMERIC)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_call_with_order(UUID, INTEGER, TEXT, TEXT, TEXT, UUID, NUMERIC)
  TO authenticated;
