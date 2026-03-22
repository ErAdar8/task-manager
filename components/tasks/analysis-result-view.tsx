"use client";

import { useState } from "react";
import { AlertTriangle, ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Task } from "@/schemas/tasks";

function CopyMini({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 shrink-0 text-xs text-slate-400 hover:text-slate-100"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
    >
      <ClipboardCopy className="h-3.5 w-3.5 mr-1" />
      {done ? "Copied" : "Copy"}
    </Button>
  );
}

function asRecordArray(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is Record<string, unknown> => x !== null && typeof x === "object");
}

export function AnalysisResultView({ task }: { task: Task }) {
  const exec = task.canonical_execute_result as Record<string, unknown> | null | undefined;
  const und = task.canonical_understand_result as Record<string, unknown> | null | undefined;
  const hasExecute = exec && Object.keys(exec).length > 0;
  const hasUnderstand = und && Object.keys(und).length > 0;

  if (!hasExecute && !hasUnderstand) return null;

  const executionPlan = asRecordArray(exec?.execution_plan);
  const topicCardsExec = asRecordArray(exec?.topic_cards);
  const topicCardsUnd = asRecordArray(und?.topic_cards);
  const readingOrder = Array.isArray(und?.reading_order) ? und.reading_order : [];
  const commonMistakes = asRecordArray(und?.common_mistakes);
  const keyConceptsExec = asRecordArray(exec?.key_concepts);
  const keyConceptsUnd = asRecordArray(und?.key_concepts);

  return (
    <div className="space-y-6 rounded-lg border border-slate-700 bg-slate-900/40 p-4">
      <p className="text-sm font-medium text-slate-400">
        Analysis output
        {task.last_analysis_kind && (
          <span className="text-slate-500"> — last run: {task.last_analysis_kind}</span>
        )}
      </p>

      {hasExecute && (
        <div className="space-y-4 border-b border-slate-800 pb-4 last:border-0 last:pb-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">
            Understand &amp; Execute
          </p>
          {typeof exec?.high_level_goal === "string" && exec.high_level_goal && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Goal</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{exec.high_level_goal}</p>
            </div>
          )}
          {topicCardsExec.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Topic cards</p>
              <ul className="space-y-2">
                {topicCardsExec.map((tc, i) => (
                  <li
                    key={`tc-ex-${i}`}
                    className="rounded-md border border-slate-700 bg-slate-950/50 p-3 text-sm"
                  >
                    <p className="font-medium text-slate-100">{String(tc.title ?? "Topic")}</p>
                    {typeof tc.description === "string" && (
                      <p className="text-slate-400 mt-1 whitespace-pre-wrap">{tc.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {executionPlan.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Execution stages &amp; mini-prompts</p>
              <ol className="space-y-3 list-decimal list-inside">
                {executionPlan.map((step, i) => {
                  const title = String(step.stage_title ?? `Stage ${i + 1}`);
                  const prompt = typeof step.mini_prompt === "string" ? step.mini_prompt : "";
                  return (
                    <li key={`ex-${i}`} className="text-sm text-slate-200">
                      <span className="font-medium text-slate-100">{title}</span>
                      {prompt && (
                        <div className="mt-2 ml-0 rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-300 whitespace-pre-wrap flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <span className="flex-1 min-w-0">{prompt}</span>
                          <CopyMini text={prompt} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
          {keyConceptsExec.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Key concepts</p>
              <ul className="space-y-2">
                {keyConceptsExec.map((k, i) => (
                  <li key={`kc-ex-${i}`} className="text-sm border-l-2 border-emerald-700/50 pl-3">
                    <span className="font-medium text-slate-200">{String(k.term ?? "Concept")}</span>
                    {typeof k.explanation === "string" && (
                      <p className="text-slate-400 mt-0.5">{k.explanation}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(exec?.clarifications_needed) && (exec.clarifications_needed as unknown[]).length > 0 && (
            <div className="rounded-md border border-amber-800/50 bg-amber-950/20 p-3 text-sm text-amber-200">
              <p className="font-medium mb-1">Clarifications needed</p>
              <pre className="text-xs whitespace-pre-wrap overflow-auto">
                {JSON.stringify(exec.clarifications_needed, null, 2)}
              </pre>
            </div>
          )}
          <details className="group">
            <summary className="cursor-pointer text-sm text-emerald-300 hover:text-emerald-200">
              Execute plan (raw JSON)
            </summary>
            <pre className="mt-2 max-h-[min(320px,40vh)] overflow-auto rounded border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
              {JSON.stringify(exec, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {hasUnderstand && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-400/90">
            Deep Understanding
          </p>
          {typeof und?.high_level_goal === "string" && und.high_level_goal && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Goal</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{und.high_level_goal}</p>
            </div>
          )}
          {topicCardsUnd.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Topic cards</p>
              <ul className="space-y-2">
                {topicCardsUnd.map((tc, i) => (
                  <li
                    key={`tc-ud-${i}`}
                    className="rounded-md border border-slate-700 bg-slate-950/50 p-3 text-sm"
                  >
                    <p className="font-medium text-slate-100">{String(tc.title ?? "Topic")}</p>
                    {typeof tc.description === "string" && (
                      <p className="text-slate-400 mt-1 whitespace-pre-wrap">{tc.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {readingOrder.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Reading order</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-200">
                {readingOrder.map((item, i) => (
                  <li key={`ro-${i}`}>
                    {typeof item === "string"
                      ? item
                      : typeof item === "object" && item !== null
                        ? JSON.stringify(item)
                        : String(item)}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {keyConceptsUnd.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Key concepts</p>
              <ul className="space-y-2">
                {keyConceptsUnd.map((k, i) => (
                  <li key={`kc-ud-${i}`} className="text-sm border-l-2 border-violet-700/50 pl-3">
                    <span className="font-medium text-slate-200">{String(k.term ?? "Concept")}</span>
                    {typeof k.explanation === "string" && (
                      <p className="text-slate-400 mt-0.5">{k.explanation}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {commonMistakes.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Common mistakes</p>
              <ul className="space-y-2">
                {commonMistakes.map((m, i) => (
                  <li
                    key={`cm-${i}`}
                    className="flex gap-2 rounded-md border border-amber-900/40 bg-amber-950/15 p-3 text-sm"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-100">
                        {String(m.title ?? m.mistake ?? `Mistake ${i + 1}`)}
                      </p>
                      {(typeof m.description === "string" || typeof m.how_to_avoid === "string") && (
                        <p className="text-amber-200/80 mt-1 text-xs whitespace-pre-wrap">
                          {typeof m.description === "string"
                            ? m.description
                            : String(m.how_to_avoid ?? "")}
                        </p>
                      )}
                      {!m.title && !m.mistake && !m.description && !m.how_to_avoid && (
                        <pre className="text-xs text-amber-200/80 mt-1 whitespace-pre-wrap">{JSON.stringify(m, null, 2)}</pre>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(und?.clarifications_needed) && (und.clarifications_needed as unknown[]).length > 0 && (
            <div className="rounded-md border border-amber-800/50 bg-amber-950/20 p-3 text-sm text-amber-200">
              <p className="font-medium mb-1">Clarifications needed</p>
              <pre className="text-xs whitespace-pre-wrap overflow-auto">
                {JSON.stringify(und.clarifications_needed, null, 2)}
              </pre>
            </div>
          )}
          <details className="group">
            <summary className="cursor-pointer text-sm text-violet-300 hover:text-violet-200">
              Deep understanding (raw JSON)
            </summary>
            <pre className="mt-2 max-h-[min(320px,40vh)] overflow-auto rounded border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
              {JSON.stringify(und, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
