import { LockKeyhole, Zap } from "lucide-react";
import { isDataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { PageHeader } from "@/components/layout/PageHeader";
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
          title="Workflows & Automations"
          description="Workflow management is restricted to authorized workspace roles."
          badge={{ label: "Unavailable", tone: "unavailable" }}
        />
        <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
          <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
          <h2 className="text-base font-semibold text-zinc-100">
            {isForbidden ? "Workflow management unavailable" : "Workflows unavailable"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
            {isForbidden
              ? "Workflow rules and execution data are available to Team Leaders and Administrators only."
              : "Workflow management could not be loaded from the active workspace. No workflow data or controls were shown."}
          </p>
        </div>
      </div>
    );
  }

  return <WorkflowsManagementClient />;
}
