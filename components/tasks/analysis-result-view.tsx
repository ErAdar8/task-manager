"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Task } from "@/schemas/tasks";

/** Where this workflow lives — prepend (with CLAUDE_CURSOR_PROMPT_PREAMBLE) when copying mini-prompts for Claude. */
export const TASK_HELPER_CONTEXT_FOR_CLAUDE = `Context: The user is working in Task Helper, a local app for planning and tracking software work. They define tasks (title, description, repo notes), run analysis flows like "Understand & Execute," and get structured output: goals, topic summaries, per-stage mini-prompts, and optional testing or QA views. Task Helper is the system of record for task state, stage checkboxes, and architecture notes; your job here is not to replace that workflow but to turn each mini-prompt into one paste-ready Cursor implementation prompt for the next coding step. Assume the user will return to Task Helper to mark progress and refine the task; do not invent a parallel process or extra tooling outside what the mini-prompt implies.`;

/** Role instructions — combined with TASK_HELPER_CONTEXT_FOR_CLAUDE when copying. */
export const CLAUDE_CURSOR_PROMPT_PREAMBLE = `You are Claude. Your job is to write a single, execution-ready implementation prompt for Cursor (the IDE agent) — not to implement code yourself.

Based on the task description and the mini-prompt below, produce a Cursor prompt that is clear, scoped, and ready to paste. Stay focused on what was asked. Do not add extra improvements, refactors, or scope creep. Do not invent files, components, or APIs that are not implied by the task.

The Cursor prompt you write must include: a short task summary; step-by-step stages Cursor should follow; explicit scope boundaries (what is in scope and what is out of scope); and a final line instructing Cursor to keep the work minimal and avoid unnecessary changes.

Mini-prompt (context for you to turn into that Cursor prompt):`;

/** Full block prepended when copying the preamble alone or a stage mini-prompt (Task Helper + role). */
export const CLAUDE_FULL_MINI_PROMPT_PREAMBLE = `${TASK_HELPER_CONTEXT_FOR_CLAUDE}\n\n${CLAUDE_CURSOR_PROMPT_PREAMBLE}`;

function formatProjectRepoContextForClaude(projectRepoScan?: string): string {
  const scan = (projectRepoScan ?? "").trim();
  if (!scan) return "Repo context: (none provided for this project)";
  return `Repo context (project-specific):\n${scan}`;
}

export function buildClaudeCopyPreamble(opts?: { projectRepoScan?: string }): string {
  const repo = formatProjectRepoContextForClaude(opts?.projectRepoScan);
  return `${TASK_HELPER_CONTEXT_FOR_CLAUDE}\n\n${repo}\n\n${CLAUDE_CURSOR_PROMPT_PREAMBLE}`;
}

