"use client";

import React, { useMemo, useState } from "react";
import { ArrowRightLeft, Plus, Search, ShieldAlert, Upload, X } from "lucide-react";
import { deleteProductAction } from "@/app/actions/products";
import { reassignOrdersProductAction } from "@/app/actions/crm";
import { loadProductCatalogAction } from "@/app/actions/productCatalog";
import { ObjectionDrawer } from "@/components/products/ObjectionDrawer";
import { ObjectionEditorModal } from "@/components/products/ObjectionEditorModal";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductModal } from "@/components/products/ProductModal";
import { CallTranscriptUploaderModal } from "@/components/products/CallTranscriptUploaderModal";
import { formatCurrencyAmount } from "@/lib/currency";
import { refreshProductCatalogAfterMutation } from "@/lib/productCatalogMutation";
import { resolveSelectedCatalogProduct } from "@/lib/productCatalogViewState";
import type { ProductCatalogLoadResult } from "@/lib/dal/productCatalog";
import type { WorkspaceRole } from "@/lib/auth/roles";
import type { ObjectionBattleCard } from "@/lib/objections";
import type { Product } from "@/lib/products";

interface ProductCatalogClientProps {
  role: WorkspaceRole;
  initialCatalog: ProductCatalogLoadResult;
}

export function ProductCatalogClient({ role, initialCatalog }: ProductCatalogClientProps) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedObjectionProductId, setSelectedObjectionProductId] = useState<string | null>(null);
  const [isObjectionDrawerOpen, setIsObjectionDrawerOpen] = useState(false);
  const [selectedEditProduct, setSelectedEditProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isObjectionEditorOpen, setIsObjectionEditorOpen] = useState(false);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [selectedObjectionCard, setSelectedObjectionCard] = useState<ObjectionBattleCard | null>(null);
  const [reassignSourceProduct, setReassignSourceProduct] = useState<Product | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [catalogActionError, setCatalogActionError] = useState<string | null>(null);
  const canManageProducts = role === "team_leader" || role === "administrator";
  const objectionsAvailable = catalog.objections.requested && catalog.objections.source.status === "ready";
  const orderCountsAvailable = catalog.orderCounts.requested && catalog.orderCounts.source.status === "ready";

  const objectionCards = useMemo(() => {
    if (!catalog.objections.requested || catalog.objections.source.status !== "ready") return [];
    return catalog.objections.source.data;
  }, [catalog]);
  const orderCounts = useMemo(() => {
    if (!catalog.orderCounts.requested || catalog.orderCounts.source.status !== "ready") return {};
    return catalog.orderCounts.source.data;
  }, [catalog]);
  const products = useMemo(() => {
    if (catalog.catalog.status !== "ready") return [];

    const objectionsByProduct = new Map<string, typeof objectionCards>();
    for (const card of objectionCards) {
      if (card.product_id) {
        objectionsByProduct.set(card.product_id, [...(objectionsByProduct.get(card.product_id) || []), card]);
      }
    }

    return catalog.catalog.data.map((product) => ({
      ...product,
      objections: (objectionsByProduct.get(product.id) || []).map((card) => ({
        id: card.id,
        product_id: card.product_id,
        objection_title: card.objection_title,
        rebuttal_args: card.rebuttal_args,
      })),
    }));
  }, [catalog, objectionCards]);
  const selectedObjectionProduct = useMemo(
    () => resolveSelectedCatalogProduct(products, selectedObjectionProductId),
    [products, selectedObjectionProductId],
  );

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (activeCategory === "all" || product.category === activeCategory)
      && (!query || [product.title, product.description, product.category].some((value) => value.toLowerCase().includes(query)));
  });

  const reloadCatalog = async () => {
    try {
      setCatalog(await loadProductCatalogAction());
      setCatalogActionError(null);
    } catch (error) {
      setCatalogActionError(error instanceof Error ? error.message : "Katalog se nepodařilo načíst.");
      throw error;
    }
  };

  const handleOpenReassignOrders = (product: Product) => {
    setReassignSourceProduct(product);
    setReassignTargetId(products.find((candidate) => candidate.id !== product.id)?.id || "");
    setCatalogActionError(null);
  };

  const handleReassignOrders = async () => {
    if (!reassignSourceProduct || !reassignTargetId) return;
    setIsReassigning(true);
    setCatalogActionError(null);
    try {
      await refreshProductCatalogAfterMutation(
        () => reassignOrdersProductAction(reassignSourceProduct.id, reassignTargetId),
        reloadCatalog,
      );
      setReassignSourceProduct(null);
    } catch (error) {
      setCatalogActionError(error instanceof Error ? error.message : "Objednávky se nepodařilo upravit.");
    } finally {
      setIsReassigning(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Opravdu odstranit produkt „${product.title}“?`)) return;
    setCatalogActionError(null);
    try {
      await refreshProductCatalogAfterMutation(() => deleteProductAction(product.id), reloadCatalog);
    } catch (error) {
      setCatalogActionError(error instanceof Error ? error.message : "Produkt se nepodařilo odstranit.");
    }
  };

  const handleEditObjection = (id: string) => {
    const card = objectionCards.find((candidate) => candidate.id === id);
    if (!card) return;
    setSelectedObjectionCard({
      id: card.id,
      product_id: card.product_id,
      objection_title: card.objection_title,
      rebuttal_arguments: card.rebuttal_args,
      created_at: card.created_at,
    });
    setIsObjectionDrawerOpen(false);
    setIsObjectionEditorOpen(true);
  };

  if (catalog.catalog.status === "unavailable") {
    return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center text-zinc-400">Product catalog is temporarily unavailable.</div>;
  }

  return (
    <div className="space-y-8">
      {canManageProducts && <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => setIsTranscriptModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs text-zinc-300"><Upload className="h-4 w-4" />Synchronizovat hovory</button>
          <button onClick={() => { setSelectedObjectionCard(null); setIsObjectionEditorOpen(true); }} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs text-zinc-300"><ShieldAlert className="h-4 w-4" />+ New Objection Script</button>
          <button onClick={() => { setSelectedEditProduct(null); setIsProductModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-2.5 text-xs font-medium text-zinc-950"><Plus className="h-4 w-4" />Add New Product</button>
        </div>}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1 text-xs">
          {["all", "supplements", "cosmetics", "electronics"].map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={activeCategory === category ? "rounded-md bg-zinc-800 px-3 py-1 text-zinc-100" : "px-3 py-1 text-zinc-400"}>{category === "all" ? "All Categories" : category}</button>)}
        </div>
        <label className="relative max-w-xs flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search products by title or keywords..." className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-4 text-xs text-zinc-200" /></label>
      </div>

      {catalogActionError && <div role="alert" className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-4 text-xs text-rose-300">{catalogActionError}</div>}
      {filteredProducts.length === 0 ? <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center text-xs text-zinc-500">No products found matching your active filter.</div> : <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} role={role} objectionsAvailable={objectionsAvailable} orderCountsAvailable={orderCountsAvailable} onOpenObjections={(selected) => { setSelectedObjectionProductId(selected.id); setIsObjectionDrawerOpen(true); }} onEditProduct={(selected) => { setSelectedEditProduct(selected); setIsProductModalOpen(true); }} orderCount={orderCounts[product.id] || 0} onReassignOrders={handleOpenReassignOrders} onDeleteProduct={handleDeleteProduct} />)}</div>}

      <ObjectionDrawer product={selectedObjectionProduct} isOpen={isObjectionDrawerOpen} canManage={canManageProducts} objectionsAvailable={objectionsAvailable} onClose={() => setIsObjectionDrawerOpen(false)} onProductUpdated={reloadCatalog} onEditObjection={handleEditObjection} />
      {canManageProducts && <>
        <ProductModal product={selectedEditProduct} isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSaved={reloadCatalog} />
        <ObjectionEditorModal initialCard={selectedObjectionCard} products={products} isOpen={isObjectionEditorOpen} onClose={() => setIsObjectionEditorOpen(false)} onSaved={reloadCatalog} />
        <CallTranscriptUploaderModal isOpen={isTranscriptModalOpen} onClose={() => setIsTranscriptModalOpen(false)} />
      </>}

      {canManageProducts && reassignSourceProduct && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/70" onClick={() => setReassignSourceProduct(null)} /><div className="relative w-full max-w-lg space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><div className="flex items-center justify-between border-b border-zinc-800 pb-3"><h3 className="flex items-center gap-2 text-base font-bold text-zinc-100"><ArrowRightLeft className="h-5 w-5" />Přesměrovat objednávky</h3><button type="button" onClick={() => setReassignSourceProduct(null)}><X className="h-4 w-4 text-zinc-400" /></button></div><p className="text-xs text-zinc-400">{orderCounts[reassignSourceProduct.id]} objednávek nyní odkazuje na <span className="font-medium text-zinc-200">{reassignSourceProduct.title}</span>.</p><label className="block space-y-1.5 text-xs"><span className="text-zinc-400">Nový produkt</span><select value={reassignTargetId} onChange={(event) => setReassignTargetId(event.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100"><option value="">Vyberte produkt...</option>{products.filter((product) => product.id !== reassignSourceProduct.id).map((product) => <option key={product.id} value={product.id}>{product.title} — {formatCurrencyAmount(product.price, product.currency)}</option>)}</select></label><div className="flex justify-end gap-2 border-t border-zinc-800 pt-3"><button type="button" onClick={() => setReassignSourceProduct(null)} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-400">Zrušit</button><button type="button" onClick={() => void handleReassignOrders()} disabled={!reassignTargetId || isReassigning} className="rounded-xl bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 disabled:bg-zinc-800">{isReassigning ? "Ukládám..." : "Přesměrovat objednávky"}</button></div></div></div>}
    </div>
  );
}
