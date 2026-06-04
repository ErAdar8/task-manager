"use client";

import { useState } from "react";
import { ClipboardCheck, Loader2, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

const QA_SUBS = [
  {
    id: "qa_general" as const,
    label: "General QA",
    description: "Test any software — equivalence partitioning, boundary analysis, system checklist",
    Icon: SearchCheck,
  },
];

export type QaAnalysisCardProps = {
  onRun: (qaMode: "qa_general", userFocus?: string) => void | Promise<void>;
  isAnalyzing: boolean;
};

export type TaskAnalysisFlowChoice =
  | "execute"
  | "understand"
  | "testing_understand"
  | "qa_general";

/** Compact QA + sub-mode picker for New Task (sets default analysis flow only). */
export function QaAnalysisFlowPicker({
  value,
  onChange,
}: {
  value: TaskAnalysisFlowChoice;
  onChange: (m: TaskAnalysisFlowChoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const isQa = value === "qa_general";
  const selected = QA_SUBS[0]!;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "rounded-lg border p-3 text-left transition-colors flex flex-col gap-2 min-h-[120px]",
        isQa
          ? "border-teal-500/70 bg-teal-950/30 ring-1 ring-teal-500/40"
          : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
      )}
    >
      <div className="flex items-center gap-2 text-teal-300">
        <ClipboardCheck className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">QA Test Analysis</span>
      </div>
      <p className="text-xs text-slate-400 flex-1">
        KALK (app.kalk.ai) or General QA — Sonnet. Use the menu to choose sub-mode.
      </p>
      <div className="relative">
        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs text-left",
            "border-teal-600/50 bg-teal-950/20 text-teal-100 hover:bg-teal-900/30"
          )}
          onClick={() => { onChange("qa_general"); setOpen(false); }}
        >
          <span className="truncate">
            {isQa ? `QA: ${selected.label}` : "General QA"}
          </span>
        </button>
      </div>
    </div>
  );
}

export function QaAnalysisCard({ onRun, isAnalyzing }: QaAnalysisCardProps) {
  const [qaFocus, setQaFocus] = useState("");

  return (
    <div
      className={cn(
        "rounded-lg border p-4 flex flex-col gap-3 transition-colors",
        "border-teal-800/60 bg-teal-950/20 hover:border-teal-500/50",
        isAnalyzing && "opacity-60 pointer-events-none"
      )}
    >
      <div className="flex items-center gap-2 text-teal-300">
        <SearchCheck className="h-5 w-5 shrink-0" />
        <span className="font-medium">QA Test Analysis</span>
      </div>
      <p className="text-sm text-slate-400 flex-1">
        Myers-style test design — equivalence partitioning, boundary analysis, system checklist (Sonnet).
      </p>

      <div className="space-y-1.5">
        <label className="text-xs text-slate-500">QA focus (optional)</label>
        <Textarea
          value={qaFocus}
          onChange={(e) => setQaFocus(e.target.value)}
          placeholder="e.g. staging only, invite-by-email flow, regression priority…"
          className="min-h-[72px] bg-slate-800/80 border-slate-600 text-slate-100 text-sm"
          disabled={isAnalyzing}
        />
      </div>

      <Button
        type="button"
        className="bg-teal-600 hover:bg-teal-700 text-white w-full mt-auto"
        disabled={isAnalyzing}
        onClick={() => void onRun("qa_general", qaFocus.trim() || undefined)}
      >
        {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run QA Analysis"}
      </Button>
    </div>
  );
}
