"use client";

import React from "react";
import { ShieldAlert, Edit3, Layers, ArrowRightLeft, Trash2, ImageOff } from "lucide-react";
import { Product } from "@/lib/products";
import { formatCurrencyAmount } from "@/lib/currency";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

interface ProductCardProps {
  product: Product;
  onOpenObjections: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  orderCount: number;
  onReassignOrders: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
}

export function ProductCard({
  product,
  onOpenObjections,
  onEditProduct,
  orderCount,
  onReassignOrders,
  onDeleteProduct,
}: ProductCardProps) {
  const objectionsCount = product.objections ? product.objections.length : 0;
  const crossSellCount = product.cross_sell_ids ? product.cross_sell_ids.length : 0;

  return (
    <Surface variant="page">
      <div className="group flex h-full flex-col overflow-hidden transition-colors hover:bg-zinc-900/40">
      
      {/* Product Image Box */}
      <div className="relative h-48 w-full bg-zinc-950 overflow-hidden">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-600" role="img" aria-label={`${product.title}: no product image`}>
            <ImageOff className="h-8 w-8" aria-hidden="true" />
            <span className="text-xs font-medium">No product image</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/30" />

        {/* Category Pill Top Left */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-0.5 rounded-md text-xs font-mono uppercase tracking-wider border backdrop-blur-md bg-zinc-900 text-zinc-300 border-zinc-800">
            {product.category}
          </span>
        </div>

        {/* Stock Badge Top Right */}
        <div className="absolute top-3 right-3">
          {product.in_stock ? (
            <StatusBadge tone="success">
              In Stock ({product.stock_count ?? 50})
            </StatusBadge>
          ) : (
            <StatusBadge tone="danger">
              Out of Stock
            </StatusBadge>
          )}
        </div>

        {/* Price Tag Bottom Right */}
        <div className="absolute bottom-3 right-3 bg-zinc-950/90 border border-zinc-800 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-md">
          <span className="text-lg font-bold text-zinc-100 font-mono">
            {formatCurrencyAmount(product.price, product.currency)}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-semibold text-zinc-100 text-base group-hover:text-zinc-300 transition-colors line-clamp-1">
            {product.title}
          </h3>
          <p className="text-xs text-zinc-400 line-clamp-2 mt-1.5 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Feature & Objection Badges */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
          
          {/* Objections Counter Badge */}
          <Button
            variant="secondary"
            onClick={() => onOpenObjections(product)}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
            <span>{objectionsCount} Battle-Card Rebuttals</span>
          </Button>

          {/* Cross Sell Count */}
          {crossSellCount > 0 && (
            <span className="text-zinc-400 flex items-center gap-1 text-[11px] font-mono">
              <Layers className="w-3 h-3 text-zinc-400" />
              <span>{crossSellCount} Cross-sells</span>
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="secondary"
            onClick={() => onOpenObjections(product)}
            className="w-full"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
            <span>View Objections</span>
          </Button>

          <Button
            variant="secondary"
            onClick={() => onEditProduct(product)}
            title="Edit Product"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </Button>

          {orderCount > 0 && (
            <Button
              variant="secondary"
              onClick={() => onReassignOrders(product)}
              title={`Reassign ${orderCount} order(s)`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </Button>
          )}

          <Button
            variant="danger"
            onClick={() => onDeleteProduct(product)}
            title="Delete product"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

      </div>

      </div>
    </Surface>
  );
}
