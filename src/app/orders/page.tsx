import Link from "next/link";
import { LockKeyhole, Plus, ShoppingCart } from "lucide-react";
import { listWorkspaceOrders } from "@/lib/dal/activity";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { OrderPipeline } from "@/components/orders/OrderPipeline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/ui/Surface";

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
      <Surface variant="empty" className="w-full">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">{isForbidden ? "Order directory unavailable" : "Orders unavailable"}</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
          {isForbidden ? "You do not have access to the order directory in this workspace." : "The order directory could not be loaded from the active workspace."}
        </p>
      </Surface>
    );
  }

  const { orders, role } = result;

  return (
      <div className="mx-auto max-w-screen-2xl space-y-8">
        <PageHeader
          icon={ShoppingCart}
          title="Orders"
          badge={{ label: `${orders.length} total`, tone: "neutral" }}
          description={role === "operator"
            ? "Track assigned orders and next delivery steps."
            : "Review workspace orders and operator ownership."}
          actions={
            <Link href="/orders/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-5 py-2.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-200">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Order
            </Link>
          }
        />

        <OrderPipeline orders={orders} />
      </div>
  );
}
