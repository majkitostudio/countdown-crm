import { LockKeyhole, ShieldAlert } from "lucide-react";
import { ExceptionQueue } from "@/components/exceptions/ExceptionQueue";
import { PageHeader } from "@/components/layout/PageHeader";
import { isDataAccessError } from "@/lib/dal/errors";
import { listTeamLeaderExceptions } from "@/lib/dal/exceptionQueue";

type ExceptionsPageLoadResult =
  | { data: Awaited<ReturnType<typeof listTeamLeaderExceptions>> }
  | { error: unknown };

async function loadExceptionsPage(): Promise<ExceptionsPageLoadResult> {
  try {
    return { data: await listTeamLeaderExceptions() };
  } catch (error) {
    return { error };
  }
}

export default async function ExceptionsPage() {
  const result = await loadExceptionsPage();

  if ("error" in result) {
    const forbidden = isDataAccessError(result.error) && result.error.code === "FORBIDDEN";
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" aria-hidden="true" />
        <h1 className="text-base font-semibold text-zinc-100">Exception Queue unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
          {forbidden
            ? "This workspace queue is available to Team Leaders and Administrators only."
            : "Exception data could not be loaded. No placeholder problem was created."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6">
      <PageHeader
        icon={ShieldAlert}
        title="Team Leader Exception Queue"
        description="A focused list of callbacks, queue recovery, workflow failures and missing scripts that need a manager decision."
        badge={{ label: "Workspace operations", tone: result.data.items.some((item) => item.priority === "critical") ? "unavailable" : "neutral" }}
      />
      <ExceptionQueue initialData={result.data} />
    </div>
  );
}
