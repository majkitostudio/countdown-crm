"use client";

import { useMemo, useState } from "react";
import {
  Headphones,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import {
  assignTeamMembershipAction,
  endTeamMembershipAction,
  loadTeamManagementAction,
  type TeamManagementData,
} from "@/app/actions/teams";
import {
  removeWorkspaceMemberAction,
  updateWorkspaceMemberRoleAction,
} from "@/app/actions/workspace";
import type { TeamDTO, TeamMembershipDTO } from "@/lib/dal/teams";
import type { WorkspaceMemberDTO } from "@/lib/dal/memberships";
import type { WorkspaceRole } from "@/lib/auth/roles";
import { Button } from "@/components/ui/Button";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import { UserOnboardingModal } from "@/components/team/UserOnboardingModal";

interface UsersHubPanelProps {
  initialData: TeamManagementData;
  currentUserId: string;
}

function getMemberActiveTeam(
  userId: string,
  teams: TeamDTO[],
  memberships: Record<string, TeamMembershipDTO[]>,
): { team: TeamDTO; membershipId: string } | null {
  for (const team of teams) {
    const active = memberships[team.id]?.find(
      (m) => m.user_id === userId && m.active_until === null,
    );
    if (active) return { team, membershipId: active.id };
  }
  return null;
}

export function UsersHubPanel({ initialData, currentUserId }: UsersHubPanelProps) {
  const [data, setData] = useState<TeamManagementData>(initialData);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const reload = async () => {
    const refreshed = await loadTeamManagementAction();
    setData(refreshed);
  };

  const handleUserAdded = async (msg: string) => {
    await reload();
    setSuccessMessage(msg);
    setErrorMessage(null);
  };

  const handleRoleChange = async (userId: string, newRole: WorkspaceRole) => {
    setBusyUserId(userId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updateWorkspaceMemberRoleAction(userId, newRole);
      await reload();
      setSuccessMessage("Role uživatele byla aktualizována.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Změna role selhala.");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleTeamChange = async (userId: string, targetTeamId: string, currentMembershipId?: string) => {
    setBusyUserId(userId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (currentMembershipId) {
        await endTeamMembershipAction(currentMembershipId);
      }
      if (targetTeamId) {
        const member = data.members.find((m) => m.user_id === userId);
        const membershipRole = member?.role === "team_leader" ? "leader" : "member";
        await assignTeamMembershipAction(targetTeamId, userId, membershipRole);
      }
      await reload();
      setSuccessMessage("Přiřazení k lince bylo aktualizováno.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Změna linky selhala.");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRemoveMember = async (member: WorkspaceMemberDTO) => {
    if (member.user_id === currentUserId) return;
    const confirmName = member.full_name || member.email;
    if (!window.confirm(`Opravdu odebrat ${confirmName} z call centra? Ztratí přístup k systému.`)) {
      return;
    }

    setBusyUserId(member.user_id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await removeWorkspaceMemberAction(member.user_id);
      await reload();
      setSuccessMessage(`Pracovník ${confirmName} byl odebrán.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Odebrání pracovníka selhalo.");
    } finally {
      setBusyUserId(null);
    }
  };

  // KPIs
  const totalCount = data.members.length;
  const operatorCount = useMemo(() => data.members.filter((m) => m.role === "operator").length, [data.members]);
  const leaderCount = useMemo(() => data.members.filter((m) => m.role === "team_leader").length, [data.members]);
  const adminCount = useMemo(() => data.members.filter((m) => m.role === "administrator").length, [data.members]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    return data.members.filter((member) => {
      if (roleFilter !== "all" && member.role !== roleFilter) return false;

      const activeAssignment = getMemberActiveTeam(member.user_id, data.teams, data.memberships);
      if (teamFilter === "unassigned" && activeAssignment !== null) return false;
      if (teamFilter !== "all" && teamFilter !== "unassigned" && activeAssignment?.team.id !== teamFilter) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = (member.full_name || "").toLowerCase().includes(q);
        const emailMatch = (member.email || "").toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }

      return true;
    });
  }, [data.members, data.teams, data.memberships, roleFilter, teamFilter, search]);

  return (
    <div className="space-y-6">
      {/* KPI metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Surface variant="inset" className="p-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Celkem pracovníků</span>
            <Users className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">{totalCount}</div>
          <p className="mt-1 text-[11px] text-zinc-400">registrovaných v CRM</p>
        </Surface>

        <Surface variant="inset" className="p-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Operátoři</span>
            <Headphones className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-400">{operatorCount}</div>
          <p className="mt-1 text-[11px] text-zinc-400">aktivní telefonisté</p>
        </Surface>

        <Surface variant="inset" className="p-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Team Leadeři</span>
            <UserCheck className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-sky-400">{leaderCount}</div>
          <p className="mt-1 text-[11px] text-zinc-400">vedoucí směn a linek</p>
        </Surface>

        <Surface variant="inset" className="p-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Administrátoři</span>
            <Shield className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-purple-400">{adminCount}</div>
          <p className="mt-1 text-[11px] text-zinc-400">plná systémová práva</p>
        </Surface>
      </div>

      {/* Main card */}
      <Surface variant="table">
        {/* Header & Controls bar */}
        <div className="flex flex-col gap-4 border-b border-zinc-800 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Pracovníci call centra</h2>
            <p className="text-xs text-zinc-400">
              Správa uživatelských účtů, oprávnění a prodejních linek na jednom místě.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={() => setIsOnboardingOpen(true)}
            className="self-start sm:self-auto"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Pozvat / Přidat pracovníka
          </Button>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-4 pb-0">
            <StatusAlert tone="success">{successMessage}</StatusAlert>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 pb-0">
            <StatusAlert tone="danger">{errorMessage}</StatusAlert>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-col gap-3 border-b border-zinc-800/80 bg-zinc-900/40 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Hledat podle jména nebo e-mailu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-400 focus:border-zinc-700 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 focus:border-zinc-700 focus:outline-none"
            >
              <option value="all">Všechny role</option>
              <option value="operator">Pouze Operátoři</option>
              <option value="team_leader">Pouze Team Leadeři</option>
              <option value="administrator">Pouze Administrátoři</option>
            </select>

            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 focus:border-zinc-700 focus:outline-none"
            >
              <option value="all">Všechny linky</option>
              <option value="unassigned">⚠️ Bez přiřazené linky</option>
              {data.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Members Table */}
        <div className="divide-y divide-zinc-800/60">
          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              Žádný pracovník neodpovídá zvolenému filtru.
            </div>
          ) : (
            filteredMembers.map((member) => {
              const activeAssignment = getMemberActiveTeam(member.user_id, data.teams, data.memberships);
              const isCurrentUser = member.user_id === currentUserId;
              const isBusy = busyUserId === member.user_id;

              return (
                <div
                  key={member.user_id}
                  className="flex flex-col gap-4 p-4 transition-colors hover:bg-zinc-900/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* User info */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-xs font-semibold text-zinc-300">
                      {(member.full_name || member.email || "??").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-semibold text-zinc-100">
                          {member.full_name || "Nepojmenovaný uživatel"}
                        </span>
                        {isCurrentUser && (
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
                            Vy
                          </span>
                        )}
                      </div>
                      <span className="block truncate font-mono text-[11px] text-zinc-400">
                        {member.email}
                      </span>
                    </div>
                  </div>

                  {/* Role, Team & Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Role selector */}
                    <div className="min-w-[130px]">
                      <select
                        value={member.role}
                        disabled={isBusy || isCurrentUser}
                        onChange={(e) => handleRoleChange(member.user_id, e.target.value as WorkspaceRole)}
                        className={`w-full rounded-lg border bg-zinc-950 px-2.5 py-1 text-xs font-medium focus:outline-none ${
                          member.role === "administrator"
                            ? "border-purple-800/60 text-purple-300"
                            : member.role === "team_leader"
                              ? "border-sky-800/60 text-sky-300"
                              : "border-zinc-800 text-zinc-300"
                        } ${isCurrentUser ? "cursor-not-allowed opacity-80" : ""}`}
                      >
                        <option value="operator">Operátor</option>
                        <option value="team_leader">Team Leader</option>
                        <option value="administrator">Administrátor</option>
                      </select>
                    </div>

                    {/* Team assignment selector */}
                    <div className="min-w-[160px]">
                      <select
                        value={activeAssignment ? activeAssignment.team.id : ""}
                        disabled={isBusy}
                        onChange={(e) =>
                          handleTeamChange(
                            member.user_id,
                            e.target.value,
                            activeAssignment ? activeAssignment.membershipId : undefined,
                          )
                        }
                        className={`w-full rounded-lg border bg-zinc-950 px-2.5 py-1 text-xs focus:outline-none ${
                          activeAssignment
                            ? "border-emerald-800/50 text-emerald-300"
                            : member.role === "administrator"
                              ? "border-zinc-800 text-zinc-400"
                              : "border-amber-800/50 text-amber-300"
                        }`}
                      >
                        <option value="">
                          {member.role === "administrator" ? "Globální dohled (bez linky)" : "⚠️ Bez linky"}
                        </option>
                        {data.teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      disabled={isBusy || isCurrentUser}
                      onClick={() => handleRemoveMember(member)}
                      title={isCurrentUser ? "Nemůžete odebrat vlastní účet" : "Odebrat z call centra"}
                      className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-rose-950/40 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Surface>

      {/* Onboarding Modal */}
      <UserOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        teams={data.teams}
        onUserAdded={handleUserAdded}
      />
    </div>
  );
}
