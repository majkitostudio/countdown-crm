import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { OrderCreateForm } from "@/components/orders/OrderCreateForm";
import { listLeadsForWorkspace } from "@/lib/dal/leads";
import { listProductsForWorkspace } from "@/lib/dal/products";
import { getScopedLeadForWorkspace } from "@/lib/dal/leadQueue";
import { DataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceContext } from "@/lib/dal/workspace";

type SearchParams = Promise<{ leadId?: string | string[]; origin?: string | string[] }>;

type NewOrderLoadResult =
  | { leads: Awaited<ReturnType<typeof listLeadsForWorkspace>>; products: Awaited<ReturnType<typeof listProductsForWorkspace>>; requestedLeadId?: string; origin: "workspace" | "orders" }
  | { error: unknown };

async function loadNewOrderData(searchParams: SearchParams): Promise<NewOrderLoadResult> {
  try {
    const params = await searchParams;
    const requestedLeadId = Array.isArray(params.leadId) ? params.leadId[0] : params.leadId;
    const requestedOrigin = Array.isArray(params.origin) ? params.origin[0] : params.origin;
    const origin = requestedOrigin === "workspace" ? "workspace" : "orders";
    const context = await requireWorkspaceContext();
    if (context.role === "operator" && !requestedLeadId) {
      throw new DataAccessError("VALIDATION", "Operator order creation requires an assigned contact");
    }
    const leads = context.role === "operator"
      ? requestedLeadId
        ? [await getScopedLeadForWorkspace(requestedLeadId, context.workspaceId)]
        : []
      : await listLeadsForWorkspace({ sortBy: "name" });
    const products = await listProductsForWorkspace({ inStockOnly: true });
    return { leads, products, requestedLeadId, origin };
  } catch (error) {
    return { error };
  }
}

export default async function NewOrderPage({ searchParams }: { searchParams: SearchParams }) {
  const result = await loadNewOrderData(searchParams);

  if ("error" in result) {
    const isUnavailable = result.error instanceof Error && result.error.message === "Contact unavailable";
    const requiresAssignedContact = result.error instanceof Error && result.error.message === "Operator order creation requires an assigned contact";
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Order creation unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
          {isUnavailable
            ? "Operators can create an order only for their currently assigned contact. Return to the Operator Console and open Create Order from that contact."
            : requiresAssignedContact
              ? "Open Create Order from the currently assigned contact in the Operator Console."
            : "The create order workspace data could not be loaded."}
        </p>
        <Link href="/workspace" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Operator Console
        </Link>
      </div>
    );
  }

  const { leads, products, requestedLeadId, origin } = result;
  return (
    <OrderCreateForm
      leads={leads}
      products={products.map((product) => ({
        id: product.id,
        title: product.title,
        category: product.category,
        price: Number(product.price),
        currency: product.currency || "USD",
        in_stock: product.in_stock ?? true,
      }))}
      initialLeadId={requestedLeadId && leads.some((lead) => lead.id === requestedLeadId) ? requestedLeadId : ""}
      initialOrigin={origin}
    />
  );
}
