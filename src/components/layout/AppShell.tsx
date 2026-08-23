"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "./CommandPalette";
import { OperatorIdentityProvider } from "./OperatorIdentityProvider";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isOperatorConsole = pathname === "/workspace";

  return (
    <OperatorIdentityProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Global Command K Palette */}
      <CommandPalette />

      {/* Postranní navigace */}
      <Sidebar compact={isOperatorConsole} />

      {/* Hlavní obsahová část */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header compact={isOperatorConsole} />
        
        <main className={`flex-1 overflow-y-auto bg-zinc-950 ${isOperatorConsole ? "p-4 sm:p-5" : "p-6"}`}>
          <div className={isOperatorConsole ? "max-w-none h-full" : "max-w-7xl mx-auto space-y-6"}>
            {children}
          </div>
        </main>

        {/* Footer status bar */}
        <footer className={`${isOperatorConsole ? "hidden" : "flex"} h-8 border-t border-zinc-800/80 bg-zinc-950 px-6 items-center justify-between text-[11px] text-zinc-400 select-none`}>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              Workspace shell active
            </span>
            <span>Live API latency unavailable</span>
          </div>
          <div>
            <span>Countdown CRM v0.1.0 • Built for Performance</span>
          </div>
        </footer>
      </div>
      </div>
    </OperatorIdentityProvider>
  );
}
