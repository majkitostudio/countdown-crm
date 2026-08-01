"use client";

import { useState } from "react";
import { BarChart2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type TimeFrame = "today" | "week" | "month";

interface HourlyData {
  hour: string;
  calls: number;
  conversions: number;
  isPeak?: boolean;
}

const HOURLY_DATA: HourlyData[] = [
  { hour: "08:00", calls: 8, conversions: 2 },
  { hour: "09:00", calls: 14, conversions: 5 },
  { hour: "10:00", calls: 24, conversions: 9, isPeak: true },
  { hour: "11:00", calls: 28, conversions: 11, isPeak: true },
  { hour: "12:00", calls: 12, conversions: 3 },
  { hour: "13:00", calls: 10, conversions: 2 },
  { hour: "14:00", calls: 18, conversions: 6 },
  { hour: "15:00", calls: 22, conversions: 8 },
  { hour: "16:00", calls: 16, conversions: 4 },
  { hour: "17:00", calls: 9, conversions: 2 },
];

export function CallActivityChart() {
  const [timeframe, setTimeframe] = useState<TimeFrame>("today");
  const [hoveredHour, setHoveredHour] = useState<HourlyData | null>(null);

  const maxCalls = 30;

  return (
    <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Call Volume & Hourly Activity
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Distribution of outbound calls and closed deals across peak hours
          </p>
        </div>

        {/* Timeframe Switcher */}
        <div className="flex items-center p-1 rounded-lg bg-zinc-950 border border-zinc-800/80 self-start sm:self-auto">
          {(["today", "week", "month"] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium capitalize transition-all",
                timeframe === tf
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {tf === "today" ? "Today" : tf === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="space-y-4">
        <div className="h-48 flex items-end justify-between gap-2 pt-4 px-2 relative border-b border-zinc-800/80">
          {HOURLY_DATA.map((item) => {
            const heightPercent = (item.calls / maxCalls) * 100;
            const isHovered = hoveredHour?.hour === item.hour;

            return (
              <div
                key={item.hour}
                onMouseEnter={() => setHoveredHour(item)}
                onMouseLeave={() => setHoveredHour(null)}
                className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end relative"
              >
                {/* Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 z-20 px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-[11px] text-zinc-200 shadow-xl whitespace-nowrap">
                    <div className="font-semibold text-zinc-100">{item.hour}</div>
                    <div className="text-zinc-400">
                      Calls: <span className="text-zinc-100">{item.calls}</span> | Deals: <span className="text-zinc-100">{item.conversions}</span>
                    </div>
                  </div>
                )}

                {/* Bar Stack */}
                <div className="w-full max-w-[28px] bg-zinc-950 rounded-t overflow-hidden flex flex-col justify-end transition-all">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={cn(
                      "w-full transition-all duration-300 rounded-t",
                      item.isPeak
                        ? "bg-zinc-300 group-hover:bg-zinc-100"
                        : "bg-zinc-800 group-hover:bg-zinc-700"
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="flex justify-between px-2 text-[10px] text-zinc-400 font-mono">
          {HOURLY_DATA.map((item) => (
            <span
              key={item.hour}
              className={cn(
                "transition-colors",
                hoveredHour?.hour === item.hour && "text-zinc-100 font-semibold"
              )}
            >
              {item.hour}
            </span>
          ))}
        </div>
      </div>

      {/* Chart Footer Info */}
      <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800/40">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-zinc-800" />
            Standard Calls
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-zinc-300" />
            Peak Hours (10:00 - 11:30)
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <Info className="w-3 h-3 text-zinc-400" />
          <span>Avg 3.8 min / call</span>
        </div>
      </div>
    </div>
  );
}
