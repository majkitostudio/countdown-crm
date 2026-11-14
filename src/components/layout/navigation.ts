import {
  CalendarDays,
  Contact,
  GraduationCap,
  History,
  LayoutDashboard,
  Package,
  PhoneCall,
  ScrollText,
  Settings,
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
 * Hub (Workflows, Readiness, Users, Scripts, Telephony) are
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
  work: "Práce",
  team: "Tým",
  reporting: "Reporty",
  learn: "Učení",
  administration: "Administrace",
  account: "Účet",
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
  { label: "Operátorská konzole", href: "/console", icon: PhoneCall, section: "work" },
  { label: "Objednávky", href: "/orders", icon: ShoppingBag, section: "work" },
  { label: "Plán hovorů", href: "/schedule", icon: CalendarDays, section: "work" },
  { label: "Peněženka", href: "/wallet", icon: WalletCards, section: "work" },

  // Team
  { label: "Týmový prostor", href: "/team", icon: Users, section: "team", roles: MANAGER_ROLES },
  { label: "Leady", href: "/leads", icon: Contact, section: "team", roles: MANAGER_ROLES },

  // Reporting
  { label: "Reporty", href: "/reports", icon: LayoutDashboard, section: "reporting", roles: MANAGER_ROLES },
  { label: "Auditní záznamy", href: "/audit", icon: History, section: "reporting", roles: MANAGER_ROLES },
  { label: "Záznamy hovorů", href: "/call-logs", icon: ScrollText, section: "reporting", roles: MANAGER_ROLES },

  // Learn
  { label: "AI trénink", href: "/training", icon: GraduationCap, section: "learn" },
  { label: "Katalog produktů", href: "/products", icon: Package, section: "learn" },

  // Administration
  { label: "Správa", href: "/admin", icon: ShieldCheck, section: "administration", roles: ["administrator"] },

  // Account
  { label: "Nastavení", href: "/settings", icon: Settings, section: "account" },
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
    ? "Zadejte produkt nebo stránku..."
    : "Zadejte příkaz, jméno leadu, produkt nebo stránku...";
}

export function getHeaderSearchPlaceholder(
  role: WorkspaceRole | null | undefined,
  isLoading: boolean,
): string {
  if (isLoading) return "Otevřít stránky a příkazy... (Ctrl + K)";
  return `${getCommandPalettePlaceholder(role).replace("...", "")}... (Ctrl + K)`;
}
