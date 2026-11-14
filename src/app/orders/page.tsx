import Link from "next/link";
import { LockKeyhole, Plus, ShoppingCart } from "lucide-react";
import { listWorkspaceOrders } from "@/lib/dal/activity";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { OrderPipeline } from "@/components/orders/OrderPipeline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { getButtonClassName } from "@/components/ui/Button";
import { bulkUpdateOrderStatusAction } from "@/app/actions/crm";

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
        <h1 className="text-base font-semibold text-zinc-100">{isForbidden ? "Seznam objednávek není dostupný" : "Objednávky nejsou dostupné"}</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
          {isForbidden ? "V tomto pracovním prostoru nemáte přístup k seznamu objednávek." : "Seznam objednávek se nepodařilo načíst z aktivního pracovního prostoru. Zkuste to znovu."}
        </p>
      </Surface>
    );
  }

  const { orders, role } = result;

  return (
      <div className="mx-auto max-w-screen-2xl space-y-8">
        <PageHeader
          icon={ShoppingCart}
          title="Objednávky"
          badge={{ label: `Celkem: ${orders.length}`, tone: "neutral" }}
          description={role === "operator"
            ? "Sledujte přiřazené objednávky a další kroky doručení."
            : "Přehled objednávek pracovního prostoru a přiřazení operátorů."}
          actions={
            role === "operator" ? undefined : (
              <Link
                href="/orders/new"
                className={getButtonClassName("primary")}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Vytvořit objednávku
              </Link>
            )
          }
        />

        <OrderPipeline
          orders={orders}
          role={role}
          onBulkStatusUpdate={bulkUpdateOrderStatusAction}
        />
      </div>
  );
}
