import {
  BarChart3,
  Briefcase,
  CalendarDays,
  ClipboardList,
  ClipboardCheck,
  GraduationCap,
  History,
  LayoutDashboard,
  Package,
  PhoneCall,
  Radio,
  Settings,
  ShieldAlert,
  ShoppingBag,
  UserCog,
  Users,
  WalletCards,
  Workflow,
} from "lucide-react";
import type { WorkspaceRole } from "@/lib/auth/roles";

export interface SidebarNavigationItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles?: WorkspaceRole[];
}

const NAV_ITEMS: SidebarNavigationItem[] = [
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
  { label: "Live Monitor", href: "/monitor", icon: Radio, roles: ["team_leader", "administrator"] },
  { label: "Workspace Readiness", href: "/readiness", icon: ClipboardCheck, roles: ["administrator"] },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Workspace Members", href: "/team", icon: UserCog, roles: ["administrator"] },
];

export function getAllowedSidebarNavigationItems(
  role: WorkspaceRole | null | undefined,
): SidebarNavigationItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || (role != null && item.roles.includes(role)));
}
