"use client";

import React, { useState, useEffect } from "react";
import { Package, Search, Plus, ShieldAlert, Layers, CheckCircle2, RefreshCw } from "lucide-react";
import { Product, ProductCategory, getProducts } from "@/lib/products";
import { ProductCard } from "@/components/products/ProductCard";
import { ObjectionDrawer } from "@/components/products/ObjectionDrawer";
import { ProductModal } from "@/components/products/ProductModal";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedObjectionProduct, setSelectedObjectionProduct] = useState<Product | null>(null);
  const [isObjectionDrawerOpen, setIsObjectionDrawerOpen] = useState<boolean>(false);
  const [selectedEditProduct, setSelectedEditProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadProducts = async () => {
    setIsLoading(true);
    const data = await getProducts();
    setProducts(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadProducts();
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
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Package className="w-6 h-6 text-emerald-400" />
            Product Catalog & Objection Engine
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage multi-category inventory, sales battle-cards, and cross-sell rules for call center agents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadProducts}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-800 transition-colors"
            title="Refresh Catalog Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleAddProduct}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md hover:shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4 text-zinc-950" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Products */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-400 block mb-1">Catalog Items</span>
            <span className="text-2xl font-extrabold text-zinc-100">{totalProducts}</span>
          </div>
          <div className="p-3 bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-700">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Stock Availability */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-400 block mb-1">In Stock Ratio</span>
            <span className="text-2xl font-extrabold text-emerald-400">
              {totalProducts > 0 ? Math.round((inStockCount / totalProducts) * 100) : 0}%
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Objection Rebuttal Count */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-400 block mb-1">Battle-Card Objections</span>
            <span className="text-2xl font-extrabold text-amber-400">{totalObjectionsCount}</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Inventory Total Value */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-400 block mb-1">Stock Total Value</span>
            <span className="text-2xl font-extrabold text-zinc-100 font-mono">
              ${totalCatalogValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <Layers className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-4 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
          {[
            { id: "all", label: "All Categories" },
            { id: "supplements", label: "Supplements" },
            { id: "cosmetics", label: "Cosmetics" },
            { id: "electronics", label: "Electronics" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
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
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
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

    </div>
  );
}
