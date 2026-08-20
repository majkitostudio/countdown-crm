import { OrderPipeline } from "@/components/orders/OrderPipeline";
import { getOrders } from "@/lib/orders";
import type { Order } from "@/lib/orders";

async function loadOrders(): Promise<{ orders: Order[]; errorMessage: string | null }> {
  try {
    return { orders: await getOrders(), errorMessage: null };
  } catch (error) {
    return {
      orders: [],
      errorMessage: error instanceof Error ? error.message : "Orders could not be loaded.",
    };
  }
}

export default async function OrdersPage() {
  const { orders, errorMessage } = await loadOrders();

  if (errorMessage) {
    return (
      <section className="mx-auto max-w-2xl rounded-xl border border-rose-900/60 bg-rose-950/30 p-6 text-sm text-rose-200">
        <h1 className="font-semibold">Order Pipeline unavailable</h1>
        <p className="mt-2 text-xs leading-relaxed text-rose-300">{errorMessage}</p>
      </section>
    );
  }

  return <OrderPipeline orders={orders} />;
}
