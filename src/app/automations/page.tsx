import { LockKeyhole, Zap } from "lucide-react";
import { isDataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/ui/Surface";
import WorkflowsManagementClient from "./WorkflowsManagementClient";

export default async function WorkflowsPage() {
  try {
    await requireWorkspaceRole(["team_leader", "administrator"]);
  } catch (error) {
    const isForbidden = isDataAccessError(error) && error.code === "FORBIDDEN";
    return (
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <PageHeader
          icon={Zap}
          title={isForbidden ? "Správa automatizací není dostupná" : "Automatizace nejsou dostupné"}
          description="Správa automatizací je omezena na oprávněné role v pracovním prostoru."
          badge={{ label: "Nedostupné", tone: "unavailable" }}
        />
        <div className="mx-auto max-w-xl">
          <Surface variant="empty">
          <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
          <h2 className="text-base font-semibold text-zinc-100">
            {isForbidden ? "Správa automatizací není dostupná" : "Automatizace nejsou dostupné"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
            {isForbidden
              ? "Pravidla automatizací a data o jejich běhu jsou dostupné jen vedoucím týmu a správcům."
              : "Automatizace se nepodařilo načíst z aktivního pracovního prostoru. Žádná data ani ovládání se nezobrazují."}
          </p>
          </Surface>
        </div>
      </div>
    );
  }

  return <WorkflowsManagementClient />;
}
