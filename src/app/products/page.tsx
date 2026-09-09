import { ProductCatalogClient } from "@/app/products/ProductCatalogClient";
import { PageHeader } from "@/components/layout/PageHeader";
import { loadProductCatalog } from "@/lib/dal/productCatalog";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { Package } from "lucide-react";

export default async function ProductsPage() {
  const context = await requireWorkspaceContext();
  const initialCatalog = await loadProductCatalog(context);

  const badge = initialCatalog.catalog.status === "ready"
    ? { label: `${initialCatalog.catalog.data.length} Products`, tone: "neutral" as const }
    : { label: "Catalog unavailable", tone: "unavailable" as const };

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <PageHeader
        icon={Package}
        title="Product Catalog & Objection Engine"
        badge={badge}
        description="Manage multi-category inventory, sales battle-cards, and cross-sell rules for call center operators."
      />
      <ProductCatalogClient role={context.role} initialCatalog={initialCatalog} />
    </div>
  );
}
