"use client";

import { cn } from "@/lib/utils/cn";
import type { AppMode } from "@/lib/hooks/use-app-mode";

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: AppMode;
  onChange: (m: AppMode) => void;
}) {
  return (
    <div className="flex rounded-lg bg-slate-800/80 p-0.5 text-xs font-medium">
      <button
        type="button"
        className={cn(
          "flex-1 rounded-md px-3 py-1.5 transition-colors",
          mode === "analysis"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        )}
        onClick={() => onChange("analysis")}
      >
        Analysis
      </button>
      <button
        type="button"
        className={cn(
          "flex-1 rounded-md px-3 py-1.5 transition-colors",
          mode === "learning"
            ? "bg-violet-600 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        )}
        onClick={() => onChange("learning")}
      >
        Learning
      </button>
    </div>
  );
}
