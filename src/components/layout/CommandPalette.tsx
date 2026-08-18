"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  Package,
  PhoneCall,
  LayoutDashboard,
  BarChart3,
  Settings,
  GraduationCap,
  Activity,
  ArrowRight,
  Sparkles,
  ClipboardList
} from "lucide-react";
import { getLeads, Lead } from "@/lib/leads";
import { getProducts, Product } from "@/lib/products";
import { useOperatorIdentity } from "./OperatorIdentityProvider";
import { canManageLeads, isTeamLeaderOrAdministrator } from "@/lib/auth/roles";

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const router = useRouter();
  const { identity } = useOperatorIdentity();

  // Listen for Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Load search data on open
  useEffect(() => {
    if (isOpen) {
      if (canManageLeads(identity?.role)) {
        getLeads().then(setLeads).catch(() => setLeads([]));
      }
      getProducts().then(setProducts);
    }
  }, [identity?.role, isOpen]);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    router.push(path);
    setIsOpen(false);
    setQuery("");
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
  const navItems = [
    { label: "Dashboard Overview", path: "/", icon: LayoutDashboard },
    { label: "Operator Console (Workspace)", path: "/workspace", icon: PhoneCall },
    { label: "Leads & Contacts", path: "/leads", icon: Users, roles: ["team_leader", "administrator"] },
    { label: "Product Catalog", path: "/products", icon: Package },
    { label: "Analytics BI", path: "/analytics", icon: BarChart3 },
    { label: "Live Team Monitor", path: "/monitor", icon: Activity },
    { label: "AI Roleplay Training", path: "/training", icon: GraduationCap },
    { label: "Team Leader Review", path: "/training/reviews", icon: ClipboardList, roles: ["team_leader", "administrator"] },
    { label: "Settings", path: "/settings", icon: Settings },
  ].filter((item) =>
    (!item.roles || (identity?.role && isTeamLeaderOrAdministrator(identity.role))) &&
    (!q || item.label.toLowerCase().includes(q))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-zinc-950/95 border border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col space-y-0">
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, lead name, product or page..."
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
                  <button
                    key={item.path}
                    onClick={() => navigateTo(item.path)}
                    className="w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200" />
                      <span>{item.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500" />
                  </button>
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
                <button
                  key={lead.id}
                  onClick={() => navigateTo(`/workspace?leadId=${lead.id}`)}
                  className="w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <div className="text-left">
                      <div className="font-semibold text-zinc-200">{lead.full_name}</div>
                      <div className="text-[10px] text-zinc-500">{lead.company || "Independent"} • {lead.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 font-mono text-[10px]">
                      Score: {lead.ai_score}
                    </span>
                    <span className="text-[10px] text-zinc-500 uppercase">Call Client ➔</span>
                  </div>
                </button>
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
                <button
                  key={prod.id}
                  onClick={() => navigateTo("/products")}
                  className="w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-cyan-400" />
                    <span>{prod.title}</span>
                  </div>
                  <span className="font-mono text-xs text-zinc-300">${prod.price}</span>
                </button>
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
            <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[10px]">↑↓</kbd>
            <span>Navigate</span>
            <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[10px] ml-2">↵</kbd>
            <span>Select</span>
          </div>
          <span className="flex items-center gap-1 text-zinc-400">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Attio-Speed Palette
          </span>
        </div>

      </div>
    </div>
  );
}
