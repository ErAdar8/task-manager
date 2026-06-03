"use client";

import { useState } from "react";
import { BookOpen, FlaskConical, Hammer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { QaAnalysisCard } from "@/components/tasks/qa-analysis-card";

export type AnalysisTypeSelectorProps = {
  onSelectExecute: () => void | Promise<void>;
  onSelectUnderstand: (userQuestions?: string) => void | Promise<void>;
  onSelectTestingUnderstand: (userFocus?: string) => void | Promise<void>;
  onSelectQa: (qaMode: "qa_general", userFocus?: string) => void | Promise<void>;
  isAnalyzing: boolean;
  runningLabel?: string | null;
  /** Aborts the in-flight analysis request (client); optional so other surfaces can omit */
  onCancelAnalysis?: () => void;
};

export function AnalysisTypeSelector({
  onSelectExecute,
  onSelectUnderstand,
  onSelectTestingUnderstand,
  onSelectQa,
  isAnalyzing,
  runningLabel,
  onCancelAnalysis,
}: AnalysisTypeSelectorProps) {
  const [userQuestions, setUserQuestions] = useState("");
  const [testingFocus, setTestingFocus] = useState("");

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:p-6 space-y-4">
      <h3 className="text-base font-medium text-slate-100">
        Choose an analysis flow
      </h3>
      {isAnalyzing && runningLabel && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-emerald-400/90">
          <div className="flex items-center gap-2 min-w-0">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span className="min-w-0">{runningLabel}</span>
          </div>
          {onCancelAnalysis && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-500 text-slate-200 shrink-0 self-start sm:self-center"
              onClick={onCancelAnalysis}
            >
              Cancel
            </Button>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div
          className={cn(
            "rounded-lg border p-4 flex flex-col gap-3 transition-colors",
            "border-emerald-800/60 bg-emerald-950/20 hover:border-emerald-500/50",
            isAnalyzing && "opacity-60 pointer-events-none"
          )}
        >
          <div className="flex items-center gap-2 text-emerald-400">
            <Hammer className="h-5 w-5" />
            <span className="font-medium">Understand &amp; Execute</span>
          </div>
          <p className="text-sm text-slate-400 flex-1">
            Topic cards, execution plan, and copyable mini-prompts (Opus).
          </p>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full mt-auto"
            disabled={isAnalyzing}
            onClick={() => void onSelectExecute()}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Understand & Execute"
            )}
          </Button>
        </div>

        <div
          className={cn(
            "rounded-lg border p-4 flex flex-col gap-3 transition-colors",
            "border-violet-800/60 bg-violet-950/20 hover:border-violet-500/50",
            isAnalyzing && "opacity-60 pointer-events-none"
          )}
        >
          <div className="flex items-center gap-2 text-violet-300">
            <BookOpen className="h-5 w-5" />
            <span className="font-medium">Deep Understanding</span>
          </div>
          <p className="text-sm text-slate-400">
            Topic cards, key concepts, reading order, and common mistakes (Sonnet).
          </p>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500">What confuses you? (optional)</label>
            <Textarea
              value={userQuestions}
              onChange={(e) => setUserQuestions(e.target.value)}
              placeholder="e.g. how routing ties to storage…"
              className="min-h-[72px] bg-slate-800/80 border-slate-600 text-slate-100 text-sm"
              disabled={isAnalyzing}
            />
          </div>
          <Button
            type="button"
            className="bg-violet-600 hover:bg-violet-700 text-white w-full mt-auto"
            disabled={isAnalyzing}
            onClick={() => void onSelectUnderstand(userQuestions.trim() || undefined)}
          >
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deep Understanding"}
          </Button>
        </div>

        <div
          className={cn(
            "rounded-lg border p-4 flex flex-col gap-3 transition-colors",
            "border-sky-800/60 bg-sky-950/20 hover:border-sky-500/50",
            isAnalyzing && "opacity-60 pointer-events-none"
          )}
        >
          <div className="flex items-center gap-2 text-sky-300">
            <FlaskConical className="h-5 w-5" />
            <span className="font-medium">Testing Mode &amp; Understanding</span>
          </div>
          <p className="text-sm text-slate-400">
            How to test, compare, and validate — scenarios and metrics, not coding mini-prompts (Sonnet).
          </p>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500">Testing focus (optional)</label>
            <Textarea
              value={testingFocus}
              onChange={(e) => setTestingFocus(e.target.value)}
              placeholder="e.g. compare new model vs baseline on latency and consistency…"
              className="min-h-[72px] bg-slate-800/80 border-slate-600 text-slate-100 text-sm"
              disabled={isAnalyzing}
            />
          </div>
          <Button
            type="button"
            className="bg-sky-600 hover:bg-sky-700 text-white w-full mt-auto"
            disabled={isAnalyzing}
            onClick={() => void onSelectTestingUnderstand(testingFocus.trim() || undefined)}
          >
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testing plan"}
          </Button>
        </div>

        <QaAnalysisCard onRun={onSelectQa} isAnalyzing={isAnalyzing} />
      </div>
    </div>
  );
}
