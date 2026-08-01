"use client";

import React, { useState, useEffect } from "react";
import { X, Package, DollarSign, Image as ImageIcon, Tag, Check } from "lucide-react";
import { Product, ProductCategory, createProduct, updateProduct } from "@/lib/products";

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductModal({ product, isOpen, onClose, onSaved }: ProductModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ProductCategory>("supplements");
  const [price, setPrice] = useState<number>(49.99);
  const [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [stockCount, setStockCount] = useState<number>(50);
  const [inStock, setInStock] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setTitle(product.title);
      setCategory(product.category);
      setPrice(product.price);
      setCurrency(product.currency || "USD");
      setDescription(product.description);
      setImageUrl(product.image_url);
      setStockCount(product.stock_count ?? 50);
      setInStock(product.in_stock);
    } else {
      setTitle("");
      setCategory("supplements");
      setPrice(49.99);
      setCurrency("USD");
      setDescription("");
      setImageUrl("https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80");
      setStockCount(50);
      setInStock(true);
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    const dataPayload: Partial<Product> = {
      title,
      category,
      price: Number(price),
      currency,
      description,
      image_url: imageUrl || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80",
      stock_count: Number(stockCount),
      in_stock: inStock,
    };

    if (product) {
      await updateProduct(product.id, dataPayload);
    } else {
      await createProduct(dataPayload);
    }

    setIsSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Package className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-zinc-100">
              {product ? "Edit Product" : "Add New Product"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Title Input */}
          <div>
            <label className="text-zinc-400 block mb-1 font-medium">Product Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Bio-Boost Anti-Aging Stack"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Category & Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-700"
              >
                <option value="supplements">Supplements</option>
                <option value="cosmetics">Cosmetics</option>
                <option value="electronics">Electronics</option>
              </select>
            </div>

            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Price (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-7 pr-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Image URL Input */}
          <div>
            <label className="text-zinc-400 block mb-1 font-medium">Product Image URL</label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-zinc-400 block mb-1 font-medium">Description & Benefits</label>
            <textarea
              rows={3}
              placeholder="Describe key ingredients, usage instructions, and value proposition..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Stock Count & Availability */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Stock Quantity</label>
              <input
                type="number"
                value={stockCount}
                onChange={(e) => setStockCount(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="inStockCheck"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="inStockCheck" className="text-zinc-200 font-medium cursor-pointer">
                In Stock & Available
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 -mx-6 -mb-6 mt-6 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : product ? "Update Product" : "Create Product"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
