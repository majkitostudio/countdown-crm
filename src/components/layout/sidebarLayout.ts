export function getSidebarClassName(isCollapsed: boolean, isMobileOpen: boolean): string {
  return [
    "relative z-30 flex h-screen shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md transition-transform duration-200 ease-interface select-none",
    isCollapsed ? "w-18" : "w-64",
    "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:w-72 max-md:-translate-x-full",
    isMobileOpen && "max-md:translate-x-0",
  ].filter(Boolean).join(" ");
}
