"use client";

import { useState } from "react";
import { ShieldCheck, Trash2, UserCog } from "lucide-react";
import {
  removeWorkspaceMemberAction,
  updateWorkspaceMemberRoleAction,
} from "@/app/actions/workspace";
import type { WorkspaceMemberDTO } from "@/lib/dal/memberships";
import type { WorkspaceRole } from "@/lib/auth/roles";
import { getWorkspaceRoleLabel } from "@/lib/auth/roles";

interface TeamMembersPanelProps {
  initialMembers: WorkspaceMemberDTO[];
  currentUserId: string;
}

const ROLE_OPTIONS: WorkspaceRole[] = ["operator", "team_leader", "administrator"];

export function TeamMembersPanel({ initialMembers, currentUserId }: TeamMembersPanelProps) {
  const [members, setMembers] = useState(initialMembers);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const changeRole = async (userId: string, role: WorkspaceRole) => {
    setBusyUserId(userId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await updateWorkspaceMemberRoleAction(userId, role);
      setMembers((current) => current.map((member) => member.user_id === userId ? updated : member));
      setSuccessMessage("Role byla uložena.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Role se nepodařilo uložit.");
    } finally {
      setBusyUserId(null);
    }
  };

  const removeMember = async (member: WorkspaceMemberDTO) => {
    if (member.user_id === currentUserId || !window.confirm(`Opravdu odebrat ${member.full_name || member.email}?`)) return;

    setBusyUserId(member.user_id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await removeWorkspaceMemberAction(member.user_id);
      setMembers((current) => current.filter((item) => item.user_id !== member.user_id));
      setSuccessMessage("Člen workspace byl odebrán.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Člena workspace se nepodařilo odebrat.");
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300">
                <UserCog className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Workspace Members</h1>
                <p className="mt-1 text-xs text-zinc-400">Správa rolí Operator, Team Leader a Administrator.</p>
              </div>
            </div>
            <p className="mt-5 max-w-2xl text-xs leading-relaxed text-zinc-500">
              Tato administrace mění membership roli v aktuálním workspace. Přihlášení a Auth identity se spravují odděleně; pozvánkový flow není součástí tohoto pilotního slice.
            </p>
          </div>
          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[10px] font-mono text-zinc-300">Administrator only</span>
        </div>
      </div>

      {successMessage && <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-3 text-xs text-emerald-300" role="status">{successMessage}</div>}
      {errorMessage && <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300" role="alert">{errorMessage}</div>}

      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40">
        <div className="border-b border-zinc-800/80 px-6 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Current workspace members</h2>
        </div>
        <div className="divide-y divide-zinc-800/70">
          {members.map((member) => {
            const isCurrentUser = member.user_id === currentUserId;
            const isBusy = busyUserId === member.user_id;
            return (
              <div key={member.user_id} className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-200">
                    {(member.full_name || member.email || "??").slice(0, 2).toUpperCase()
                  }</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-200">{member.full_name || "Unknown operator"}{isCurrentUser ? " (you)" : ""}</p>
                    <p className="truncate text-[11px] text-zinc-500">{member.email || member.user_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="hidden h-4 w-4 text-zinc-500 sm:block" />
                  <select
                    value={member.role}
                    disabled={isBusy || isCurrentUser}
                    onChange={(event) => void changeRole(member.user_id, event.target.value as WorkspaceRole)}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Role for ${member.full_name || member.email}`}
                  >
                    {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{getWorkspaceRoleLabel(role)}</option>)}
                  </select>
                  <button
                    type="button"
                    disabled={isBusy || isCurrentUser}
                    onClick={() => void removeMember(member)}
                    className="rounded-lg border border-zinc-800 p-2 text-zinc-500 transition-colors hover:border-rose-900/70 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                    title={isCurrentUser ? "You cannot remove yourself" : "Remove member"}
                    aria-label={isCurrentUser ? "You cannot remove yourself" : `Remove ${member.full_name || member.email}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
