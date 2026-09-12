"use client";

import React from "react";
import { ChevronRight, ChevronUp, CircleHelp } from "lucide-react";
import { Surface } from "@/components/ui/Surface";

interface AdditionalQuestionsCardProps {
  questions: string[];
}

export function AdditionalQuestionsCard({ questions }: AdditionalQuestionsCardProps) {
  return (
    <Surface variant="page"><section className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold text-zinc-100">Discovery questions</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">Ask while you listen — in this order</p>
        </div>
        <ChevronUp className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
      </div>
      <div className="mt-3 divide-y divide-zinc-800/80">
        {questions.map((question) => (
          <div key={question} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <CircleHelp className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-zinc-200">{question}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
          </div>
        ))}
      </div>
    </section></Surface>
  );
}
