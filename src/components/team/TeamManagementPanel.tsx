"use client";

import { useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import {
  assignTeamMembershipAction,
  createTeamAction,
  endTeamMembershipAction,
  loadTeamManagementAction,
  type TeamManagementData,
} from "@/app/actions/teams";
import type { TeamMembershipDTO } from "@/lib/dal/teams";
import type { WorkspaceMemberDTO } from "@/lib/dal/memberships";
import { Button } from "@/components/ui/Button";
import { FieldLabel, SelectField, TextField } from "@/components/ui/Field";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

type MembershipRole = "member" | "leader";

interface TeamManagementPanelProps {
  initialData: TeamManagementData;
}

function memberLabel(member: WorkspaceMemberDTO): string {
  return `${member.full_name || "Unknown user"} — ${member.email || member.user_id}`;
}

function activeMemberships(data: TeamManagementData): TeamMembershipDTO[] {
  return Object.values(data.memberships).flat().filter((membership) => membership.active_until === null);
}

export function TeamManagementPanel({ initialData }: TeamManagementPanelProps) {
  const [data, setData] = useState(initialData);
  const [teamName, setTeamName] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const assignedUserIds = useMemo(
    () => new Set(activeMemberships(data).map((membership) => membership.user_id)),
    [data],
  );

  const unassignedMembers = data.members.filter(
    (member) => member.role !== "administrator" && !assignedUserIds.has(member.user_id),
  );

  const reload = async () => {
    setData(await loadTeamManagementAction());
  };

  const createTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusyKey("create-team");
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await createTeamAction(teamName, teamSlug);
      setTeamName("");
      setTeamSlug("");
      await reload();
      setSuccessMessage("Tým byl vytvořen.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Tým se nepodařilo vytvořit.");
    } finally {
      setBusyKey(null);
    }
  };

  const addMember = async (teamId: string, membershipRole: MembershipRole) => {
    const userId = selectedUsers[`${teamId}:${membershipRole}`];
    if (!userId) return;

    setBusyKey(`${teamId}:${membershipRole}`);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await assignTeamMembershipAction(teamId, userId, membershipRole);
      setSelectedUsers((current) => ({ ...current, [`${teamId}:${membershipRole}`]: "" }));
      await reload();
      setSuccessMessage("Členství bylo uloženo.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Členství se nepodařilo uložit.");
    } finally {
      setBusyKey(null);
    }
  };

  const endMembership = async (membership: TeamMembershipDTO) => {
    setBusyKey(membership.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await endTeamMembershipAction(membership.id);
      await reload();
      setSuccessMessage("Členství bylo ukončeno.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Členství se nepodařilo ukončit.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {successMessage && <StatusAlert tone="success">{successMessage}</StatusAlert>}
      {errorMessage && <StatusAlert tone="danger">{errorMessage}</StatusAlert>}

      <Surface variant="page">
        <div className="space-y-5 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-default bg-surface-inset text-text-secondary">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Vytvořit tým</h2>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">
                Tým nejdříve vytvoříme. Lidi do něj přiřadíme až v dalším kroku.
              </p>
            </div>
          </div>
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={createTeam}>
            <div>
              <FieldLabel htmlFor="team-name">Název týmu</FieldLabel>
              <TextField id="team-name" value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Například Morava" required />
            </div>
            <div>
              <FieldLabel htmlFor="team-slug">Krátký identifikátor</FieldLabel>
              <TextField id="team-slug" value={teamSlug} onChange={(event) => setTeamSlug(event.target.value)} placeholder="morava" required />
            </div>
            <Button type="submit" disabled={busyKey === "create-team"}>
              <Plus className="h-3.5 w-3.5" />
              Vytvořit tým
            </Button>
          </form>
        </div>
      </Surface>

      <Surface variant="inset">
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Aktivní týmy</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{data.teams.filter((team) => team.status === "active").length}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Členové bez týmu</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{unassignedMembers.length}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Celkem členů workspace</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{data.members.length}</p>
          </div>
        </div>
      </Surface>

      {data.teams.length === 0 ? (
        <Surface variant="empty">
          <Users className="mx-auto h-7 w-7 text-text-muted" />
          <p className="mt-3 text-sm font-medium text-text-primary">Zatím není vytvořený žádný tým</p>
          <p className="mt-1 text-xs text-text-muted">Vytvořte první tým nahoře. Teprve potom do něj přiřaďte operátory.</p>
        </Surface>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {data.teams.map((team) => {
            const memberships = (data.memberships[team.id] || []).filter((membership) => membership.active_until === null);
            const availableOperators = data.members.filter((member) => member.role === "operator" && !assignedUserIds.has(member.user_id));
            const availableLeaders = data.members.filter((member) => member.role === "team_leader" && !memberships.some((membership) => membership.user_id === member.user_id && membership.membership_role === "leader"));
            return (
              <Surface key={team.id} variant="page">
                <div className="space-y-5 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-text-primary">{team.name}</h2>
                        <StatusBadge tone={team.status === "active" ? "neutral" : "warning"}>{team.status === "active" ? "Active" : "Archived"}</StatusBadge>
                      </div>
                      <p className="mt-1 text-xs text-text-muted">{team.slug}</p>
                    </div>
                    {team.status === "active" && (
                      <span className="text-[10px] text-text-muted">Archivace po dokončení bezpečného přesunu členů</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {memberships.length === 0 ? (
                      <p className="rounded-control border border-border-default bg-surface-inset px-3 py-3 text-xs text-text-muted">Tým zatím nemá žádné členy.</p>
                    ) : memberships.map((membership) => (
                      <div key={membership.id} className="flex items-center justify-between gap-3 rounded-control border border-border-default bg-surface-inset px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-text-primary">{membership.full_name}</p>
                          <p className="truncate text-[11px] text-text-muted">{membership.membership_role === "leader" ? "Team Leader" : "Operator"} · {membership.email}</p>
                        </div>
                        <Button variant="quiet" disabled={busyKey === membership.id} onClick={() => void endMembership(membership)}>
                          Odebrat
                        </Button>
                      </div>
                    ))}
                  </div>

                  {team.status === "active" && (
                    <div className="grid gap-3 border-t border-border-default pt-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel htmlFor={`${team.id}-operator`}>Přidat operátora</FieldLabel>
                        <div className="flex gap-2">
                          <SelectField id={`${team.id}-operator`} value={selectedUsers[`${team.id}:member`] || ""} onChange={(event) => setSelectedUsers((current) => ({ ...current, [`${team.id}:member`]: event.target.value }))}>
                            <option value="">Vyberte operátora</option>
                            {availableOperators.map((member) => <option key={member.user_id} value={member.user_id}>{memberLabel(member)}</option>)}
                          </SelectField>
                          <Button variant="secondary" disabled={!selectedUsers[`${team.id}:member`] || busyKey === `${team.id}:member`} onClick={() => void addMember(team.id, "member")}>Přidat</Button>
                        </div>
                      </div>
                      <div>
                        <FieldLabel htmlFor={`${team.id}-leader`}>Přidat Team Leadera</FieldLabel>
                        <div className="flex gap-2">
                          <SelectField id={`${team.id}-leader`} value={selectedUsers[`${team.id}:leader`] || ""} onChange={(event) => setSelectedUsers((current) => ({ ...current, [`${team.id}:leader`]: event.target.value }))}>
                            <option value="">Vyberte Team Leadera</option>
                            {availableLeaders.map((member) => <option key={member.user_id} value={member.user_id}>{memberLabel(member)}</option>)}
                          </SelectField>
                          <Button variant="secondary" disabled={!selectedUsers[`${team.id}:leader`] || busyKey === `${team.id}:leader`} onClick={() => void addMember(team.id, "leader")}>Přidat</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
}
