import { LockKeyhole, Route } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { loadTeamOwnershipAction } from "@/app/actions/teams";
import { TeamOwnershipPanel } from "@/components/team/TeamOwnershipPanel";

export default async function TeamOwnershipPage() {
  const context = await requireWorkspaceContext();

  if (context.role !== "administrator") {
    return (
      <div className="mx-auto max-w-xl">
        <Surface variant="empty">
          <LockKeyhole className="mx-auto h-8 w-8 text-text-muted" />
          <h1 className="mt-4 text-base font-semibold text-text-primary">Team Ownership je dostupné pouze administrátorovi</h1>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-text-muted">
            Rozhodnutí, který tým je za zákazníka odpovědný, patří k nastavení workspace, ne k práci na lince.
          </p>
        </Surface>
      </div>
    );
  }

  const data = await loadTeamOwnershipAction();

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <PageHeader
        icon={Route}
        title="Team Ownership"
        description="Zákazníci a položky fronty, kterým ještě chybí odpovědný tým."
        badge={{ label: "Administrator only", tone: "neutral" }}
        backLink={{ href: "/admin", label: "Back to Management" }}
      />
      <TeamOwnershipPanel initialData={data} />
    </div>
  );
}
