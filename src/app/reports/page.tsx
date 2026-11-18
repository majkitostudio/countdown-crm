import { BarChart3, PhoneCall, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { CallActivityChart } from "@/components/dashboard/CallActivityChart";
import { TopPerformers } from "@/components/dashboard/TopPerformers";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { ReorderWidget } from "@/components/dashboard/ReorderWidget";
import { NextBestActionCard } from "@/components/dashboard/NextBestActionCard";
import { AnalyticsPanel } from "@/components/analytics/AnalyticsPanel";
import { getRoleHomePath } from "@/lib/auth/roleHome";
import { isTeamLeaderOrAdministrator } from "@/lib/auth/roles";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { getButtonClassName } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

const REPORTS_TABS = [
  { key: "overview", label: "Přehled", href: "/reports" },
  { key: "revenue", label: "Příjmy a tým", href: "/reports?tab=revenue" },
] as const;

export default async function ReportsPage(
  props: { searchParams?: Promise<{ tab?: string }> },
) {
  const context = await requireWorkspaceContext();
  if (!isTeamLeaderOrAdministrator(context.role)) {
    redirect(getRoleHomePath(context.role));
  }

  const params = props.searchParams ? await props.searchParams : undefined;
  const activeTab = params?.tab === "revenue" ? "revenue" : "overview";

  const scope = context.role === "administrator" ? "workspace" : "team";
  const scopeLabel = scope === "workspace" ? "Celý pracovní prostor" : "Týmová data";

  return (
    <div className="mx-auto min-w-0 max-w-screen-2xl space-y-6 px-4 sm:px-6" data-testid="dashboard" data-scope={scope}>
      <PageHeader
        icon={BarChart3}
        title="Reporty"
        description={`Uložené metriky, příjmy a výkon za ${scope === "workspace" ? "celý pracovní prostor" : "tým"}; živá telefonie a dostupnost operátorů zatím v pilotu nejsou dostupné.`}
        badge={{ label: scopeLabel, tone: "neutral" }}
        actions={
          activeTab === "overview" ? (
            <>
              <Link href="/leads?create=1" className={getButtonClassName("secondary")}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Přidat lead
              </Link>
              <Link href="/console" className={getButtonClassName("primary")}>
                <PhoneCall className="h-4 w-4" aria-hidden="true" />
                Spustit operátorskou konzoli
              </Link>
            </>
          ) : undefined
        }
      />

      <nav aria-label="Sekce reportů" className="flex flex-wrap items-center gap-2">
        {REPORTS_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors duration-150 ease-interface",
                isActive
                  ? "border-zinc-700 bg-zinc-800 text-zinc-100"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {activeTab === "revenue" ? (
        <AnalyticsPanel />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.85fr)]">
            <Surface variant="page"><section className="space-y-3 p-5" aria-labelledby="dashboard-team-attention-title" data-testid="dashboard-team-attention">
              <div className="flex flex-wrap items-end justify-between gap-3 px-1">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Pozornost týmu</p>
                  <h2 id="dashboard-team-attention-title" className="mt-1 text-sm font-semibold text-zinc-100">Další příležitosti z dat {scope === "workspace" ? "pracovního prostoru" : "týmu"}</h2>
                </div>
              </div>
              <ReorderWidget scope={scope} />
              <NextBestActionCard scope={scope} />
            </section></Surface>

            <Surface variant="page"><section className="space-y-3 p-5" aria-labelledby="dashboard-team-overview-title" data-testid="dashboard-team-overview">
              <div className="flex flex-wrap items-end justify-between gap-3 px-1">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Aktivita týmu</p>
                  <h2 id="dashboard-team-overview-title" className="mt-1 text-sm font-semibold text-zinc-100">{scopeLabel} výkon na první pohled</h2>
                </div>
                <span className="rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] font-mono text-zinc-400">{scopeLabel}</span>
              </div>
              <KpiCards compact scope={scope} />
            </section></Surface>
          </div>

          <Surface variant="page"><section className="space-y-3 p-5" aria-labelledby="dashboard-supporting-title" data-testid="dashboard-supporting-analytics">
            <div className="flex items-end justify-between gap-3 px-1">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Podpůrný kontext</p>
                <h2 id="dashboard-supporting-title" className="mt-1 text-sm font-semibold text-zinc-100">Výkon a aktivita týmu</h2>
              </div>
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
            <h2 id="dashboard-recent-activity-title" className="sr-only">Nedávná aktivita {scope === "workspace" ? "pracovního prostoru" : "týmu"}</h2>
            <RecentActivityFeed scope={scope} />
          </section>
        </>
      )}
    </div>
  );
}
