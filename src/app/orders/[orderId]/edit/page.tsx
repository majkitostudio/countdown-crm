import Link from "next/link";
import { ArrowLeft, CircleAlert, LockKeyhole } from "lucide-react";
import { OrderEditForm } from "@/components/orders/OrderEditForm";
import { getWorkspaceOrder } from "@/lib/dal/activity";
import { listProductsForWorkspace } from "@/lib/dal/products";
import { requireWorkspaceContext } from "@/lib/dal/workspace";

type SearchParams = Promise<{ origin?: string | string[] }>;

type EditOrderLoadResult =
  | {
      order: Awaited<ReturnType<typeof getWorkspaceOrder>>;
      products: Awaited<ReturnType<typeof listProductsForWorkspace>>;
      origin: "workspace" | "orders";
      canEdit: boolean;
    }
  | { error: unknown };

async function loadEditOrderData(orderId: string, searchParams: SearchParams): Promise<EditOrderLoadResult> {
  try {
    const query = await searchParams;
    const requestedOrigin = Array.isArray(query.origin) ? query.origin[0] : query.origin;
    const origin = requestedOrigin === "workspace" ? "workspace" : "orders";
    const [context, order, products] = await Promise.all([
      requireWorkspaceContext(),
      getWorkspaceOrder(orderId),
      listProductsForWorkspace(),
    ]);
    const canEdit = Boolean(
      order && (
        context.role === "administrator"
        || (context.role === "team_leader" && ["pending", "in_progress"].includes(order.status))
        || (context.role === "operator" && order.agent_id === context.userId && ["pending", "in_progress"].includes(order.status))
      ),
    );
    return { order, products, origin, canEdit };
  } catch (error) {
    return { error };
  }
}

export default async function OrderEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: SearchParams;
}) {
  const { orderId } = await params;
  const result = await loadEditOrderData(orderId, searchParams);

  if ("error" in result) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-rose-900/50 bg-rose-950/20 p-12 text-center">
        <CircleAlert className="mx-auto mb-4 h-8 w-8 text-rose-400" />
        <h1 className="text-base font-semibold text-zinc-100">Order edit unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-rose-200/80">The order could not be loaded from the active workspace.</p>
        <Link href="/orders" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Orders
        </Link>
      </div>
    );
  }

  const backHref = result.origin === "workspace" ? "/workspace" : `/orders/${orderId}`;
  if (!result.order) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
        <CircleAlert className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Order not found</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">This order does not exist in the active workspace or is no longer available.</p>
        <Link href={backHref} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
      </div>
    );
  }

  if (!result.canEdit) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-900/50 bg-amber-950/20 p-12 text-center">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-amber-300" />
        <h1 className="text-base font-semibold text-zinc-100">Order details are read-only</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-amber-100/70">
          Operators can edit only while the order is pending or in preparation. After it is sent, only an administrator can make a correction.
        </p>
        <Link href={backHref} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to order
        </Link>
      </div>
    );
  }

  return (
    <OrderEditForm
      order={result.order}
      products={result.products.map((product) => ({
        id: product.id,
        title: product.title,
        category: product.category,
        price: Number(product.price),
        currency: product.currency || "USD",
        in_stock: product.in_stock ?? true,
      }))}
      initialOrigin={result.origin}
      requiresReason={result.order.status !== "pending" && result.order.status !== "in_progress"}
    />
  );
}
