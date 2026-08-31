import { LayoutDashboard, PhoneCall, Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { CallActivityChart } from "@/components/dashboard/CallActivityChart";
import { TopPerformers } from "@/components/dashboard/TopPerformers";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { ReorderWidget } from "@/components/dashboard/ReorderWidget";
import { NextBestActionCard } from "@/components/dashboard/NextBestActionCard";
import { TeamLeaderDailyBriefCard } from "@/components/dashboard/TeamLeaderDailyBriefCard";

export default function Home() {
  return (
    <div className="mx-auto max-w-screen-2xl space-y-6" data-testid="dashboard" data-scope="workspace">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard Overview"
        description="Persisted workspace metrics and activity; live telephony and presence remain unavailable in this pilot."
        badge={{ label: "Workspace data", tone: "neutral" }}
        actions={
          <>
            <Link href="/leads?create=1" className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Lead
            </Link>
            <Link href="/workspace" className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-2.5 text-xs font-medium text-zinc-950 shadow-sm transition-colors hover:bg-zinc-200">
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              Launch Operator Console
            </Link>
          </>
        }
      />

      <TeamLeaderDailyBriefCard />

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.85fr)]">
        <section className="space-y-3" aria-labelledby="dashboard-team-attention-title" data-testid="dashboard-team-attention">
          <div className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Team attention</p>
              <h2 id="dashboard-team-attention-title" className="mt-1 text-sm font-semibold text-zinc-100">Next opportunities from workspace data</h2>
            </div>
            <span className="text-[10px] text-zinc-600">No synthetic priorities</span>
          </div>
          <ReorderWidget />
          <NextBestActionCard />
        </section>

        <section className="space-y-3" aria-labelledby="dashboard-team-overview-title" data-testid="dashboard-team-overview">
          <div className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Team activity</p>
              <h2 id="dashboard-team-overview-title" className="mt-1 text-sm font-semibold text-zinc-100">Workspace performance at a glance</h2>
            </div>
            <span className="rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[10px] font-mono text-zinc-500">Workspace-scoped</span>
          </div>
          <KpiCards compact />
        </section>
      </div>

      <section className="space-y-3" aria-labelledby="dashboard-supporting-title" data-testid="dashboard-supporting-analytics">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Supporting context</p>
            <h2 id="dashboard-supporting-title" className="mt-1 text-sm font-semibold text-zinc-100">Team performance and activity</h2>
          </div>
          <span className="text-[10px] text-zinc-600">P2 / P3</span>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TopPerformers />
          </div>
          <div>
            <CallActivityChart />
          </div>
        </div>
      </section>

      <section aria-labelledby="dashboard-recent-activity-title" data-testid="dashboard-recent-activity">
        <h2 id="dashboard-recent-activity-title" className="sr-only">Recent workspace activity</h2>
        <RecentActivityFeed />
      </section>
    </div>
  );
}
