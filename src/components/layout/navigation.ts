import {
  BarChart3,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  History,
  LayoutDashboard,
  Package,
  PhoneCall,
  Settings,
  ShieldAlert,
  ShoppingBag,

  Users,
  WalletCards,
  Workflow,
} from "lucide-react";
import type { WorkspaceRole } from "@/lib/auth/roles";

/**
 * The single list of destinations that are available in the pilot.
 *
 * Both the sidebar and the command palette read from this list. A page may
 * still protect itself on the server, but it must not be advertised here to a
 * role that cannot use it. Pilot surfaces without a connected data source,
 * such as Live Monitor, are intentionally omitted.
 */
export interface WorkspaceNavigationItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  section: "Práce" | "Tým" | "Administrace";
  roles?: WorkspaceRole[];
}

const NAVIGATION_ITEMS: readonly WorkspaceNavigationItem[] = [
  { label: "Přehled", href: "/dashboard", icon: LayoutDashboard, section: "Práce", roles: ["team_leader", "administrator"] },
  { label: "Pracovní konzole", href: "/workspace", icon: PhoneCall, section: "Práce" },
  { label: "Objednávky", href: "/orders", icon: ShoppingBag, section: "Práce" },
  { label: "Plánovač", href: "/calendar", icon: CalendarDays, section: "Práce" },
  { label: "AI školení", href: "/training", icon: GraduationCap, section: "Práce" },
  { label: "Katalog produktů", href: "/products", icon: Package, section: "Práce" },
  { label: "Hovory", href: "/calls", icon: History, section: "Práce" },
  { label: "Peněženka", href: "/wallet", icon: WalletCards, section: "Práce" },
  { label: "Kontrola hovorů", href: "/training/reviews", icon: ClipboardList, section: "Tým", roles: ["team_leader", "administrator"] },
  { label: "Výjimky", href: "/exceptions", icon: ShieldAlert, section: "Tým", roles: ["team_leader", "administrator"] },
  { label: "Kontakty", href: "/leads", icon: Users, section: "Tým", roles: ["team_leader", "administrator"] },
  { label: "Obchodní případy", href: "/objects/deals", icon: Briefcase, section: "Tým", roles: ["administrator"] },
  { label: "Analytika", href: "/analytics", icon: BarChart3, section: "Tým", roles: ["team_leader", "administrator"] },
  { label: "Týmový přehled", href: "/team", icon: Users, section: "Tým", roles: ["team_leader", "administrator"] },
  { label: "Auditní záznamy", href: "/audit", icon: ShieldAlert, section: "Administrace", roles: ["team_leader", "administrator"] },
  { label: "Pracovní postupy", href: "/workflows", icon: Workflow, section: "Administrace", roles: ["administrator"] },
  { label: "Kontrolní přehled", href: "/controls", icon: ClipboardCheck, section: "Administrace", roles: ["administrator"] },
  { label: "Nastavení", href: "/settings", icon: Settings, section: "Administrace" },
];

export function getAllowedWorkspaceNavigationItems(
  role: WorkspaceRole | null | undefined,
): WorkspaceNavigationItem[] {
  return NAVIGATION_ITEMS.filter((item) => !item.roles || (role != null && item.roles.includes(role)));
}

export function getCommandPalettePlaceholder(role: WorkspaceRole | null | undefined): string {
  return role === "operator"
    ? "Hledej produkt nebo stránku…"
    : "Hledej příkaz, kontakt, produkt nebo stránku…";
}

export function getHeaderSearchPlaceholder(
  role: WorkspaceRole | null | undefined,
  isLoading: boolean,
): string {
  if (isLoading) return "Hledat stránky a příkazy… (Ctrl + K)";
  return `${getCommandPalettePlaceholder(role)} (Ctrl + K)`;
}
