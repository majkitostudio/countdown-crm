export interface CallOrderItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface CallOrderDraft {
  product_id: string;
  unit_price: number;
  quantity: number;
  discount_percent: number;
  bundle?: {
    product_id: string;
    unit_price: number;
  };
}

function discountedPrice(unitPrice: number, discountPercent: number): number {
  return Number((unitPrice * (1 - discountPercent / 100)).toFixed(2));
}

export function buildCallOrderItems(draft: CallOrderDraft): CallOrderItemInput[] {
  const items: CallOrderItemInput[] = [{
    product_id: draft.product_id,
    quantity: draft.quantity,
    unit_price: discountedPrice(draft.unit_price, draft.discount_percent),
  }];

  if (draft.bundle) {
    items.push({
      product_id: draft.bundle.product_id,
      quantity: 1,
      unit_price: discountedPrice(draft.bundle.unit_price, draft.discount_percent),
    });
  }

  return items;
}

export function totalCallOrderItems(items: CallOrderItemInput[]): number {
  return Number(items.reduce((total, item) => total + item.unit_price * item.quantity, 0).toFixed(2));
}
