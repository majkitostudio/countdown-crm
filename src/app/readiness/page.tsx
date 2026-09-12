import Link from "next/link";
import { ArrowLeft, ClipboardCheck, LockKeyhole } from "lucide-react";
import { DataAccessError } from "@/lib/dal/errors";
import { getWorkspaceReadinessForWorkspace, type WorkspaceReadinessDTO } from "@/lib/dal/workspaceReadiness";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkspaceReadinessPanel } from "@/components/readiness/WorkspaceReadinessPanel";
import { Surface } from "@/components/ui/Surface";

type ReadinessPageLoadResult =
  | { data: WorkspaceReadinessDTO }
  | { error: unknown };

async function loadReadinessPage(): Promise<ReadinessPageLoadResult> {
  try {
    return { data: await getWorkspaceReadinessForWorkspace() };
  } catch (error) {
    return { error };
  }
}

export default async function WorkspaceReadinessPage() {
  const result = await loadReadinessPage();

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
              ? "Control Checkpoint is available to Administrators only."
              : "The readiness checks could not be loaded from the active workspace."}
          </p>
          <Link
            href="/settings"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Settings
          </Link>
        </Surface>
        </div>
      </div>
    );
  }

  return <WorkspaceReadinessPanel initialData={result.data} />;
}
