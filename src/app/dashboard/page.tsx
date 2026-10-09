import { LayoutDashboard, PhoneCall, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { CallActivityChart } from "@/components/dashboard/CallActivityChart";
import { TopPerformers } from "@/components/dashboard/TopPerformers";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { ReorderWidget } from "@/components/dashboard/ReorderWidget";
import { NextBestActionCard } from "@/components/dashboard/NextBestActionCard";
import { TeamLeaderDailyBriefCard } from "@/components/dashboard/TeamLeaderDailyBriefCard";
import { getRoleHomePath } from "@/lib/auth/roleHome";
import { isTeamLeaderOrAdministrator } from "@/lib/auth/roles";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { getButtonClassName } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

export default async function DashboardPage() {
  const context = await requireWorkspaceContext();
  if (!isTeamLeaderOrAdministrator(context.role)) {
    redirect(getRoleHomePath(context.role));
  }

  const scope = context.role === "administrator" ? "workspace" : "team";
  const scopeLabel = scope === "workspace" ? "Celý workspace" : "Moje týmy";

  return (
    <div className="mx-auto min-w-0 max-w-screen-2xl space-y-6 px-4 sm:px-6" data-testid="dashboard" data-scope={scope}>
      <PageHeader
        icon={LayoutDashboard}
        title="Přehled"
        description={`Souhrn uložených dat: ${scopeLabel.toLowerCase()}. Online přítomnost a živé hovory zatím nejsou dostupné.`}
        badge={{ label: scopeLabel, tone: "neutral" }}
        actions={
          <>
            <Link href="/leads?create=1" className={getButtonClassName("secondary")}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Přidat kontakt
            </Link>
            <Link href="/workspace" className={getButtonClassName("primary")}>
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              Otevřít operátorskou konzoli
            </Link>
          </>
        }
      />

      <TeamLeaderDailyBriefCard />

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.85fr)]">
        <Surface variant="page"><section className="space-y-3 p-5" aria-labelledby="dashboard-team-attention-title" data-testid="dashboard-team-attention">
          <div className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <h2 id="dashboard-team-attention-title" className="text-sm font-semibold text-zinc-100">Co si zaslouží pozornost</h2>
            </div>
            <span className="text-xs text-zinc-500">Podle dostupných dat · {scopeLabel}</span>
          </div>
          <ReorderWidget scope={scope} />
          <NextBestActionCard scope={scope} />
        </section></Surface>

        <Surface variant="page"><section className="space-y-3 p-5" aria-labelledby="dashboard-team-overview-title" data-testid="dashboard-team-overview">
          <div className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <h2 id="dashboard-team-overview-title" className="text-sm font-semibold text-zinc-100">Výsledky · {scopeLabel}</h2>
            </div>
            <span className="rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[10px] font-mono text-zinc-500">{scopeLabel}</span>
          </div>
          <KpiCards compact scope={scope} />
        </section></Surface>
      </div>

      <Surface variant="page"><section className="space-y-3 p-5" aria-labelledby="dashboard-supporting-title" data-testid="dashboard-supporting-analytics">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <h2 id="dashboard-supporting-title" className="text-sm font-semibold text-zinc-100">Výkon týmu a aktivita</h2>
          </div>
          <span className="text-xs text-zinc-500">Další přehledy</span>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TopPerformers scope={scope} />
          </div>
          <div>
            <CallActivityChart />
          </div>
        </div>
      </section></Surface>

      <section aria-labelledby="dashboard-recent-activity-title" data-testid="dashboard-recent-activity">
        <h2 id="dashboard-recent-activity-title" className="sr-only">Poslední aktivita · {scopeLabel}</h2>
        <RecentActivityFeed scope={scope} />
      </section>
    </div>
  );
}
