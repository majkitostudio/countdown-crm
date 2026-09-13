"use client";

import React, { useState, useEffect } from "react";
import { X, Package, Check } from "lucide-react";
import { Product, ProductCategory, createProduct, updateProduct } from "@/lib/products";
import { Button } from "@/components/ui/Button";
import { StatusAlert } from "@/components/ui/Status";
import { Dialog } from "@/components/ui/Dialog";
import { FieldLabel, SelectField, TextAreaField, TextField } from "@/components/ui/Field";

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
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setSaveError(null);
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
    }, 0);
    return () => clearTimeout(timer);
  }, [product, isOpen]);

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

    try {
      if (product) {
        await updateProduct(product.id, dataPayload);
      } else {
        await createProduct(dataPayload);
      }

      onSaved();
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Product could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} aria-labelledby="product-dialog-title" size="lg">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 text-zinc-300 rounded-lg border border-zinc-800">
              <Package className="w-5 h-5" />
            </div>
            <h2 id="product-dialog-title" className="text-base font-semibold text-zinc-100">
              {product ? "Edit Product" : "Add New Product"}
            </h2>
          </div>
          <Button
            variant="quiet"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Title Input */}
          <div>
            <FieldLabel htmlFor="product-title">Product Title *</FieldLabel>
            <TextField
              id="product-title"
              type="text"
              required
              placeholder="e.g. Bio-Boost Anti-Aging Stack"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Category & Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="product-category">Category *</FieldLabel>
              <SelectField
                id="product-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
              >
                <option value="supplements">Supplements</option>
                <option value="cosmetics">Cosmetics</option>
                <option value="electronics">Electronics</option>
              </SelectField>
            </div>

            <div>
              <FieldLabel htmlFor="product-price">Price (USD) *</FieldLabel>
                <TextField
                  id="product-price"
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
            </div>
          </div>

          {/* Image URL Input */}
          <div>
            <FieldLabel htmlFor="product-image-url">Product Image URL</FieldLabel>
            <TextField
              id="product-image-url"
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <FieldLabel htmlFor="product-description">Description & Benefits</FieldLabel>
            <TextAreaField
              id="product-description"
              rows={3}
              placeholder="Describe key ingredients, usage instructions, and value proposition..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Stock Count & Availability */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
            <div>
              <FieldLabel htmlFor="product-stock-count">Stock Quantity</FieldLabel>
              <TextField
                id="product-stock-count"
                type="number"
                value={stockCount}
                onChange={(e) => setStockCount(Number(e.target.value))}
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
          {saveError ? (
            <StatusAlert tone="danger">
              {saveError}
            </StatusAlert>
          ) : null}

          <div className="px-6 py-4 -mx-6 -mb-6 mt-6 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
            <Button
              variant="quiet"
              type="button"
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              type="submit"
              disabled={isSaving}
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : product ? "Update Product" : "Create Product"}</span>
            </Button>
          </div>

        </form>

    </Dialog>
  );
}
