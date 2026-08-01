"use client";

import { Search, Bell, User, ShieldCheck } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input */}
      <div className="relative w-72 sm:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search leads, products, orders... (Ctrl + K)"
          className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-zinc-600 focus:outline-none rounded-lg pl-9 pr-12 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-400 transition-colors"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono">
          ⌘K
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Live Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Online</span>
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-200">
            JD
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-xs font-medium text-zinc-200 leading-tight">
              John Doe
            </span>
            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-zinc-400" />
              Senior Agent
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
