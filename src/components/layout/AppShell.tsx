"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Postranní navigace */}
      <Sidebar />

      {/* Hlavní obsahová část */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6 bg-zinc-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>

        {/* Footer status bar */}
        <footer className="h-8 border-t border-zinc-800/80 bg-zinc-950 px-6 flex items-center justify-between text-[11px] text-zinc-400 select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              API Connected
            </span>
            <span>Latency: <strong className="text-zinc-300 font-mono">14ms</strong></span>
          </div>
          <div>
            <span>Countdown CRM v0.1.0 • Built for Performance</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
