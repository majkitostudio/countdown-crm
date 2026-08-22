import Link from "next/link";
import { ArrowLeft, FileText, LockKeyhole } from "lucide-react";
import { ProductScriptManager } from "@/components/settings/ProductScriptManager";
import { listProductScriptsForWorkspace } from "@/lib/dal/productScripts";
import { DataAccessError } from "@/lib/dal/errors";
import { listProductsForWorkspace } from "@/lib/dal/products";
import { requireWorkspaceRole } from "@/lib/dal/workspace";

type ProductScriptsLoadResult =
  | {
      products: Awaited<ReturnType<typeof listProductsForWorkspace>>;
      scripts: Awaited<ReturnType<typeof listProductScriptsForWorkspace>>;
    }
  | { error: unknown };

async function loadProductScripts(): Promise<ProductScriptsLoadResult> {
  try {
    await requireWorkspaceRole(["administrator"]);
    const [products, scripts] = await Promise.all([
      listProductsForWorkspace(),
      listProductScriptsForWorkspace(),
    ]);

    return { products, scripts };
  } catch (error) {
    return { error };
  }
}

export default async function ProductScriptsPage() {
  const result = await loadProductScripts();

  if (!("error" in result)) {
    return (
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
      />
    );
  }

  const isForbidden = result.error instanceof DataAccessError && result.error.code === "FORBIDDEN";
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
      {isForbidden ? (
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
      ) : (
        <FileText className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
      )}
      <h1 className="text-base font-semibold text-zinc-100">Script administration unavailable</h1>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
        {isForbidden
          ? "Only a workspace Administrator can edit approved product scripts."
          : "The approved product scripts could not be loaded right now."}
      </p>
      <Link
        href="/settings"
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Settings
      </Link>
    </div>
  );
}
