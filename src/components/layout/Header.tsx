"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, ShieldCheck, Layers } from "lucide-react";
import { blueprintEngine } from "@/lib/blueprints/engine";
import { BlueprintPickerModal } from "@/components/blueprints/BlueprintPickerModal";
import { OperatorPresenceBadge } from "./OperatorPresenceBadge";
import { useOperatorIdentity } from "./OperatorIdentityProvider";
import { getOperatorInitials, getOperatorRoleLabel } from "@/lib/operatorIdentity";

import { isDemoModeActive, setDemoMode } from "@/lib/demoMode";
import { createClient } from "@/lib/supabase/client";

export function Header() {
  const router = useRouter();
  const { identity, isLoading: isOperatorLoading } = useOperatorIdentity();
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [activeBlueprintName, setActiveBlueprintName] = useState(
    blueprintEngine.getActiveBlueprint().name
  );
  const [demoActive, setDemoActive] = useState<boolean>(() => isDemoModeActive());

  useEffect(() => {
    const handleStorageChange = () => {
      setDemoActive(isDemoModeActive());
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("countdown-demo-mode-changed", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("countdown-demo-mode-changed", handleStorageChange);
    };
  }, []);

  const rawOperatorName = identity?.name || (isOperatorLoading ? "Loading operator" : "Unknown operator");
  const nameParts = rawOperatorName.trim().split(" ");
  const firstName = nameParts[0] || "Unknown";
  const lastName = nameParts.slice(1).join(" ");
  const initials = getOperatorInitials(rawOperatorName);

  const handleSignOut = async () => {
    const { error } = await createClient().auth.signOut();
    if (error) {
      console.error("[Header] Sign out failed:", error);
      return;
    }
    router.replace("/login");
  };

  return (
    <header className="h-18 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input Button for Cmd+K */}
      <button
        onClick={() => {
          const event = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
          window.dispatchEvent(event);
        }}
        className="relative w-56 sm:w-72 lg:w-[22rem] xl:w-[26rem] text-left group shrink-0"
      >
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
        <input
          type="text"
          readOnly
          placeholder="Search leads, products, commands... (Cmd + K)"
          className="w-full bg-zinc-900/90 border border-zinc-800 group-hover:border-zinc-700 cursor-pointer rounded-xl pl-10 pr-12 py-2 text-xs text-zinc-200 placeholder:text-zinc-400 transition-colors"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 font-mono">
          ⌘K
        </div>
      </button>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">


        {/* Industry Blueprints Picker Button */}
        <button
          onClick={() => setIsBlueprintModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-zinc-700 text-xs font-medium transition-all cursor-pointer shrink-0 max-w-48 xl:max-w-none"
          title="Změnit oborový balíček CRM"
        >
          <Layers className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden xl:inline truncate whitespace-nowrap">{activeBlueprintName}</span>
        </button>

        {/* Live Multi-Operator Presence */}
        <div className="hidden xl:block"><OperatorPresenceBadge /></div>

        {/* Demo Mode Toggle Badge */}
        <button
          onClick={() => {
            const next = !demoActive;
            setDemoActive(next);
            setDemoMode(next);
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono transition-all cursor-pointer ${
            demoActive
              ? "bg-amber-950/40 border-amber-800/80 text-amber-300"
              : "bg-emerald-950/40 border-emerald-800/80 text-emerald-300"
          }`}
          title="Klikněte pro přepnutí mezi Sandbox Demo a Produkčním Supabase režimem"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${demoActive ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
          <span className="hidden sm:inline whitespace-nowrap">{demoActive ? "Demo Sandbox" : "Production DB"}</span>
        </button>

        {/* Live Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>System Online</span>
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-zinc-400 rounded-full" />
        </button>

        {/* User Profile */}
        <button
          type="button"
          onClick={handleSignOut}
          title="Odhlásit se"
          className="flex items-center gap-3 pl-3 border-l border-zinc-800 text-left hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-200">
            {initials}
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-xs font-medium text-zinc-200 leading-tight whitespace-nowrap">
              {firstName} {lastName}
            </span>
            <span className="text-[10px] text-zinc-400 flex items-center gap-1 whitespace-nowrap">
              <ShieldCheck className="w-3 h-3 text-zinc-400 shrink-0" />
              {getOperatorRoleLabel(identity?.role || null)}
            </span>
          </div>
        </button>
      </div>

      {/* Blueprint Picker Modal */}
      <BlueprintPickerModal
        isOpen={isBlueprintModalOpen}
        onClose={() => setIsBlueprintModalOpen(false)}
        onBlueprintApplied={(bp) => setActiveBlueprintName(bp.name)}
      />
    </header>
  );
}
