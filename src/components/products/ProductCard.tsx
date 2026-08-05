"use client";

import React from "react";
import Image from "next/image";
import { Package, ShieldAlert, Sparkles, CheckCircle, XCircle, Edit3, DollarSign, Layers } from "lucide-react";
import { Product } from "@/lib/products";

interface ProductCardProps {
  product: Product;
  onOpenObjections: (product: Product) => void;
  onEditProduct: (product: Product) => void;
}

export function ProductCard({ product, onOpenObjections, onEditProduct }: ProductCardProps) {
  const getCategoryBadge = (cat: Product["category"]) => {
    return "bg-zinc-900 text-zinc-300 border-zinc-800 font-mono";
  };

  const objectionsCount = product.objections ? product.objections.length : 0;
  const crossSellCount = product.cross_sell_ids ? product.cross_sell_ids.length : 0;

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 hover:border-zinc-700/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm transition-all flex flex-col group">
      
      {/* Product Image Box */}
      <div className="relative h-48 w-full bg-zinc-950 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image_url}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/30" />

        {/* Category Pill Top Left */}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-0.5 rounded-md text-xs font-mono uppercase tracking-wider border backdrop-blur-md ${getCategoryBadge(product.category)}`}>
            {product.category}
          </span>
        </div>

        {/* Stock Badge Top Right */}
        <div className="absolute top-3 right-3">
          {product.in_stock ? (
            <span className="px-2.5 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-md text-xs font-mono flex items-center gap-1.5 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              In Stock ({product.stock_count ?? 50})
            </span>
          ) : (
            <span className="px-2.5 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-md text-xs font-mono flex items-center gap-1.5 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Out of Stock
            </span>
          )}
        </div>

        {/* Price Tag Bottom Right */}
        <div className="absolute bottom-3 right-3 bg-zinc-950/90 border border-zinc-800 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-md">
          <span className="text-lg font-bold text-zinc-100 font-mono">
            ${product.price.toFixed(2)}
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
          <button
            onClick={() => onOpenObjections(product)}
            className="flex items-center gap-1.5 text-zinc-300 hover:text-zinc-100 font-mono px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
            <span>{objectionsCount} Battle-Card Rebuttals</span>
          </button>

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
          <button
            onClick={() => onOpenObjections(product)}
            className="flex-1 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-zinc-800 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
            <span>View Objections</span>
          </button>

          <button
            onClick={() => onEditProduct(product)}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors border border-zinc-700"
            title="Edit Product"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
}
