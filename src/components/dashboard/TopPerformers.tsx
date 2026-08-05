"use client";

import { Trophy, ArrowUpRight } from "lucide-react";

interface AgentPerformer {
  rank: number;
  name: string;
  initials: string;
  calls: number;
  conversion: string;
  revenue: string;
}

const TOP_PERFORMERS: AgentPerformer[] = [
  {
    rank: 1,
    name: "Sarah Jenkins",
    initials: "SJ",
    calls: 32,
    conversion: "42.1%",
    revenue: "$2,840",
  },
  {
    rank: 2,
    name: "John Doe",
    initials: "JD",
    calls: 28,
    conversion: "36.5%",
    revenue: "$2,210",
  },
  {
    rank: 3,
    name: "Mike Ross",
    initials: "MR",
    calls: 25,
    conversion: "31.0%",
    revenue: "$1,890",
  },
  {
    rank: 4,
    name: "Elena Rostova",
    initials: "ER",
    calls: 21,
    conversion: "28.5%",
    revenue: "$1,510",
  },
];

export function TopPerformers() {
  return (
    <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-100">
            Top Performing Agents
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
          Shift Ranking
        </span>
      </div>

      {/* Performers List */}
      <div className="space-y-2.5">
        {TOP_PERFORMERS.map((agent) => (
          <div
            key={agent.name}
            className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between hover:border-zinc-700/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-5 text-center text-xs font-mono font-bold text-zinc-400">
                #{agent.rank}
              </span>
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-200">
                {agent.initials}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-zinc-200">
                  {agent.name}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {agent.calls} calls • {agent.conversion} conv.
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-zinc-100 font-mono">
                {agent.revenue}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer link */}
      <a
        href="/workspace"
        className="w-full py-2 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors flex items-center justify-center gap-1.5"
      >
        <span>Open Operator Workspace</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
