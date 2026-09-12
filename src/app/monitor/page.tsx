import { LockKeyhole, Radio } from "lucide-react";
import { isDataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/ui/Surface";
import TeamMonitorClient from "./TeamMonitorClient";

export default async function TeamMonitorPage() {
  try {
    await requireWorkspaceRole(["team_leader", "administrator"]);
  } catch (error) {
    const isForbidden = isDataAccessError(error) && error.code === "FORBIDDEN";
    return (
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <PageHeader
          icon={Radio}
          title="Live Team Operator Monitor"
          description="Live team monitoring is restricted to authorized workspace roles."
          badge={{ label: "Unavailable", tone: "unavailable" }}
        />
        <div className="mx-auto max-w-xl">
        <Surface variant="empty" className="w-full">
          <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
          <h2 className="text-base font-semibold text-zinc-100">
            Live monitor unavailable
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
            {isForbidden
              ? "Live team monitoring is available to Team Leaders and Administrators only."
              : "Live team monitoring could not be loaded from the active workspace. No operator activity was shown."}
          </p>
        </Surface>
        </div>
      </div>
    );
  }

  return <TeamMonitorClient />;
}
