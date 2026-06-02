"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ClipboardCheck, Loader2, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

const QA_SUBS = [
  {
    id: "qa_kalk" as const,
    label: "KALK QA",
    description: "Test app.kalk.ai — regression, smoke tests, Playwright specs, Linear tickets",
    Icon: ClipboardCheck,
  },
  {
    id: "qa_general" as const,
    label: "General QA",
    description: "Test any software — equivalence partitioning, boundary analysis, system checklist",
    Icon: SearchCheck,
  },
];

export type QaAnalysisCardProps = {
  onRun: (qaMode: "qa_kalk" | "qa_general", userFocus?: string) => void | Promise<void>;
  isAnalyzing: boolean;
};

export type TaskAnalysisFlowChoice =
  | "execute"
  | "understand"
  | "testing_understand"
  | "qa_kalk"
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
  const isQa = value === "qa_kalk" || value === "qa_general";
  const qaSub: "qa_kalk" | "qa_general" = value === "qa_general" ? "qa_general" : "qa_kalk";
  const selected = QA_SUBS.find((s) => s.id === qaSub)!;
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
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="truncate">
            {isQa ? `QA: ${selected.label}` : "Pick KALK or General QA…"}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 shrink-0", open && "rotate-180")} />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-600 bg-slate-900 shadow-lg overflow-hidden">
            {QA_SUBS.map(({ id, label, description, Icon }) => {
              const active = id === qaSub && isQa;
              return (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    "w-full flex gap-2 text-left px-2 py-2 text-xs",
                    active ? "bg-teal-900/50 text-teal-50" : "text-slate-200 hover:bg-slate-800/80"
                  )}
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                  }}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-teal-400" />
                  <span className="min-w-0">
                    <span className="font-medium block">{label}</span>
                    <span className="text-slate-500 block mt-0.5">{description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function QaAnalysisCard({ onRun, isAnalyzing }: QaAnalysisCardProps) {
  const [open, setOpen] = useState(false);
  const [qaSubMode, setQaSubMode] = useState<"qa_kalk" | "qa_general">("qa_kalk");
  const [qaFocus, setQaFocus] = useState("");
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

  const selected = QA_SUBS.find((s) => s.id === qaSubMode)!;

  return (
    <div
      ref={rootRef}
      className={cn(
        "rounded-lg border p-4 flex flex-col gap-3 transition-colors",
        "border-teal-800/60 bg-teal-950/20 hover:border-teal-500/50",
        isAnalyzing && "opacity-60 pointer-events-none"
      )}
    >
      <div className="flex items-center gap-2 text-teal-300">
        <ClipboardCheck className="h-5 w-5 shrink-0" />
        <span className="font-medium">QA Test Analysis</span>
      </div>
      <p className="text-sm text-slate-400 flex-1">
        Myers-style test design — pick KALK (app.kalk.ai) or General QA (Sonnet).
      </p>

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between border-teal-600/60 bg-teal-950/30 text-teal-100 hover:bg-teal-900/40 hover:text-teal-50"
          )}
          disabled={isAnalyzing}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className="text-left truncate">
            <span className="font-medium">QA: {selected.label}</span>
            <span className="block text-xs font-normal text-slate-400 truncate">
              {selected.description.slice(0, 72)}
              {selected.description.length > 72 ? "…" : ""}
            </span>
          </span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
          />
        </Button>

        {open && (
          <div
            className="absolute z-50 mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 shadow-lg overflow-hidden"
            role="listbox"
          >
            {QA_SUBS.map(({ id, label, description, Icon }) => {
              const active = id === qaSubMode;
              return (
                <button
                  key={id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn(
                    "w-full flex gap-3 text-left px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-teal-900/50 text-teal-50"
                      : "text-slate-200 hover:bg-slate-800/80"
                  )}
                  onClick={() => {
                    setQaSubMode(id);
                    setOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0 mt-0.5 text-teal-400" />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium block">{label}</span>
                    <span className="text-xs text-slate-400 block">{description}</span>
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0 text-teal-400" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

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
        onClick={() => void onRun(qaSubMode, qaFocus.trim() || undefined)}
      >
        {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Run ${selected.label}`}
      </Button>
    </div>
  );
}
