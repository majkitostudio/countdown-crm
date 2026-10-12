import { Package } from "lucide-react";
import Link from "next/link";
import { ProductCatalogClient } from "@/app/products/ProductCatalogClient";
import { ProductScriptManager } from "@/components/settings/ProductScriptManager";
import { PageHeader } from "@/components/layout/PageHeader";
import { loadProductCatalog } from "@/lib/dal/productCatalog";
import {
  listProductScriptsForWorkspace,
  listProductScriptVersionsForWorkspace,
} from "@/lib/dal/productScripts";
import { listProductsForWorkspace } from "@/lib/dal/products";
import { requireWorkspaceContext, requireWorkspaceRole } from "@/lib/dal/workspace";
import { DataAccessError } from "@/lib/dal/errors";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusAlert } from "@/components/ui/Status";
import { getButtonClassName } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Products & Scripts (merge A). One surface, two faces: operators read the
 * product catalog, administrators also get the "Scripts" tab that used to live
 * on its own /settings/scripts page. The full product-card editor is a separate
 * step; this merge only brings the existing script editor onto the catalog.
 */

const PRODUCTS_TABS = [
  { key: "catalog", label: "Catalog", href: "/products" },
  { key: "scripts", label: "Scripts", href: "/products?tab=scripts" },
] as const;

type ProductsTabKey = (typeof PRODUCTS_TABS)[number]["key"];

type ProductScriptsLoadResult =
  | {
      products: Awaited<ReturnType<typeof listProductsForWorkspace>>;
      scripts: Awaited<ReturnType<typeof listProductScriptsForWorkspace>>;
      versions: Awaited<ReturnType<typeof listProductScriptVersionsForWorkspace>>;
    }
  | { error: unknown };

async function loadProductScripts(): Promise<ProductScriptsLoadResult> {
  try {
    await requireWorkspaceRole(["administrator"]);
    const [products, scripts, versions] = await Promise.all([
      listProductsForWorkspace(),
      listProductScriptsForWorkspace(),
      listProductScriptVersionsForWorkspace(),
    ]);

    return { products, scripts, versions };
  } catch (error) {
    return { error };
  }
}

function ProductsTabs({ activeTab }: { activeTab: ProductsTabKey }) {
  return (
    <nav aria-label="Products &amp; Scripts sections" className="flex flex-wrap items-center gap-2">
      {PRODUCTS_TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors",
              isActive
                ? "border-zinc-700 bg-zinc-800 text-zinc-100"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default async function ProductsPage(
  props: { searchParams?: Promise<{ tab?: string }> } = {},
) {
  const context = await requireWorkspaceContext();
  const isAdministrator = context.role === "administrator";
  const params = props.searchParams ? await props.searchParams : undefined;
  const activeTab: ProductsTabKey =
    isAdministrator && params?.tab === "scripts" ? "scripts" : "catalog";

  if (activeTab === "scripts") {
    const result = await loadProductScripts();

    if ("error" in result) {
      const isForbidden =
        result.error instanceof DataAccessError && result.error.code === "FORBIDDEN";

      return (
        <div className="mx-auto max-w-screen-2xl space-y-6">
          <PageHeader
            icon={Package}
            title="Products & Scripts"
            badge={{ label: "Administrator only", tone: "neutral" }}
            backLink={{ href: "/admin", label: "Back to Management" }}
            description="Jeden souvislý skript na produkt: uložte koncept a publikujte zkontrolovanou verzi operátorům."
          />
          <ProductsTabs activeTab="scripts" />
          <div className="mx-auto max-w-xl">
            <Surface variant="empty">
              <Package className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
              <h1 className="text-base font-semibold text-zinc-100">
                Products &amp; Scripts unavailable
              </h1>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
                {isForbidden
                  ? "Only a workspace Administrator can edit approved product scripts."
                  : "The approved product scripts could not be loaded right now."}
              </p>
              <Link href="/admin" className={getButtonClassName("secondary")}>
                Back to Management
              </Link>
            </Surface>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <PageHeader
          icon={Package}
          title="Products & Scripts"
          badge={{ label: "Administrator only", tone: "neutral" }}
          backLink={{ href: "/admin", label: "Back to Management" }}
          description="Jeden souvislý skript na produkt: uložte koncept a publikujte zkontrolovanou verzi operátorům."
        />
        <ProductsTabs activeTab="scripts" />
        <ProductScriptManager
          products={result.products.map((product) => ({
            id: product.id,
            title: product.title,
            category: product.category,
            price: Number(product.price),
            currency: product.currency || "USD",
            description: product.description || "",
            image_url: product.image_url || "",
            in_stock: product.in_stock ?? true,
            created_at: product.created_at,
          }))}
          initialScripts={result.scripts}
          initialVersions={result.versions}
        />
      </div>
    );
  }

  const initialCatalog = await loadProductCatalog(context);
  const badge =
    initialCatalog.catalog.status === "ready"
      ? { label: `${initialCatalog.catalog.data.length} Products`, tone: "neutral" as const }
      : { label: "Catalog unavailable", tone: "unavailable" as const };

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <PageHeader
        icon={Package}
        title={isAdministrator ? "Products & Scripts" : "Product Catalog"}
        badge={badge}
        description="Katalog produktů, skriptů a námitkových karet pro operátory."
      />
      {isAdministrator && <ProductsTabs activeTab="catalog" />}
      <ProductCatalogClient role={context.role} initialCatalog={initialCatalog} />
    </div>
  );
}

// These shared primitives define the route's visual contract; interactive catalog surfaces live in ProductCatalogClient.
void Surface;
void Button;
void MetricCard;
void StatusAlert;
