"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Layers, LogOut, Search, ShieldCheck } from "lucide-react";
import { blueprintEngine } from "@/lib/blueprints/engine";
import { BlueprintPickerModal } from "@/components/blueprints/BlueprintPickerModal";
import { useOperatorIdentity } from "./OperatorIdentityProvider";
import { getOperatorInitials, getOperatorRoleLabel } from "@/lib/operatorIdentity";
import { isTeamLeaderOrAdministrator } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";

function getHeaderSearchPlaceholder(role: Parameters<typeof isTeamLeaderOrAdministrator>[0], isLoading: boolean): string {
  if (isLoading) return "Open pages and commands... (Ctrl + K)";
  return role === "operator"
    ? "Search products or pages... (Ctrl + K)"
    : "Search leads, products, or pages... (Ctrl + K)";
}

export { getHeaderSearchPlaceholder };

export function AppHeader() {
  const router = useRouter();
  const { identity, isLoading: isIdentityLoading } = useOperatorIdentity();
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [activeBlueprintName, setActiveBlueprintName] = useState(
    blueprintEngine.getActiveBlueprint().name
  );
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSignOutPending, setIsSignOutPending] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const signOutButtonRef = useRef<HTMLButtonElement>(null);

  const rawOperatorName = identity?.name || (isIdentityLoading ? "Loading operator" : "Unknown operator");
  const initials = getOperatorInitials(rawOperatorName);
  const roleLabel = getOperatorRoleLabel(identity?.role || null);
  const canManageBlueprints = isTeamLeaderOrAdministrator(identity?.role);

  useEffect(() => {
    if (isIdentityLoading || !identity) return;
    let cancelled = false;
    void blueprintEngine.hydrateFromServer().then((blueprint) => {
      if (!cancelled && blueprint) setActiveBlueprintName(blueprint.name);
    }).catch((error) => {
      console.warn("[AppHeader] Active blueprint is unavailable:", error);
    });
    return () => {
      cancelled = true;
    };
  }, [identity, isIdentityLoading]);

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
        window.setTimeout(() => userMenuButtonRef.current?.focus(), 0);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => signOutButtonRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const openCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
  };

  const handleSignOut = async () => {
    setIsSignOutPending(true);
    setSignOutError(null);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setSignOutError("Sign out failed. Please try again.");
      setIsSignOutPending(false);
      return;
    }
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-zinc-800/80 bg-zinc-950/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={openCommandPalette}
        className="group relative min-w-0 flex-1 max-w-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        aria-label="Open command palette"
      >
        <span className="flex min-w-0 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2 text-xs text-zinc-400 transition-colors group-hover:border-zinc-700 group-hover:text-zinc-200">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{getHeaderSearchPlaceholder(identity?.role, isIdentityLoading)}</span>
          <kbd className="hidden shrink-0 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 sm:inline">Ctrl + K</kbd>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {canManageBlueprints && (
          <button
            type="button"
            onClick={() => setIsBlueprintModalOpen(true)}
            className="inline-flex max-w-48 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 xl:max-w-none"
            title="Change CRM industry blueprint"
          >
            <Layers className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden="true" />
            <span className="hidden truncate whitespace-nowrap xl:inline">{activeBlueprintName}</span>
            <span className="sr-only xl:hidden">Change CRM industry blueprint</span>
          </button>
        )}

        <div className="relative" ref={userMenuRef}>
          <button
            ref={userMenuButtonRef}
            type="button"
            onClick={() => {
              setSignOutError(null);
              setIsUserMenuOpen((open) => !open);
            }}
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
            aria-label={`${rawOperatorName}, ${roleLabel}. Open user menu`}
            className="flex items-center gap-2 rounded-xl border border-transparent py-1 pl-1 pr-1.5 text-left transition-colors hover:border-zinc-800 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:gap-3 sm:pl-3 sm:pr-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-200" aria-hidden="true">
              {initials}
            </div>
            <div className="hidden min-w-0 flex-col lg:flex">
              <span className="max-w-40 truncate text-xs font-medium leading-tight text-zinc-200">{rawOperatorName}</span>
              <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                {roleLabel}
              </span>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-zinc-500 sm:block" aria-hidden="true" />
          </button>

          {isUserMenuOpen && (
            <div
              role="menu"
              aria-label="User menu"
              className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl"
            >
              <div className="rounded-lg bg-zinc-900/70 px-3 py-2.5" role="presentation">
                <p className="truncate text-xs font-semibold text-zinc-100">{rawOperatorName}</p>
                <p className="mt-0.5 truncate text-[11px] text-zinc-400">{identity?.email || (isIdentityLoading ? "Loading email" : "Email unavailable")}</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-zinc-300">
                  <ShieldCheck className="h-3 w-3 text-zinc-400" aria-hidden="true" />
                  {roleLabel}
                </p>
              </div>
              {signOutError && <p className="px-2 py-2 text-[11px] text-rose-300" role="alert">{signOutError}</p>}
              <button
                ref={signOutButtonRef}
                type="button"
                role="menuitem"
                onClick={() => void handleSignOut()}
                disabled={isSignOutPending}
                className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-wait disabled:opacity-60"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                {isSignOutPending ? "Signing out..." : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>

      <BlueprintPickerModal
        isOpen={isBlueprintModalOpen}
        onClose={() => setIsBlueprintModalOpen(false)}
        onBlueprintApplied={(blueprint) => setActiveBlueprintName(blueprint.name)}
      />
    </header>
  );
}
