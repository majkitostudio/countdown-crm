import Link from "next/link";
import { ArrowLeft, ClipboardCheck, LockKeyhole } from "lucide-react";
import { DataAccessError } from "@/lib/dal/errors";
import { getWorkspaceReadinessForWorkspace, type WorkspaceReadinessDTO } from "@/lib/dal/workspaceReadiness";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkspaceReadinessPanel } from "@/components/readiness/WorkspaceReadinessPanel";
import { Surface } from "@/components/ui/Surface";
import { getButtonClassName } from "@/components/ui/Button";

type ControlsPageLoadResult =
  | { data: WorkspaceReadinessDTO }
  | { error: unknown };

async function loadControlsPage(): Promise<ControlsPageLoadResult> {
  try {
    return { data: await getWorkspaceReadinessForWorkspace() };
  } catch (error) {
    return { error };
  }
}

export default async function ControlCheckpointPage() {
  const result = await loadControlsPage();

  if ("error" in result) {
    const isForbidden = result.error instanceof DataAccessError && result.error.code === "FORBIDDEN";

    return (
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <PageHeader
          icon={ClipboardCheck}
          title="Control Checkpoint"
          description="A truthful operational checklist for the active workspace."
          badge={{ label: "Unavailable", tone: "unavailable" }}
        />
        <div className="mx-auto max-w-xl">
        <Surface variant="empty">
          <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
          <h1 className="text-base font-semibold text-zinc-100">Control Checkpoint unavailable</h1>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
            {isForbidden
              ? "Control Checkpoint is restricted to workspace administrators."
              : "Control Checkpoint could not be loaded from the active workspace."}
          </p>
          <div className="mt-5">
            <Link
              href="/"
              className={getButtonClassName("secondary")}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Return home
            </Link>
          </div>
        </Surface>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6">
      <WorkspaceReadinessPanel initialData={result.data} />
    </div>
  );
}