function CopyMiniPrompt({ preamble, prompt }: { preamble: string; prompt: string }) {
  const [done, setDone] = useState(false);
  const fullText = `${preamble}\n\n${prompt}`;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 shrink-0 text-xs text-slate-400 hover:text-slate-100"
      onClick={() => {
        void navigator.clipboard.writeText(fullText);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
    >
      <ClipboardCopy className="h-3.5 w-3.5 mr-1" />
      {done ? "Copied" : "Copy"}
    </Button>
  );
}

export function stageDoneStorageKey(taskId: string, stageNumber: number) {
  return `task:${taskId}:stage:${stageNumber}:done`;
}

export function StageDoneCheckbox({
  taskId,
  stageNumber,
  title,
}: {
  taskId: string;
  stageNumber: number;
  title: string;
}) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setChecked(localStorage.getItem(stageDoneStorageKey(taskId, stageNumber)) === "1");
    } catch {
      /* ignore */
    }
  }, [taskId, stageNumber]);

  const toggle = () => {
    setChecked((prev) => {
      const next = !prev;
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(stageDoneStorageKey(taskId, stageNumber), next ? "1" : "0");
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="flex items-start gap-2">
      <input
        type="checkbox"
        className="mt-1.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
        checked={checked}
        onChange={toggle}
        aria-label={`Mark stage ${stageNumber} done`}
      />
      <span
        className={`font-medium text-slate-100 min-w-0 flex-1 ${checked ? "opacity-60 line-through text-slate-500" : ""}`}
      >
        {title}
      </span>
    </div>
  );
}

/** Callout: Task Helper context + repo context + Claude role text, with a copy button for the full block. */
export function ClaudePreambleCallout({ projectRepoScan }: { projectRepoScan?: string }) {
  const [copied, setCopied] = useState(false);
  const fullText = buildClaudeCopyPreamble({ projectRepoScan });
  const repoText = formatProjectRepoContextForClaude(projectRepoScan);
  return (
    <div className="rounded-md border border-emerald-800/40 bg-emerald-950/20 p-3 text-sm text-slate-300 mb-3 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">
          For Claude (not Cursor)
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 border-emerald-800/50 text-xs text-emerald-200 hover:bg-emerald-950/50"
          onClick={() => {
            void navigator.clipboard.writeText(fullText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          <ClipboardCopy className="h-3.5 w-3.5 mr-1" />
          {copied ? "Copied" : "Copy preamble"}
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-emerald-500/90 mb-1">Task Helper</p>
          <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{TASK_HELPER_CONTEXT_FOR_CLAUDE}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-emerald-500/90 mb-1">Repo context</p>
          <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{repoText}</p>
        </div>
        <p className="whitespace-pre-wrap leading-relaxed">{CLAUDE_CURSOR_PROMPT_PREAMBLE}</p>
      </div>
    </div>
  );
}

function asRecordArray(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is Record<string, unknown> => x !== null && typeof x === "object");
}

function formatLastAnalysisKind(kind: string | null | undefined): string {
  if (!kind) return "";
  if (kind === "testing_understand") return "testing understand";
  if (kind === "qa_general") return "QA (General)";
  return kind;
}

export function AnalysisResultView({
  task,
  projectRepoScan,
}: {
  task: Task;
  projectRepoScan?: string;
}) {
  const exec = task.canonical_execute_result as Record<string, unknown> | null | undefined;
  const und = task.canonical_understand_result as Record<string, unknown> | null | undefined;
  const test = task.canonical_testing_result as Record<string, unknown> | null | undefined;
  const qa = task.canonical_qa_result as Record<string, unknown> | null | undefined;
  const hasExecute = exec && Object.keys(exec).length > 0;
  const hasUnderstand = und && Object.keys(und).length > 0;
  const hasTesting = test && Object.keys(test).length > 0;
  const hasQa = qa && Object.keys(qa).length > 0;

  if (!hasExecute && !hasUnderstand && !hasTesting && !hasQa) return null;

  const executionPlan = asRecordArray(exec?.execution_plan);
  const topicCardsExec = asRecordArray(exec?.topic_cards);
  const topicByIdExec = new Map<string, Record<string, unknown>>();
  for (const tc of topicCardsExec) {
    const id = tc.id;
    if (typeof id === "string" && id) topicByIdExec.set(id, tc);
  }
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
          <span className="text-slate-500">
            {" "}
            — last run: {formatLastAnalysisKind(task.last_analysis_kind)}
          </span>
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
          {executionPlan.length > 0 && (
            <div>
              <ClaudePreambleCallout projectRepoScan={projectRepoScan} />
              <p className="text-xs text-slate-500 mb-2">Execution stages &amp; mini-prompts</p>
              <div className="space-y-3">
                {executionPlan.map((step, i) => {
                  const title = String(step.stage_title ?? `Stage ${i + 1}`);
                  const prompt = typeof step.mini_prompt === "string" ? step.mini_prompt : "";
                  const topicId = typeof step.topic_card_id === "string" ? step.topic_card_id : "";
                  const linked = topicId ? topicByIdExec.get(topicId) : undefined;
                  const topicSummary =
                    typeof linked?.description === "string" ? linked.description : "";
                  const stageNum =
                    typeof step.stage_number === "number" ? step.stage_number : i + 1;
                  return (
                    <div key={`ex-${i}`} className="text-sm text-slate-200 flex gap-2">
                      <span className="text-slate-500 shrink-0 w-6 tabular-nums pt-0.5">{stageNum}.</span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <StageDoneCheckbox taskId={task.id} stageNumber={stageNum} title={title} />
                        {topicSummary ? (
                          <p className="text-xs text-slate-400 whitespace-pre-wrap">{topicSummary}</p>
                        ) : null}
                        {prompt && (
                          <div className="mt-2 rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-300 whitespace-pre-wrap flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <span className="flex-1 min-w-0">{prompt}</span>
                            <CopyMiniPrompt
                              preamble={buildClaudeCopyPreamble({ projectRepoScan })}
                              prompt={prompt}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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

      {hasTesting && (
        <div className="space-y-4 border-b border-slate-800 pb-4 last:border-0 last:pb-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-400/90">
            Testing Mode &amp; Understanding
          </p>
          {typeof test?.high_level_goal === "string" && test.high_level_goal && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Goal</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{test.high_level_goal}</p>
            </div>
          )}
          {test?.system_under_test != null && typeof test.system_under_test === "object" && (
            <div className="rounded-md border border-slate-700 bg-slate-950/50 p-3 text-sm space-y-1">
              <p className="text-xs text-slate-500">System under test</p>
              {typeof (test.system_under_test as { name?: string }).name === "string" && (
                <p className="font-medium text-slate-100">
                  {(test.system_under_test as { name: string }).name}
                </p>
              )}
              {typeof (test.system_under_test as { scope?: string }).scope === "string" && (
                <p className="text-slate-400 whitespace-pre-wrap">
                  {(test.system_under_test as { scope: string }).scope}
                </p>
              )}
            </div>
          )}
          {asRecordArray(test?.comparison_axes).length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">What to compare</p>
              <ul className="space-y-2">
                {asRecordArray(test?.comparison_axes).map((ax, i) => (
                  <li key={`ax-${i}`} className="text-sm border-l-2 border-sky-700/50 pl-3">
                    <span className="font-medium text-slate-200">{String(ax.metric ?? "Metric")}</span>
                    {typeof ax.how_to_measure === "string" && (
                      <p className="text-slate-400 mt-0.5">Measure: {ax.how_to_measure}</p>
                    )}
                    {typeof ax.success_signal === "string" && (
                      <p className="text-slate-500 text-xs mt-0.5">Success: {ax.success_signal}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {asRecordArray(test?.test_scenarios).length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Scenarios &amp; inputs</p>
              <ol className="space-y-3 list-decimal list-inside">
                {asRecordArray(test?.test_scenarios).map((sc, i) => (
                  <li key={`sc-${i}`} className="text-sm text-slate-200">
                    <span className="font-medium text-slate-100">{String(sc.title ?? `Scenario ${i + 1}`)}</span>
                    {typeof sc.purpose === "string" && sc.purpose && (
                      <p className="text-slate-400 mt-1 whitespace-pre-wrap">{sc.purpose}</p>
                    )}
                    {asRecordArray(sc.inputs).length > 0 && (
                      <ul className="mt-2 ml-4 list-disc space-y-1 text-slate-300">
                        {asRecordArray(sc.inputs).map((inp, j) => (
                          <li key={`inp-${i}-${j}`} className="whitespace-pre-wrap">
                            <span className="text-slate-500">
                              {String(inp.label ?? "input")}
                              {inp.input_type ? ` (${String(inp.input_type)})` : ""}:{" "}
                            </span>
                            {String(inp.content ?? "")}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {typeof test?.decision_rule === "string" && test.decision_rule && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Decision rule</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{test.decision_rule}</p>
            </div>
          )}
          {Array.isArray(test?.clarifications_needed) &&
            (test.clarifications_needed as unknown[]).length > 0 && (
              <div className="rounded-md border border-amber-800/50 bg-amber-950/20 p-3 text-sm text-amber-200">
                <p className="font-medium mb-1">Clarifications needed</p>
                <pre className="text-xs whitespace-pre-wrap overflow-auto">
                  {JSON.stringify(test.clarifications_needed, null, 2)}
                </pre>
              </div>
            )}
          <details className="group">
            <summary className="cursor-pointer text-sm text-sky-300 hover:text-sky-200">
              Testing plan (raw JSON)
            </summary>
            <pre className="mt-2 max-h-[min(320px,40vh)] overflow-auto rounded border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
              {JSON.stringify(test, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {hasQa && (
        <div className="space-y-4 border-b border-slate-800 pb-4 last:border-0 last:pb-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-400/90">
            {task.last_analysis_kind === "qa_general"
              ? "QA Test Analysis (General)"
              : "QA Test Analysis (KALK)"}
          </p>
          {typeof qa?.high_level_goal === "string" && qa.high_level_goal && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Goal</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{qa.high_level_goal}</p>
            </div>
          )}
          {typeof qa?.qa_report_markdown === "string" && qa.qa_report_markdown && (
            <div>
              <p className="text-xs text-slate-500 mb-2">QA report</p>
              <div className="rounded-md border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-200 whitespace-pre-wrap">{qa.qa_report_markdown}</div>
            </div>
          )}
          {Array.isArray(qa?.clarifications_needed) && (qa.clarifications_needed as unknown[]).length > 0 && (
            <div className="rounded-md border border-amber-800/50 bg-amber-950/20 p-3 text-sm text-amber-200">
              <p className="font-medium mb-1">Clarifications needed</p>
              <pre className="text-xs whitespace-pre-wrap overflow-auto">
                {JSON.stringify(qa.clarifications_needed, null, 2)}
              </pre>
            </div>
          )}
          <details className="group">
            <summary className="cursor-pointer text-sm text-teal-300 hover:text-teal-200">
              QA analysis (raw JSON)
            </summary>
            <pre className="mt-2 max-h-[min(320px,40vh)] overflow-auto rounded border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
              {JSON.stringify(qa, null, 2)}
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
