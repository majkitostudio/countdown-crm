import type { WorkspaceRole } from "@/lib/auth/roles";
import {
  getAllowedWorkspaceNavigationItems,
  getCommandPalettePlaceholder,
  type WorkspaceNavigationItem,
} from "./navigation";

export interface NavigationCommand extends Omit<WorkspaceNavigationItem, "href"> {
  path: string;
}

export function getAllowedNavigationCommands(role: WorkspaceRole | null | undefined): NavigationCommand[] {
  return getAllowedWorkspaceNavigationItems(role).map(({ href, ...item }) => ({ ...item, path: href }));
}

export { getCommandPalettePlaceholder };
