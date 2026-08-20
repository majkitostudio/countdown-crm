"use client";

import React from "react";
import { ChevronRight, ChevronUp, CircleHelp } from "lucide-react";

interface AdditionalQuestionsCardProps {
  questions: string[];
}

export function AdditionalQuestionsCard({ questions }: AdditionalQuestionsCardProps) {
  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-100">Doplňující otázky</h2>
        <ChevronUp className="h-4 w-4 text-zinc-500" aria-hidden="true" />
      </div>
      <div className="mt-3 divide-y divide-zinc-800/80">
        {questions.map((question) => (
          <div key={question} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <CircleHelp className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-xs leading-relaxed text-zinc-300">{question}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
}
