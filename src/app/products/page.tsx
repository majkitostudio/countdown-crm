"use client";

import React, { useState, useEffect } from "react";
import { Package, Search, Plus, ShieldAlert, Tag, DollarSign, Upload, ArrowRightLeft, X } from "lucide-react";
import { Product, getProducts } from "@/lib/products";
import { ProductCard } from "@/components/products/ProductCard";
import { ObjectionDrawer } from "@/components/products/ObjectionDrawer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductModal } from "@/components/products/ProductModal";
import { listObjectionsAction } from "@/app/actions/objections";
import { deleteProductAction } from "@/app/actions/products";
import { listOrderProductCountsAction, reassignOrdersProductAction } from "@/app/actions/crm";

import { ObjectionEditorModal } from "@/components/products/ObjectionEditorModal";
import { CallTranscriptUploaderModal } from "@/components/products/CallTranscriptUploaderModal";
import type { ObjectionDTO } from "@/lib/dal/objections";
import type { ObjectionBattleCard } from "@/lib/objections";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [objectionCards, setObjectionCards] = useState<ObjectionDTO[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedObjectionProduct, setSelectedObjectionProduct] = useState<Product | null>(null);
  const [isObjectionDrawerOpen, setIsObjectionDrawerOpen] = useState<boolean>(false);
  const [selectedEditProduct, setSelectedEditProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [isObjectionEditorOpen, setIsObjectionEditorOpen] = useState<boolean>(false);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState<boolean>(false);
  const [selectedObjectionCard, setSelectedObjectionCard] = useState<ObjectionBattleCard | null>(null);
  const [reassignSourceProduct, setReassignSourceProduct] = useState<Product | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [catalogActionError, setCatalogActionError] = useState<string | null>(null);

  const loadProducts = async () => {
    try {
      const [data, cards, nextOrderCounts] = await Promise.all([
        getProducts(),
        listObjectionsAction(),
        listOrderProductCountsAction(),
      ]);
      setOrderCounts(nextOrderCounts);
    setObjectionCards(cards);
    const objectionsByProduct = new Map<string, typeof cards>();
    for (const card of cards) {
      if (card.product_id) {
        objectionsByProduct.set(card.product_id, [
          ...(objectionsByProduct.get(card.product_id) || []),
          card,
        ]);
      }
    }

      setProducts(data.map((product) => ({
        ...product,
        objections: (objectionsByProduct.get(product.id) || []).map((card) => ({
          id: card.id,
          product_id: card.product_id,
          objection_title: card.objection_title,
          rebuttal_args: card.rebuttal_args,
        })),
      })));
    } catch (error) {
      setCatalogActionError(error instanceof Error ? error.message : "Katalog se nepodařilo načíst.");
    }
  };

  useEffect(() => {
    async function loadInitialProducts() {
      await loadProducts();
    }

    void loadInitialProducts();
  }, []);

  const handleOpenObjections = (prod: Product) => {
    setSelectedObjectionProduct(prod);
    setIsObjectionDrawerOpen(true);
  };

  const handleEditProduct = (prod: Product) => {
    setSelectedEditProduct(prod);
    setIsProductModalOpen(true);
  };

  const handleAddProduct = () => {
    setSelectedEditProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenReassignOrders = (product: Product) => {
    const firstTarget = products.find((candidate) => candidate.id !== product.id);
    setReassignSourceProduct(product);
    setReassignTargetId(firstTarget?.id || "");
    setCatalogActionError(null);
  };

  const handleReassignOrders = async () => {
    if (!reassignSourceProduct || !reassignTargetId) return;

    setIsReassigning(true);
    setCatalogActionError(null);
    try {
      await reassignOrdersProductAction(reassignSourceProduct.id, reassignTargetId);
      setReassignSourceProduct(null);
      await loadProducts();
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
      await deleteProductAction(product.id);
      await loadProducts();
    } catch (error) {
      setCatalogActionError(error instanceof Error ? error.message : "Produkt se nepodařilo odstranit.");
    }
  };

  const handleAddObjectionScript = () => {
    setSelectedObjectionCard(null);
    setIsObjectionEditorOpen(true);
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

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategory === "all" || p.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  // Calculate Metrics
  const totalProducts = products.length;
  const inStockCount = products.filter((p) => p.in_stock).length;
  const totalObjectionsCount = objectionCards.length;
  const totalCatalogValue = products.reduce((acc, p) => acc + p.price * (p.stock_count || 50), 0);

  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      
      <PageHeader
        icon={Package}
        title="Product Catalog & Objection Engine"
        badge={{ label: `${totalProducts} Products`, tone: "neutral" }}
        description="Manage multi-category inventory, sales battle-cards, and cross-sell rules for call center operators."
        actions={
          <>
          <button
            onClick={() => setIsTranscriptModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-zinc-400" />
            <span>Synchronizovat hovory</span>
          </button>

          <button
            onClick={handleAddObjectionScript}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-zinc-400" />
            <span>+ New Objection Script</span>
          </button>

          <button
            onClick={handleAddProduct}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-medium text-xs hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-zinc-950" />
            <span>Add New Product</span>
          </button>
          </>
        }
      />

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total Products */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Catalog Items</span>
            <span className="text-2xl font-semibold text-zinc-100 tracking-tight font-sans">{totalProducts}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <Package className="w-4 h-4" />
          </div>
        </div>

        {/* Stock Availability */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">In Stock Ratio</span>
            <span className="text-2xl font-bold text-zinc-100 tracking-tight font-mono">
              {totalProducts > 0 ? Math.round((inStockCount / totalProducts) * 100) : 0}%
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <Tag className="w-4 h-4" />
          </div>
        </div>

        {/* Objections Registered */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Sales Battle-cards</span>
            <span className="text-2xl font-bold text-zinc-100 tracking-tight font-mono">{totalObjectionsCount}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        {/* Total Catalog Value */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Total Asset Value</span>
            <span className="text-2xl font-semibold text-zinc-100 tracking-tight font-mono">${totalCatalogValue.toLocaleString()}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl flex flex-wrap items-center justify-between gap-4">
        
        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
          {[
            { id: "all", label: "All Categories" },
            { id: "supplements", label: "Supplements" },
            { id: "cosmetics", label: "Cosmetics" },
            { id: "electronics", label: "Electronics" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeCategory === cat.id
                  ? "bg-zinc-800 text-zinc-100 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search products by title or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
          />
        </div>

      </div>

      {catalogActionError && (
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/20 text-xs text-rose-300" role="alert">
          {catalogActionError}
        </div>
      )}

      {/* Product Cards Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 text-xs">
          No products found matching your active filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onOpenObjections={handleOpenObjections}
              onEditProduct={handleEditProduct}
              orderCount={orderCounts[prod.id] || 0}
              onReassignOrders={handleOpenReassignOrders}
              onDeleteProduct={handleDeleteProduct}
            />
          ))}
        </div>
      )}

      {/* Objection Drawer */}
      <ObjectionDrawer
        product={selectedObjectionProduct}
        isOpen={isObjectionDrawerOpen}
        onClose={() => setIsObjectionDrawerOpen(false)}
        onProductUpdated={loadProducts}
        onEditObjection={handleEditObjection}
      />

      {/* Add / Edit Product Modal */}
      <ProductModal
        product={selectedEditProduct}
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSaved={loadProducts}
      />

      {/* Custom Objection Script Builder & Battlecard Editor Modal */}
      <ObjectionEditorModal
        initialCard={selectedObjectionCard}
        products={products}
        isOpen={isObjectionEditorOpen}
        onClose={() => setIsObjectionEditorOpen(false)}
        onSaved={loadProducts}
      />

      {/* Call Transcript CSV/JSON Sync Uploader Modal */}
      <CallTranscriptUploaderModal
        isOpen={isTranscriptModalOpen}
        onClose={() => setIsTranscriptModalOpen(false)}
      />

      {reassignSourceProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setReassignSourceProduct(null)}
          />
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-zinc-300" />
                <h3 className="text-base font-bold text-zinc-100">Přesměrovat objednávky</h3>
              </div>
              <button
                type="button"
                onClick={() => setReassignSourceProduct(null)}
                className="p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              {orderCounts[reassignSourceProduct.id] || 0} objednávek nyní odkazuje na
              <span className="text-zinc-200 font-medium"> {reassignSourceProduct.title}</span>.
              Historické částky zůstanou beze změny.
            </p>

            <label className="space-y-1.5 block text-xs">
              <span className="text-zinc-400 font-medium">Nový produkt</span>
              <select
                value={reassignTargetId}
                onChange={(event) => setReassignTargetId(event.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none"
              >
                <option value="">Vyberte produkt...</option>
                {products
                  .filter((product) => product.id !== reassignSourceProduct.id)
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title} — ${product.price.toFixed(2)}
                    </option>
                  ))}
              </select>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setReassignSourceProduct(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-medium rounded-xl border border-zinc-800 cursor-pointer"
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={() => void handleReassignOrders()}
                disabled={!reassignTargetId || isReassigning}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 disabled:cursor-not-allowed text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {isReassigning ? "Ukládám..." : "Přesměrovat objednávky"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
