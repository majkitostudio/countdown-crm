"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  Package,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { getLeads, Lead } from "@/lib/leads";
import { getProducts, Product } from "@/lib/products";
import { useOperatorIdentity } from "./OperatorIdentityProvider";
import { canManageLeads } from "@/lib/auth/roles";
import { getAllowedNavigationCommands, getCommandPalettePlaceholder } from "./headerNavigation";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

export { getAllowedNavigationCommands, getCommandPalettePlaceholder } from "./headerNavigation";

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const { identity } = useOperatorIdentity();

  const closePalette = useCallback(() => {
    openerRef.current?.focus();
    setIsOpen(false);
    setQuery("");
  }, []);

  const openPalette = useCallback(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsOpen(true);
  }, []);

  // Listen for Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          closePalette();
        } else {
          openPalette();
        }
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        closePalette();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closePalette, isOpen, openPalette]);

  useEffect(() => {
    if (!isOpen) return;

    searchInputRef.current?.focus();

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", trapFocus);
    return () => window.removeEventListener("keydown", trapFocus);
  }, [isOpen]);

  // Load search data on open
  useEffect(() => {
    if (isOpen) {
      if (canManageLeads(identity?.role)) {
        getLeads().then(setLeads).catch(() => setLeads([]));
      }
      getProducts().then(setProducts).catch(() => setProducts([]));
    }
  }, [identity?.role, isOpen]);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    router.push(path);
    closePalette();
  };

  const q = query.toLowerCase().trim();

  // Filtered Leads
  const filteredLeads = (canManageLeads(identity?.role) ? leads : [])
    .filter((l) => !q || l.full_name.toLowerCase().includes(q) || l.phone.includes(q) || (l.company && l.company.toLowerCase().includes(q)))
    .slice(0, 4);

  // Filtered Products
  const filteredProducts = products
    .filter((p) => !q || p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
    .slice(0, 3);

  // Navigation Items
  const navItems = getAllowedNavigationCommands(identity?.role).filter((item) =>
    !q || item.label.toLowerCase().includes(q)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 pb-8 pt-24 backdrop-blur-md animate-in fade-in duration-150"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePalette();
      }}
    >
      <div ref={dialogRef} className="w-full max-w-2xl">
      <Surface
        variant="overlay"
        className="w-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
      >
        <h2 id="command-palette-title" className="sr-only">Command palette</h2>
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-400" />
          <input
            type="text"
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={getCommandPalettePlaceholder(identity?.role)}
            aria-label="Search commands and available records"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          <kbd className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-zinc-400">
            ESC
          </kbd>
        </div>

        {/* Results List Body */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          
          {/* Quick Navigation Section */}
          {navItems.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-3 block">
                Pages & Navigation
              </span>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant="quiet"
                    onClick={() => navigateTo(item.path)}
                    className="w-full"
                  >
                    <span className="flex w-full items-center justify-between">
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-zinc-400" />
                      <span>{item.label}</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </span>
                  </Button>
                );
              })}
            </div>
          )}

          {/* Matching Leads Section */}
          {filteredLeads.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-3 block">
                Leads & Contacts ({filteredLeads.length})
              </span>
              {filteredLeads.map((lead) => (
                <Button
                  key={lead.id}
                  variant="quiet"
                  onClick={() => navigateTo(`/workspace?leadId=${lead.id}`)}
                  className="w-full"
                >
                  <span className="flex w-full items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-zinc-400" />
                    <span className="text-left">
                      <span className="block font-semibold text-zinc-200">{lead.full_name}</span>
                      <span className="block text-[10px] text-zinc-500">{lead.company || "Independent"} • {lead.phone}</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge tone="neutral">Score: {lead.ai_score}</StatusBadge>
                    <span className="text-[10px] text-zinc-500 uppercase">Call Client ➔</span>
                  </span>
                  </span>
                </Button>
              ))}
            </div>
          )}

          {/* Matching Products Section */}
          {filteredProducts.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-3 block">
                Products ({filteredProducts.length})
              </span>
              {filteredProducts.map((prod) => (
                <Button
                  key={prod.id}
                  variant="quiet"
                  onClick={() => navigateTo("/products")}
                  className="w-full"
                >
                  <span className="flex w-full items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-zinc-400" />
                    <span>{prod.title}</span>
                  </span>
                  <span className="font-mono text-xs text-zinc-300">${prod.price}</span>
                  </span>
                </Button>
              ))}
            </div>
          )}

          {navItems.length === 0 && filteredLeads.length === 0 && filteredProducts.length === 0 && (
            <div className="text-center py-8 text-xs text-zinc-500">
              No matching commands or records found for &quot;{query}&quot;
            </div>
          )}

        </div>

        {/* Footer Shortcut Bar */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-2">
            <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
            <span>Close</span>
          </div>
          <span className="flex items-center gap-1 text-zinc-400">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Attio-Speed Palette
          </span>
        </div>

      </Surface>
      </div>
    </div>
  );
}
