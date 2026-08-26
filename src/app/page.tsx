import { LayoutDashboard, PhoneCall, Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { CallActivityChart } from "@/components/dashboard/CallActivityChart";
import { TopPerformers } from "@/components/dashboard/TopPerformers";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { ReorderWidget } from "@/components/dashboard/ReorderWidget";

export default function Home() {
  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
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

      {/* 1. KPI Cards Row */}
      <KpiCards />

      {/* 2. Predictive Re-Order Engine Widget */}
      <ReorderWidget />

      {/* 3. Main Analytics Grid (Call Activity Chart + Top Performers) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CallActivityChart />
        </div>
        <div>
          <TopPerformers />
        </div>
      </div>

      {/* 4. Recent Activity Stream */}
      <RecentActivityFeed />
    </div>
  );
}
