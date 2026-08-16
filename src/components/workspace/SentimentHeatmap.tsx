"use client";

import React from "react";
import { Activity, Smile, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SentimentSegment {
  timeLabel: string;
  sentiment: "Positive" | "Price Objection" | "Product Objection" | "Neutral";
  score: number;
}

interface SentimentHeatmapProps {
  segments: SentimentSegment[];
  currentSentiment: SentimentSegment["sentiment"];
  confidenceScore: number;
}

export function SentimentHeatmap({
  segments,
  currentSentiment,
  confidenceScore,
}: SentimentHeatmapProps) {
  const getSegmentColor = (sentiment: SentimentSegment["sentiment"]) => {
    switch (sentiment) {
      case "Positive":
        return "bg-zinc-300 hover:bg-zinc-100";
      case "Price Objection":
        return "bg-zinc-600 hover:bg-zinc-500";
      case "Product Objection":
        return "bg-zinc-700 hover:bg-zinc-600";
      default:
        return "bg-zinc-800 hover:bg-zinc-700";
    }
  };

  const getSentimentIcon = (sentiment: SentimentSegment["sentiment"]) => {
    switch (sentiment) {
      case "Positive":
        return <Smile className="w-3.5 h-3.5 text-zinc-300" />;
      case "Price Objection":
      case "Product Objection":
        return <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 space-y-2 text-xs">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-200">
            Sentiment preview
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
          <Sparkles className="w-3 h-3 text-zinc-400" />
          <span>{segments.length > 0 ? `Confidence ${confidenceScore}%` : "Sentiment data unavailable"}</span>
        </div>
      </div>

      {/* Heatmap Timeline Segments Bar */}
      <div className="space-y-1">
        <div className="flex items-center gap-1 h-3 rounded-lg overflow-hidden bg-zinc-900 p-0.5 border border-zinc-800">
          {segments.length > 0 ? (
            segments.map((seg, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-full flex-1 rounded-sm transition-all duration-300 relative group cursor-pointer",
                  getSegmentColor(seg.sentiment)
                )}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-200 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-30 transition-opacity font-mono">
                  {seg.timeLabel}: {seg.sentiment} ({seg.score}%)
                </div>
              </div>
            ))
          ) : (
            <div className="h-full w-full text-center text-[9px] leading-2.5 text-zinc-600">
              No sentiment data
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>0:00</span>
          <span>Průběh hovoru</span>
          <span>Nyní</span>
        </div>
      </div>

      {/* Current Trend Status Pill */}
      <div className="flex items-center pt-1 border-t border-zinc-800/60 text-[11px]">
        <span className="text-zinc-400 flex items-center gap-1.5">
          {getSentimentIcon(currentSentiment)}
          <span>Aktuální rozpoložení:</span>
          <strong className="text-zinc-200 font-medium">{segments.length > 0 ? currentSentiment : "Data unavailable"}</strong>
        </span>
      </div>
    </div>
  );
}
