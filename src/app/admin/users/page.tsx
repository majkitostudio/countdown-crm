import { LockKeyhole, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { loadTeamManagementAction } from "@/app/actions/teams";
import { UsersHubPanel } from "@/components/team/UsersHubPanel";
import { TeamManagementPanel } from "@/components/team/TeamManagementPanel";

export default async function UsersAndPermissionsPage() {
  const context = await requireWorkspaceContext();

  if (context.role !== "administrator") {
    return (
      <div className="mx-auto max-w-xl">
        <Surface variant="empty">
          <LockKeyhole className="mx-auto h-8 w-8 text-text-muted" />
          <h1 className="mt-4 text-base font-semibold text-text-primary">Users & Teams jsou dostupné pouze administrátorovi</h1>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-text-muted">
            Správa týmů, členství a workspace rolí není součástí operátorské ani Team Leader práce.
          </p>
        </Surface>
      </div>
    );
  }

  const data = await loadTeamManagementAction();

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <PageHeader
        icon={Users}
        title="Users & Teams"
        description="Kompletní správa pracovníků call centra, workspace rolí a členství v týmech."
        badge={{ label: "Administrator only", tone: "neutral" }}
        backLink={{ href: "/admin", label: "Back to Management" }}
      />
      <UsersHubPanel initialData={data} currentUserId={context.userId} />
      <TeamManagementPanel initialData={data} />
    </div>
  );
}
