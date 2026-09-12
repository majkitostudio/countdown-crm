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
  UserCog,
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
  roles?: WorkspaceRole[];
}

const NAVIGATION_ITEMS: readonly WorkspaceNavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["team_leader", "administrator"] },
  { label: "Operator Console", href: "/workspace", icon: PhoneCall },
  { label: "Orders", href: "/orders", icon: ShoppingBag },
  { label: "Wallet", href: "/wallet", icon: WalletCards },
  { label: "My Calendar", href: "/calendar", icon: CalendarDays },
  { label: "AI Training", href: "/training", icon: GraduationCap },
  { label: "Team Leader Review", href: "/training/reviews", icon: ClipboardList, roles: ["team_leader", "administrator"] },
  { label: "Exception Queue", href: "/exceptions", icon: ShieldAlert, roles: ["team_leader", "administrator"] },
  { label: "Leads & Contacts", href: "/leads", icon: Users, roles: ["team_leader", "administrator"] },
  { label: "Deals & Pipelines", href: "/objects/deals", icon: Briefcase, roles: ["team_leader", "administrator"] },
  { label: "Product Catalog", href: "/products", icon: Package },
  { label: "Call Logs", href: "/calls", icon: History },
  { label: "Workflows", href: "/workflows", icon: Workflow, roles: ["team_leader", "administrator"] },
  { label: "Analytics", href: "/analytics", icon: BarChart3, roles: ["team_leader", "administrator"] },
  { label: "Security Audit Log", href: "/audit", icon: ShieldAlert, roles: ["team_leader", "administrator"] },
  { label: "Control Checkpoint", href: "/readiness", icon: ClipboardCheck, roles: ["administrator"] },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Workspace Members", href: "/team", icon: UserCog, roles: ["administrator"] },
];

export function getAllowedWorkspaceNavigationItems(
  role: WorkspaceRole | null | undefined,
): WorkspaceNavigationItem[] {
  return NAVIGATION_ITEMS.filter((item) => !item.roles || (role != null && item.roles.includes(role)));
}

export function getCommandPalettePlaceholder(role: WorkspaceRole | null | undefined): string {
  return role === "operator"
    ? "Type a product or page..."
    : "Type a command, lead name, product or page...";
}

export function getHeaderSearchPlaceholder(
  role: WorkspaceRole | null | undefined,
  isLoading: boolean,
): string {
  if (isLoading) return "Open pages and commands... (Ctrl + K)";
  return `${getCommandPalettePlaceholder(role).replace("...", "")}... (Ctrl + K)`;
}
