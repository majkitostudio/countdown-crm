"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import { CommandPalette } from "./CommandPalette";
import { OperatorIdentityProvider } from "./OperatorIdentityProvider";
import { CallSessionProvider } from "./CallSessionProvider";
import { FloatingCallController } from "@/components/workspace/FloatingCallController";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isOperatorConsole = pathname === "/workspace";
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <CallSessionProvider>
    <OperatorIdentityProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Global command palette */}
      <CommandPalette />

      {/* Shared navigation */}
      {isMobileNavigationOpen ? <button type="button" aria-label="Close navigation" className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setIsMobileNavigationOpen(false)} /> : null}
      <Sidebar mobileOpen={isMobileNavigationOpen} onMobileOpenChange={setIsMobileNavigationOpen} />

      {/* Shared application canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <AppHeader onOpenNavigation={() => setIsMobileNavigationOpen(true)} />
        
        <main className={`flex-1 overflow-y-auto bg-zinc-950 px-4 py-5 sm:px-6 ${isOperatorConsole ? "sm:py-5" : "sm:py-6"}`}>
          <div className={isOperatorConsole ? "max-w-none h-full" : "max-w-7xl mx-auto space-y-6"}>
            {children}
          </div>
        </main>

      {/* Shell status */}
        <footer className={`${isOperatorConsole ? "hidden" : "flex"} h-8 border-t border-zinc-800/80 bg-zinc-950 px-6 items-center justify-between text-[11px] text-zinc-400 select-none`}>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              Workspace ready
            </span>
            <span>Live API latency unavailable</span>
          </div>
          <div>
            <span>Countdown CRM</span>
          </div>
        </footer>
      </div>
      <FloatingCallController />
      </div>
    </OperatorIdentityProvider>
    </CallSessionProvider>
  );
}
