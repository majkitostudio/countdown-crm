"use client";

import { Users } from "lucide-react";
import type { TeamMembershipDTO, TeamDTO } from "@/lib/dal/teams";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

interface TeamRosterPanelProps {
  teams: TeamDTO[];
  memberships: Record<string, TeamMembershipDTO[]>;
}

function roleLabel(role: TeamMembershipDTO["membership_role"]): string {
  return role === "leader" ? "Team Leader" : "Operator";
}

export function TeamRosterPanel({ teams, memberships }: TeamRosterPanelProps) {
  const activeTeams = teams.filter((team) => team.status === "active");
  const activeMemberships = activeTeams.flatMap((team) => memberships[team.id] || [])
    .filter((membership) => membership.active_until === null);
  const operatorCount = activeMemberships.filter((membership) => membership.membership_role === "member").length;
  const leaderCount = activeMemberships.filter((membership) => membership.membership_role === "leader").length;

  return (
    <Surface variant="page">
      <div className="space-y-5 p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-100">Moje týmy</h2>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">
              Přehled týmů, které tato role smí řídit. Zobrazená jména a členové pocházejí z aktuálního workspace.
            </p>
          </div>
          <div className="flex gap-2 text-[10px] text-zinc-500">
            <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1">{activeTeams.length} active teams</span>
            <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1">{operatorCount} operators</span>
          </div>
        </div>

        {activeTeams.length === 0 ? (
          <StatusAlert tone="warning" role="status">
            Tento účet nemá přístup k žádnému aktivnímu týmu. Data týmu proto nezobrazujeme.
          </StatusAlert>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {activeTeams.map((team) => {
              const teamMembers = (memberships[team.id] || []).filter((membership) => membership.active_until === null);
              return (
                <div key={team.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-100">{team.name}</h3>
                      <p className="mt-1 text-[11px] text-zinc-500">{team.slug}</p>
                    </div>
                    <StatusBadge tone="success">Active</StatusBadge>
                  </div>
                  {teamMembers.length === 0 ? (
                    <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-xs text-zinc-500">Tým zatím nemá aktivní členy.</p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {teamMembers.map((membership) => (
                        <div key={membership.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-zinc-200">{membership.full_name}</p>
                            <p className="truncate text-[11px] text-zinc-500">{membership.email || "Email není uveden"}</p>
                          </div>
                          <span className="shrink-0 text-[10px] text-zinc-500">{roleLabel(membership.membership_role)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {leaderCount > 0 && (
          <p className="text-xs text-zinc-600">Team Leadeři v rozsahu: {leaderCount}</p>
        )}
      </div>
    </Surface>
  );
}
