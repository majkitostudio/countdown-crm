import {
  BarChart3,
  CalendarDays,
  Contact,
  GraduationCap,
  History,
  LayoutDashboard,
  Package,
  PhoneCall,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Users,
  WalletCards,
} from "lucide-react";
import type { WorkspaceRole } from "@/lib/auth/roles";

/**
 * The single list of destinations that are available in the pilot.
 *
 * Both the sidebar and the command palette read from this list. A page may
 * still protect itself on the server, but it must not be advertised here to a
 * role that cannot use it. Destinations that are now reached from the Admin
 * Hub (Workflows, Control Checkpoint, Users, Scripts, Telephony) are
 * intentionally omitted from this top-level list.
 */
export type WorkspaceNavigationSection =
  | "work"
  | "team"
  | "reporting"
  | "learn"
  | "administration"
  | "account";

export interface WorkspaceNavigationItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  section: WorkspaceNavigationSection;
  roles?: WorkspaceRole[];
}

export interface WorkspaceNavigationSectionGroup {
  section: WorkspaceNavigationSection;
  label: string;
  items: WorkspaceNavigationItem[];
}

export const NAVIGATION_SECTION_LABELS: Record<WorkspaceNavigationSection, string> = {
  work: "Work",
  team: "Team",
  reporting: "Reporting",
  learn: "Learn",
  administration: "Administration",
  account: "Account",
};

export const NAVIGATION_SECTION_ORDER: readonly WorkspaceNavigationSection[] = [
  "work",
  "team",
  "reporting",
  "learn",
  "administration",
  "account",
];

const MANAGER_ROLES: WorkspaceRole[] = ["team_leader", "administrator"];

const NAVIGATION_ITEMS: readonly WorkspaceNavigationItem[] = [
  // Work
  { label: "Operator Console", href: "/workspace", icon: PhoneCall, section: "work" },
  { label: "Orders", href: "/orders", icon: ShoppingBag, section: "work" },
  { label: "Schedule", href: "/calendar", icon: CalendarDays, section: "work" },
  { label: "Wallet", href: "/wallet", icon: WalletCards, section: "work" },

  // Team
  { label: "Team Workspace", href: "/team", icon: Users, section: "team", roles: MANAGER_ROLES },
  { label: "Exception Queue", href: "/exceptions", icon: ShieldAlert, section: "team", roles: MANAGER_ROLES },
  { label: "Leads", href: "/leads", icon: Contact, section: "team", roles: MANAGER_ROLES },

  // Reporting
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "reporting", roles: MANAGER_ROLES },
  { label: "Analytics", href: "/analytics", icon: BarChart3, section: "reporting", roles: MANAGER_ROLES },
  { label: "Audit Log", href: "/audit", icon: History, section: "reporting", roles: MANAGER_ROLES },
  { label: "Call Logs", href: "/calls", icon: ScrollText, section: "reporting", roles: MANAGER_ROLES },

  // Learn
  { label: "AI Training", href: "/training", icon: GraduationCap, section: "learn" },
  { label: "Product Catalog", href: "/products", icon: Package, section: "learn" },

  // Administration
  { label: "Admin Hub", href: "/admin", icon: ShieldCheck, section: "administration", roles: ["administrator"] },

  // Account
  { label: "Settings", href: "/settings", icon: Settings, section: "account" },
];

export function getAllowedWorkspaceNavigationItems(
  role: WorkspaceRole | null | undefined,
): WorkspaceNavigationItem[] {
  return NAVIGATION_ITEMS.filter((item) => !item.roles || (role != null && item.roles.includes(role)));
}

export function getAllowedWorkspaceNavigationSections(
  role: WorkspaceRole | null | undefined,
): WorkspaceNavigationSectionGroup[] {
  const allowed = getAllowedWorkspaceNavigationItems(role);

  return NAVIGATION_SECTION_ORDER.map((section) => ({
    section,
    label: NAVIGATION_SECTION_LABELS[section],
    items: allowed.filter((item) => item.section === section),
  })).filter((group) => group.items.length > 0);
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
