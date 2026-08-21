import Link from "next/link";
import { LockKeyhole, Plus, ShoppingCart } from "lucide-react";
import { listWorkspaceOrders } from "@/lib/dal/activity";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { OrderPipeline } from "@/components/orders/OrderPipeline";

type OrdersLoadResult =
  | { orders: Awaited<ReturnType<typeof listWorkspaceOrders>>; role: Awaited<ReturnType<typeof requireWorkspaceContext>>["role"] }
  | { error: unknown };

async function loadOrders(): Promise<OrdersLoadResult> {
  try {
    const context = await requireWorkspaceContext();
    return { orders: await listWorkspaceOrders(), role: context.role };
  } catch (error) {
    return { error };
  }
}

export default async function OrdersPage() {
  const result = await loadOrders();

  if ("error" in result) {
    const isForbidden = result.error instanceof Error && result.error.message === "Insufficient workspace permissions";
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">{isForbidden ? "Order directory unavailable" : "Orders unavailable"}</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
          {isForbidden ? "You do not have access to the order directory in this workspace." : "The order directory could not be loaded from the active workspace."}
        </p>
      </div>
    );
  }

  const { orders, role } = result;

  return (
      <div className="mx-auto max-w-screen-2xl space-y-8">
        <div className="flex flex-col gap-5 rounded-2xl border border-zinc-800/80 border-t-white/5 bg-zinc-900/60 p-8 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2.5">
              <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-zinc-100">
                <ShoppingCart className="h-5 w-5 text-zinc-400" />
                Orders
              </h1>
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-zinc-300">{orders.length} total</span>
            </div>
            <p className="text-xs text-zinc-400">
              {role === "operator"
                ? "Your order records with customer, product, source and delivery status."
                : "Workspace order records with customer, product, source and operator attribution."}
            </p>
          </div>
          <Link href="/orders/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-5 py-2.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-200">
            <Plus className="h-4 w-4" />
            Create Order
          </Link>
        </div>

        <OrderPipeline orders={orders} />
      </div>
  );
}
