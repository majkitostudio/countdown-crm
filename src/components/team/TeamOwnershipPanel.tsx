"use client";

import { useMemo, useState } from "react";
import {
  assignTeamOwnershipAction,
  type TeamManagementData,
} from "@/app/actions/teams";
import type { TeamOwnershipResourceType } from "@/lib/dal/teamOwnership";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

interface TeamOwnershipPanelProps {
  initialData: Pick<TeamManagementData, "teams" | "ownership">;
}

function ownershipKey(resourceType: TeamOwnershipResourceType, resourceId: string): string {
  return `${resourceType}:${resourceId}`;
}

function teamLabel(teamId: string | null, teams: TeamManagementData["teams"]): string {
  if (!teamId) return "Bez přiřazení";
  return teams.find((team) => team.id === teamId)?.name || "Neznámý tým";
}

export function TeamOwnershipPanel({ initialData }: TeamOwnershipPanelProps) {
  const [data, setData] = useState(initialData);
  const [draftTeams, setDraftTeams] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeTeams = useMemo(
    () => data.teams.filter((team) => team.status === "active"),
    [data.teams],
  );
  const unassignedCount = data.ownership.leads.filter((lead) => !lead.team_id).length
    + data.ownership.queueItems.filter((item) => !item.team_id).length;

  const getDraftValue = (resourceType: TeamOwnershipResourceType, resourceId: string, currentTeamId: string | null) =>
    draftTeams[ownershipKey(resourceType, resourceId)] ?? currentTeamId ?? "";

  const setDraftValue = (resourceType: TeamOwnershipResourceType, resourceId: string, value: string) => {
    setDraftTeams((current) => ({
      ...current,
      [ownershipKey(resourceType, resourceId)]: value,
    }));
  };

  const saveOwnership = async (
    resourceType: TeamOwnershipResourceType,
    resourceId: string,
    currentTeamId: string | null,
  ) => {
    const key = ownershipKey(resourceType, resourceId);
    const selectedValue = getDraftValue(resourceType, resourceId, currentTeamId);
    const nextTeamId = selectedValue || null;
    if (nextTeamId === currentTeamId) return;

    setBusyKey(key);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await assignTeamOwnershipAction(resourceType, resourceId, nextTeamId);
      setData((current) => ({
        ...current,
        ownership: {
          leads: current.ownership.leads.map((lead) =>
            resourceType === "lead" && lead.id === resourceId ? { ...lead, team_id: nextTeamId } : lead,
          ),
          queueItems: current.ownership.queueItems.map((item) =>
            resourceType === "queue_item" && item.id === resourceId ? { ...item, team_id: nextTeamId } : item,
          ),
        },
      }));
      setDraftTeams((current) => ({ ...current, [key]: nextTeamId || "" }));
      setSuccessMessage(`Přiřazení „${resourceType === "lead" ? "zákazníka" : "položky fronty"}“ bylo uloženo.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Přiřazení týmu se nepodařilo uložit.");
    } finally {
      setBusyKey(null);
    }
  };

  const teamOptions = (currentTeamId: string | null) => (
    <>
      <option value="">Bez přiřazení</option>
      {activeTeams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
      {currentTeamId && !activeTeams.some((team) => team.id === currentTeamId) && (
        <option value={currentTeamId}>{teamLabel(currentTeamId, data.teams)} (archivovaný)</option>
      )}
    </>
  );

  return (
    <Surface variant="page">
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Přiřazení záznamů k týmům</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-text-muted">
            Tady určujeme, který tým je za zákazníka nebo položku fronty odpovědný. Stav fronty ani přidělený operátor se tím nemění. Dokud není záznam přiřazený, zůstává označený jako „Bez přiřazení“.
          </p>
        </div>

        {successMessage && <StatusAlert tone="success">{successMessage}</StatusAlert>}
        {errorMessage && <StatusAlert tone="danger">{errorMessage}</StatusAlert>}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-control border border-border-default bg-surface-inset p-4">
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Bez týmu celkem</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{unassignedCount}</p>
          </div>
          <div className="rounded-control border border-border-default bg-surface-inset p-4">
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Zákazníci</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{data.ownership.leads.length}</p>
          </div>
          <div className="rounded-control border border-border-default bg-surface-inset p-4">
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Položky fronty</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{data.ownership.queueItems.length}</p>
          </div>
        </div>

        {activeTeams.length === 0 ? (
          <StatusAlert tone="warning">Nejdříve vytvořte alespoň jeden aktivní tým.</StatusAlert>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Zákazníci</h3>
                <StatusBadge tone="neutral">{data.ownership.leads.length}</StatusBadge>
              </div>
              {data.ownership.leads.map((lead) => {
                const key = ownershipKey("lead", lead.id);
                const value = getDraftValue("lead", lead.id, lead.team_id);
                const changed = (value || null) !== lead.team_id;
                return (
                  <div key={lead.id} className="grid gap-3 rounded-control border border-border-default bg-surface-inset p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-text-primary">{lead.full_name}</p>
                      <p className="truncate text-[11px] text-text-muted">{lead.phone} · {lead.status} · {teamLabel(lead.team_id, data.teams)}</p>
                    </div>
                    <div className="flex gap-2 sm:min-w-[220px]">
                      <SelectField
                        aria-label={`Tým pro ${lead.full_name}`}
                        value={value}
                        onChange={(event) => setDraftValue("lead", lead.id, event.target.value)}
                      >
                        {teamOptions(lead.team_id)}
                      </SelectField>
                      <Button
                        variant="secondary"
                        disabled={!changed || busyKey === key}
                        onClick={() => void saveOwnership("lead", lead.id, lead.team_id)}
                      >
                        Uložit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Položky fronty</h3>
                <StatusBadge tone="neutral">{data.ownership.queueItems.length}</StatusBadge>
              </div>
              {data.ownership.queueItems.map((item) => {
                const key = ownershipKey("queue_item", item.id);
                const value = getDraftValue("queue_item", item.id, item.team_id);
                const changed = (value || null) !== item.team_id;
                const leadName = item.lead?.full_name || "Neznámý zákazník";
                const operator = item.assigned_operator?.full_name || "Bez operátora";
                return (
                  <div key={item.id} className="grid gap-3 rounded-control border border-border-default bg-surface-inset p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-text-primary">{leadName}</p>
                      <p className="truncate text-[11px] text-text-muted">{item.state} · {operator} · {teamLabel(item.team_id, data.teams)}</p>
                    </div>
                    <div className="flex gap-2 sm:min-w-[220px]">
                      <SelectField
                        aria-label={`Tým pro položku fronty ${leadName}`}
                        value={value}
                        onChange={(event) => setDraftValue("queue_item", item.id, event.target.value)}
                      >
                        {teamOptions(item.team_id)}
                      </SelectField>
                      <Button
                        variant="secondary"
                        disabled={!changed || busyKey === key}
                        onClick={() => void saveOwnership("queue_item", item.id, item.team_id)}
                      >
                        Uložit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Surface>
  );
}
