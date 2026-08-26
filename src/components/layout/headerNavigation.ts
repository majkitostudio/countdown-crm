import {
  Activity,
  BarChart3,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Package,
  PhoneCall,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import type { WorkspaceRole } from "@/lib/auth/roles";

export interface NavigationCommand {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles?: WorkspaceRole[];
}

const NAV_ITEMS: NavigationCommand[] = [
  { label: "Dashboard Overview", path: "/", icon: LayoutDashboard },
  { label: "Operator Console (Workspace)", path: "/workspace", icon: PhoneCall },
  { label: "My Calendar", path: "/calendar", icon: CalendarDays },
  { label: "Leads & Contacts", path: "/leads", icon: Users, roles: ["team_leader", "administrator"] },
  { label: "Orders", path: "/orders", icon: ShoppingCart },
  { label: "Product Catalog", path: "/products", icon: Package },
  { label: "Analytics BI", path: "/analytics", icon: BarChart3, roles: ["team_leader", "administrator"] },
  { label: "Live Team Monitor", path: "/monitor", icon: Activity, roles: ["team_leader", "administrator"] },
  { label: "AI Roleplay Training", path: "/training", icon: GraduationCap },
  { label: "Team Leader Review", path: "/training/reviews", icon: ClipboardList, roles: ["team_leader", "administrator"] },
  { label: "Workflows", path: "/workflows", icon: Sparkles, roles: ["team_leader", "administrator"] },
  { label: "Security Audit Log", path: "/audit", icon: ShieldCheck, roles: ["team_leader", "administrator"] },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Workspace Members", path: "/team", icon: Users, roles: ["administrator"] },
];

export function getAllowedNavigationCommands(role: WorkspaceRole | null | undefined): NavigationCommand[] {
  return NAV_ITEMS.filter((item) => !item.roles || (role !== null && role !== undefined && item.roles.includes(role)));
}

export function getCommandPalettePlaceholder(role: WorkspaceRole | null | undefined): string {
  return role === "operator"
    ? "Type a product or page..."
    : "Type a command, lead name, product or page...";
}
