"use client";

import React, { useState, useEffect } from "react";
import { Package, Search, Plus, ShieldAlert, Layers, CheckCircle2, RefreshCw, Tag, DollarSign, Upload } from "lucide-react";
import { Product, ProductCategory, getProducts } from "@/lib/products";
import { ProductCard } from "@/components/products/ProductCard";
import { ObjectionDrawer } from "@/components/products/ObjectionDrawer";
import { ProductModal } from "@/components/products/ProductModal";

import { ObjectionEditorModal } from "@/components/products/ObjectionEditorModal";
import { CallTranscriptUploaderModal } from "@/components/products/CallTranscriptUploaderModal";
import { ObjectionBattleCard } from "@/lib/objections";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedObjectionProduct, setSelectedObjectionProduct] = useState<Product | null>(null);
  const [isObjectionDrawerOpen, setIsObjectionDrawerOpen] = useState<boolean>(false);
  const [selectedEditProduct, setSelectedEditProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [isObjectionEditorOpen, setIsObjectionEditorOpen] = useState<boolean>(false);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState<boolean>(false);
  const [selectedObjectionCard, setSelectedObjectionCard] = useState<ObjectionBattleCard | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadProducts = async () => {
    setIsLoading(true);
    const data = await getProducts();
    setProducts(data);
    setIsLoading(false);
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

  const handleAddObjectionScript = () => {
    setSelectedObjectionCard(null);
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
  const totalObjectionsCount = products.reduce((acc, p) => acc + (p.objections ? p.objections.length : 0), 0);
  const totalCatalogValue = products.reduce((acc, p) => acc + p.price * (p.stock_count || 50), 0);

  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      
      {/* Page Header Hero Banner */}
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2.5">
              <Package className="w-5 h-5 text-zinc-400" />
              Product Catalog & Objection Engine
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
              {totalProducts} Products
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Manage multi-category inventory, sales battle-cards, and cross-sell rules for call center agents.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </div>

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

    </div>
  );
}
