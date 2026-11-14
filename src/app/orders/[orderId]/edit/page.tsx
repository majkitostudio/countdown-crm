import Link from "next/link";
import { ArrowLeft, CircleAlert, LockKeyhole, Package } from "lucide-react";
import { OrderEditForm } from "@/components/orders/OrderEditForm";
import { getWorkspaceOrder } from "@/lib/dal/activity";
import { listProductsForWorkspace } from "@/lib/dal/products";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { getButtonClassName } from "@/components/ui/Button";

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
      <Surface variant="empty" className="w-full">
        <CircleAlert className="mx-auto mb-4 h-8 w-8 text-rose-400" />
        <h1 className="text-base font-semibold text-zinc-100">Úprava objednávky není dostupná</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-rose-200/80">Objednávku se nepodařilo načíst z aktivního pracovního prostoru. Zkuste to znovu.</p>
        <Link href="/orders" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 transition-colors duration-150 ease-interface hover:border-zinc-700 hover:text-zinc-100">
          <ArrowLeft className="h-3.5 w-3.5" />
          Zpět na objednávky
        </Link>
      </Surface>
    );
  }

  const backHref = result.origin === "workspace" ? "/console" : `/orders/${orderId}`;
  if (!result.order) {
    return (
      <Surface variant="empty" className="w-full">
        <CircleAlert className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Objednávka nenalezena</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">Tato objednávka v aktivním pracovním prostoru neexistuje nebo už není dostupná.</p>
<Link
          href={backHref}
          className={getButtonClassName("secondary")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zpět na objednávku
        </Link>
      </Surface>
    );
  }

  if (result.order.items.length === 0) {
    return (
      <Surface variant="empty" className="w-full">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-amber-300" />
        <h1 className="text-base font-semibold text-zinc-100">Historická objednávka je pouze pro čtení</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-amber-100/70">
          Tato historická objednávka nemá upravitelné údaje položek. Produkt a celková částka zůstávají dostupné v detailu jako historie pouze pro čtení.
        </p>
        <Link href={backHref} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 transition-colors duration-150 ease-interface hover:border-zinc-700 hover:text-zinc-100">
          <ArrowLeft className="h-3.5 w-3.5" />
          Zpět na objednávku
        </Link>
      </Surface>
    );
  }

  if (!result.canEdit) {
    return (
      <Surface variant="empty" className="w-full">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-amber-300" />
        <h1 className="text-base font-semibold text-zinc-100">Údaje objednávky jsou pouze pro čtení</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-amber-100/70">
          Operátoři mohou upravovat objednávku jen během čekání nebo přípravy. Po odeslání ji může opravit pouze administrátor.
        </p>
        <Link href={backHref} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 transition-colors duration-150 ease-interface hover:border-zinc-700 hover:text-zinc-100">
          <ArrowLeft className="h-3.5 w-3.5" />
          Zpět na objednávku
        </Link>
      </Surface>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl space-y-6">
      <PageHeader
        icon={Package}
        title="Upravit objednávku"
        badge={{ label: `Verze ${result.order.revision}`, tone: "neutral" }}
        backLink={{ href: backHref, label: result.origin === "workspace" ? "Zpět do konzole operátora" : "Zpět na objednávku" }}
        description={`Aktuální stav: ${({ pending: "Čeká na zpracování", in_progress: "Zpracovává se", sent: "Odesláno", delivered: "Doručeno", returned: "Vráceno", cancelled: "Zrušeno", completed: "Dokončeno" } as Record<string, string>)[result.order.status] || result.order.status}. Zákazník, přiřazený operátor a stav jsou zde pouze pro čtení.`}
      />
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
    </div>
  );
}
