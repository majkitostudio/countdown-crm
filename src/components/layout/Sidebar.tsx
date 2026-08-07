"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PhoneCall,
  Users,
  Package,
  History,
  Settings,
  BarChart3,
  Radio,
  ChevronLeft,
  ChevronRight,
  Zap,
  Circle,
  GraduationCap,
  Workflow,
  Briefcase,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { schemaEngine } from "@/lib/schema/engine";

export type OperatorStatus = "ready" | "in_call" | "break";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Operator Console", href: "/workspace", icon: PhoneCall },
  { label: "AI Training", href: "/training", icon: GraduationCap },
  { label: "Leads & Contacts", href: "/leads", icon: Users },
  { label: "Deals & Pipelines", href: "/objects/deals", icon: Briefcase },
  { label: "Product Catalog", href: "/products", icon: Package },
  { label: "Call Logs", href: "/calls", icon: History },
  { label: "Workflows", href: "/workflows", icon: Workflow },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Security Audit Log", href: "/audit", icon: ShieldAlert },
  { label: "Live Monitor", href: "/monitor", icon: Radio },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [status, setStatus] = useState<OperatorStatus>("ready");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const getStatusColor = (s: OperatorStatus) => {
    switch (s) {
      case "ready":
        return "bg-emerald-500";
      case "in_call":
        return "bg-rose-500";
      case "break":
        return "bg-amber-500";
    }
  };

  const getStatusLabel = (s: OperatorStatus) => {
    switch (s) {
      case "ready":
        return "Ready for Calls";
      case "in_call":
        return "In Call";
      case "break":
        return "On Break";
    }
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-zinc-950/90 backdrop-blur-md border-r border-zinc-800/80 transition-all duration-300 z-30 select-none",
        isCollapsed ? "w-18" : "w-64"
      )}
    >
      {/* Brand Logo Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-800/80">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 shrink-0">
            <Zap className="w-4 h-4 text-zinc-100 fill-zinc-100/20" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-zinc-100 leading-none">
                COUNTDOWN
              </span>
              <span className="text-[10px] text-zinc-400 font-mono tracking-wider">
                AI CRM v0.1
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative",
                isActive
                  ? "bg-zinc-800/80 text-zinc-100 border border-zinc-700/50 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isActive
                    ? "text-zinc-100"
                    : "text-zinc-400 group-hover:text-zinc-200"
                )}
              />
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Operator Status Badge & Quick Control */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/50">
        <div className="relative">
          <button
            onClick={() => setStatusMenuOpen(!statusMenuOpen)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors text-left",
              isCollapsed && "justify-center px-0"
            )}
          >
            <span
              className={cn(
                "w-2.5 h-2.5 rounded-full shrink-0 transition-all",
                getStatusColor(status)
              )}
            />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Status
                </span>
                <span className="text-xs font-medium text-zinc-200 truncate">
                  {getStatusLabel(status)}
                </span>
              </div>
            )}
          </button>

          {/* Status Dropdown Menu */}
          {statusMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl p-1.5 space-y-1 z-50 text-xs">
              {(["ready", "in_call", "break"] as OperatorStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatus(s);
                    setStatusMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 transition-colors text-left",
                    status === s ? "text-zinc-100 bg-zinc-800/50" : "text-zinc-400"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      getStatusColor(s)
                    )}
                  />
                  <span>{getStatusLabel(s)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
