"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, ClipboardCopy, Download, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleSection } from "@/components/collapsible-section";
import { LearningCard } from "@/components/cards/learning-card";
import { LearningModal } from "@/components/modals/learning-modal";
import type { StandaloneLearning } from "@/schemas/learnings";
import type { Task, TaskIssue } from "@/schemas/tasks";
import { generateTaskAwareRepoScanPromptFromDraft } from "@/lib/cursor-prompts";
import CompleteTaskModal from "@/components/tasks/complete-task-modal";
import { AnalysisTypeSelector } from "@/components/tasks/analysis-type-selector";
import { AnalysisResultView } from "@/components/tasks/analysis-result-view";
import {
  buildAnalyzedTaskExportMarkdown,
  exportFilenameForTask,
} from "@/lib/export-analyzed-task";

const DEFAULT_WORK_PROCESS_TEXT =
  "I started by researching REACT APP & EXTENSION and created 2 versions of extensions and one application.";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Build a prompt for Claude to produce a minimal architecture plan from the current Understanding. */
function generateClaudeArchitecturePrompt(task: Task): string {
  const u = task.understanding;
  const title = task.title;
  const raw = task.raw_input;
  if (!u) {
    return `TASK: ${title}\n\nDESCRIPTION:\n${raw}\n\n---\nProvide a minimal, practical architecture plan for this task. No code. No over-planning. Focus on what needs to be done to complete the task. Use clear sections and bullet points.`;
  }
  const stagesText =
    (u.stages?.length ?? 0) > 0
      ? u.stages!
          .map(
            (s, i) =>
              `Stage ${i + 1}: ${s.title}\nGoal: ${s.goal}\nTasks: ${s.tasks.join("; ")}\nDone when: ${s.completion_criteria.join("; ")}`
          )
          .join("\n\n")
      : (u.major_steps ?? []).join("\n");
  return `TASK: ${title}

DESCRIPTION:
${raw}

CURRENT UNDERSTANDING:
- Goal: ${u.high_level_goal}
- Why it matters: ${u.why_this_matters}
- Estimated time: ${u.estimated_time || "Not set"}

STAGES / STEPS:
${stagesText}

---
Provide a minimal, practical architecture plan to fulfill the above. Focus on Phase 1 / first implementation scope only. No code. No unnecessary future-proofing. Simple, readable structure: what to build, in what order, and how to know each part is done.`;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params.id === "string" ? params.id : null;
  const taskId = typeof params.taskId === "string" ? params.taskId : null;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState<number | null>(null);
  const [cursorRepoScan, setCursorRepoScan] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [standaloneLearnings, setStandaloneLearnings] = useState<StandaloneLearning[]>([]);
  const [detailLearningModalOpen, setDetailLearningModalOpen] = useState(false);
  const [detailLearning, setDetailLearning] = useState<StandaloneLearning | null>(null);
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [analysisRunningLabel, setAnalysisRunningLabel] = useState<string | null>(null);
  const [analyzeFullError, setAnalyzeFullError] = useState<string | null>(null);
  const [showAnalysisPicker, setShowAnalysisPicker] = useState(false);
  /** When task has a saved analysis_mode, user can open the full flow picker from the draft card. */
  const [showDraftFlowOverride, setShowDraftFlowOverride] = useState(false);
  const [workProcessDraft, setWorkProcessDraft] = useState("");
  const [isSavingWorkProcess, setIsSavingWorkProcess] = useState(false);
  const [isSavingIssues, setIsSavingIssues] = useState(false);
  const [newIssueWrong, setNewIssueWrong] = useState("");
  const [newIssueSolved, setNewIssueSolved] = useState("");
  const learningContentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [architectureDraft, setArchitectureDraft] = useState("");
  const [isSavingArchitecture, setIsSavingArchitecture] = useState(false);
  const [architectureSavedAt, setArchitectureSavedAt] = useState<number | null>(null);
  const [copyToastMessage, setCopyToastMessage] = useState(
    "Cursor prompt copied to clipboard!"
  );
  const notesTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const notesImageInputRef = useRef<HTMLInputElement>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftRawInput, setDraftRawInput] = useState("");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftCopyToast, setDraftCopyToast] = useState(false);
  const [exportCopiedAt, setExportCopiedAt] = useState<number | null>(null);
  const [addLearningModalOpen, setAddLearningModalOpen] = useState(false);
  const [learningDrafts, setLearningDrafts] = useState<
    Array<{ content: string; category: string; attachments: string[] }>
  >([
    { content: "", category: "", attachments: [] },
    { content: "", category: "", attachments: [] },
  ]);
  const [isAddingLearning, setIsAddingLearning] = useState(false);
  const [learningDraftImageTargetIndex, setLearningDraftImageTargetIndex] = useState<number | null>(null);
  const learningImageInputRef = useRef<HTMLInputElement>(null);
  const loadTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`);
    const json = (await res.json()) as { success: boolean; data?: Task };
    if (json.success && json.data) {
      setTask(json.data);
      setDraftTitle(json.data.title ?? "");
      setDraftRawInput(json.data.raw_input ?? "");
      setWorkProcessDraft(
        json.data.work_process?.trim()
          ? json.data.work_process
          : DEFAULT_WORK_PROCESS_TEXT
      );
      setNotes(json.data?.task_notes ?? "");
      setCursorRepoScan(json.data?.cursor_repo_scan ?? "");
      setArchitectureDraft(json.data?.architecture?.detailed_breakdown ?? "");
      setAnalyzeFullError(json.data?.analysis_error ?? null);
    } else {
      setTask(null);
    }
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

  useEffect(() => {
    setShowDraftFlowOverride(false);
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;
    void fetch(`/api/learnings?taskId=${encodeURIComponent(taskId)}`)
      .then((r) => r.json())
      .then((j: { success?: boolean; data?: StandaloneLearning[] }) => {
        if (j.success && j.data) setStandaloneLearnings(j.data);
      });
  }, [taskId, task?.updated_at]);

  const persistDraftFields = useCallback(async () => {
    if (!task) return;
    await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draftTitle.trim() || task.title,
        raw_input: draftRawInput,
        task_notes: notes,
        cursor_repo_scan: cursorRepoScan,
      }),
    });
  }, [task, draftTitle, draftRawInput, notes, cursorRepoScan]);

  const runAnalysis = useCallback(
    async (kind: "execute" | "understand", userQuestions?: string) => {
      if (!taskId || !task) return;
      setIsRunningAnalysis(true);
      setAnalyzeFullError(null);
      setAnalysisRunningLabel(
        kind === "execute"
          ? "Running execution analysis with Claude…"
          : "Running deep understanding analysis with Claude…"
      );
      try {
        if (task.status === "draft") {
          await persistDraftFields();
        }
        await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "analyzing" }),
        });
        const url =
          kind === "execute"
            ? `/api/tasks/${encodeURIComponent(taskId)}/analyze-execute`
            : `/api/tasks/${encodeURIComponent(taskId)}/analyze-understand`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body:
            kind === "execute"
              ? JSON.stringify({ mode: "execute" })
              : JSON.stringify({
                  mode: "understand",
                  userQuestions: userQuestions || undefined,
                }),
        });
        const json = (await res.json()) as { success?: boolean; data?: Task; error?: string };
        if (!json.success) {
          setAnalyzeFullError(json.error ?? "Analysis failed");
          await loadTask();
          return;
        }
        if (json.data) setTask(json.data);
        else await loadTask();
        setShowAnalysisPicker(false);
      } catch (e) {
        setAnalyzeFullError(e instanceof Error ? e.message : "Analysis failed");
        await loadTask();
      } finally {
        setIsRunningAnalysis(false);
        setAnalysisRunningLabel(null);
      }
    },
    [taskId, task, persistDraftFields, loadTask]
  );

  useEffect(() => {
    if (addLearningModalOpen && learningContentTextareaRef.current) {
      learningContentTextareaRef.current.focus();
    }
  }, [addLearningModalOpen]);

  const saveArchitecture = async () => {
    if (!taskId) return;
    const value = architectureDraft;
    const current = task?.architecture?.detailed_breakdown ?? "";
    if (value === current) return;
    setIsSavingArchitecture(true);
    try {
      await fetch(`/api/tasks/${encodeURIComponent(taskId)}/architecture`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detailed_breakdown: value }),
      });
      await loadTask();
      setArchitectureSavedAt(Date.now());
      setTimeout(() => setArchitectureSavedAt(null), 2500);
    } catch (e) {
      console.error("Failed to save architecture:", e);
    } finally {
      setIsSavingArchitecture(false);
    }
  };

  if (!projectId || !taskId) {
    return <main className="flex-1 flex items-center justify-center text-slate-400">Invalid task route</main>;
  }
  if (loading) {
    return <main className="flex-1 flex items-center justify-center text-slate-400">Loading task...</main>;
  }
  if (!task) {
    return <main className="flex-1 flex items-center justify-center text-slate-400">Task not found</main>;
  }

  // Full-page loading when Claude analysis is in progress
  if (task.status === "analyzing" || isRunningAnalysis) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100 p-8">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
        <p className="text-slate-400 font-medium">Analyzing with Claude…</p>
        <p className="text-sm text-slate-500 max-w-md text-center">
          {analysisRunningLabel ??
            "Running analysis. This usually takes 1–3 minutes depending on task size."}
        </p>
        {analyzeFullError && (
          <div className="mt-4 max-w-lg w-full rounded-lg border border-red-800 bg-red-950/30 p-4 text-left">
            <p className="text-sm font-medium text-red-300">Analysis failed</p>
            <p className="text-sm text-red-200 mt-1 whitespace-pre-wrap">{analyzeFullError}</p>
            <p className="text-xs text-slate-400 mt-2">Task has been set back to draft. You can fix the task and try again.</p>
          </div>
        )}
        <Link href={`/projects/${projectId}`} className="text-sm text-slate-500 hover:text-slate-300 mt-4">
          Back to project
        </Link>
      </main>
    );
  }

  const displayAnalysisError = analyzeFullError ?? task.analysis_error ?? null;
  const showAnalysisErrorBanner = !!displayAnalysisError && task.status === "draft";

  const saveNotes = async () => {
    if (notes === (task?.task_notes ?? "")) return;
    setIsSavingNotes(true);
    try {
      await fetch(`/api/tasks/${encodeURIComponent(task.id)}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_notes: notes,
          task_notes_images: task?.task_notes_images ?? [],
        }),
      });
      await loadTask();
      setNotesSavedAt(Date.now());
      setTimeout(() => setNotesSavedAt(null), 2500);
    } catch (error) {
      console.error("Failed to save notes:", error);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const saveNotesImages = async (nextImages: string[]) => {
    if (!task) return;
    setIsSavingNotes(true);
    try {
      await fetch(`/api/tasks/${encodeURIComponent(task.id)}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_notes: notes,
          task_notes_images: nextImages,
        }),
      });
      await loadTask();
      setNotesSavedAt(Date.now());
      setTimeout(() => setNotesSavedAt(null), 2500);
    } catch (error) {
      console.error("Failed to save notes images:", error);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const saveDraftTask = async () => {
    if (!task) return;
    setIsSavingDraft(true);
    try {
      await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draftTitle.trim() || task.title,
          raw_input: draftRawInput,
          task_notes: notes,
          cursor_repo_scan: cursorRepoScan,
        }),
      });
      await loadTask();
    } catch (error) {
      console.error("Failed to save draft task:", error);
      alert("Failed to save draft task.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const openAddLearningFromNotes = () => {
    const textarea = notesTextareaRef.current;
    const selected =
      textarea && textarea.selectionStart !== textarea.selectionEnd
        ? notes.slice(textarea.selectionStart, textarea.selectionEnd)
        : "";
    setLearningDrafts([
      { content: selected.trim(), category: "", attachments: [] },
      { content: "", category: "", attachments: [] },
    ]);
    setAddLearningModalOpen(true);
  };

  const openAddLearningModal = () => {
    setLearningDrafts([
      { content: "", category: "", attachments: [] },
      { content: "", category: "", attachments: [] },
    ]);
    setAddLearningModalOpen(true);
  };

  const addLearningsFromModal = async () => {
    if (!task) return;
    const toAdd = learningDrafts.filter((d) => d.content.trim().length > 0);
    if (toAdd.length === 0) return;
    setIsAddingLearning(true);
    try {
      for (const d of toAdd) {
        const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/learnings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: d.content.trim(),
            category: d.category.trim() || undefined,
            attachments: d.attachments ?? [],
          }),
        });
        if (!response.ok) throw new Error("Failed to add learning");
      }
      setAddLearningModalOpen(false);
      setLearningDrafts([
        { content: "", category: "", attachments: [] },
        { content: "", category: "", attachments: [] },
      ]);
      await loadTask();
      setCurrentStep(3);
    } catch (error) {
      console.error("Failed to add learning:", error);
      alert("Failed to add learning.");
    } finally {
      setIsAddingLearning(false);
    }
  };

  const copyExportToClipboard = async () => {
    if (!task) return;
    const md = buildAnalyzedTaskExportMarkdown(task);
    try {
      await navigator.clipboard.writeText(md);
      setExportCopiedAt(Date.now());
      setTimeout(() => setExportCopiedAt(null), 2500);
    } catch (err) {
      console.error("Clipboard failed:", err);
      alert("Could not copy to clipboard. Use Download instead.");
    }
  };

  const downloadExport = () => {
    if (!task) return;
    const md = buildAnalyzedTaskExportMarkdown(task);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilenameForTask(task);
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex-1 overflow-auto bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
        {showAnalysisErrorBanner && displayAnalysisError && (
          <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-red-300">Analysis failed</p>
              <p className="text-sm text-red-200 mt-1 whitespace-pre-wrap">{displayAnalysisError}</p>
              <p className="text-xs text-slate-400 mt-2">Task is back to draft. Fix and run Analyze Task again to clear.</p>
            </div>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200 shrink-0" onClick={() => setAnalyzeFullError(null)} aria-label="Dismiss">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl font-semibold">{task.title}</h1>
            <p className="text-sm text-slate-400">
              Status: {task.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-200 hover:bg-slate-800"
              onClick={() => void copyExportToClipboard()}
              title="Copy task card + full analysis as Markdown for a reviewer or agent"
            >
              <ClipboardCopy className="h-4 w-4 mr-2" />
              Export analyzed task
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-200 hover:bg-slate-800"
              onClick={downloadExport}
              title="Download the same content as a .md file"
            >
              <Download className="h-4 w-4 mr-2" />
              Download .md
            </Button>
            {exportCopiedAt != null && (
              <span className="text-xs text-emerald-400">Copied to clipboard</span>
            )}
          </div>
        </div>

        {task.status === "draft" ? (
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <h2 className="text-lg font-medium">Edit draft task</h2>
              <p className="text-sm text-slate-500 mt-1">
                Update the task below, then run the Cursor prompt and paste the result. Save and analyze when ready.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300">Title</label>
                <Input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="mt-1.5 bg-slate-800 border-slate-600 text-slate-100"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">Card description</label>
                <Textarea
                  value={draftRawInput}
                  onChange={(e) => setDraftRawInput(e.target.value)}
                  className="mt-1.5 min-h-[160px] bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                  placeholder="Paste the full task card or describe the task. Add notes or clarifications — analysis will use this full text."
                />
              </div>
              {!task.analysis_mode && (
                <AnalysisTypeSelector
                  onSelectExecute={() => void runAnalysis("execute")}
                  onSelectUnderstand={(q) => void runAnalysis("understand", q)}
                  isAnalyzing={isRunningAnalysis}
                  runningLabel={analysisRunningLabel}
                />
              )}
              {task.analysis_mode && !showDraftFlowOverride && (
                <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 space-y-3">
                  <p className="text-sm text-slate-300">
                    <span className="text-slate-500">Saved flow:</span>{" "}
                    {task.analysis_mode === "execute"
                      ? "Understand & Execute"
                      : "Deep Understanding"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Chosen when the task was created. Use Change flow to pick a different analysis, or run with this flow.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={isRunningAnalysis}
                      onClick={() => void runAnalysis(task.analysis_mode!)}
                    >
                      Run analysis
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-600 text-slate-200"
                      disabled={isRunningAnalysis}
                      onClick={() => setShowDraftFlowOverride(true)}
                    >
                      Change flow
                    </Button>
                  </div>
                </div>
              )}
              {task.analysis_mode && showDraftFlowOverride && (
                <div className="space-y-2">
                  <AnalysisTypeSelector
                    onSelectExecute={() => void runAnalysis("execute")}
                    onSelectUnderstand={(q) => void runAnalysis("understand", q)}
                    isAnalyzing={isRunningAnalysis}
                    runningLabel={analysisRunningLabel}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-slate-400 hover:text-slate-200"
                    onClick={() => setShowDraftFlowOverride(false)}
                  >
                    Use saved flow instead
                  </Button>
                </div>
              )}
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-3">
                <p className="text-sm font-medium text-slate-300">Cursor repo scan</p>
                <p className="text-xs text-slate-500">
                  Copy the prompt below, run it in Cursor, then paste Cursor&apos;s answer in the box.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={() => {
                      const prompt = generateTaskAwareRepoScanPromptFromDraft(
                        draftTitle.trim() || task.title,
                        draftRawInput.trim() || "(see card description)"
                      );
                      void navigator.clipboard.writeText(prompt);
                      setDraftCopyToast(true);
                      setTimeout(() => setDraftCopyToast(false), 2500);
                    }}
                  >
                    <ClipboardCopy className="w-4 h-4 mr-2" />
                    Copy prompt for Cursor
                  </Button>
                  {draftCopyToast && (
                    <span className="text-xs text-emerald-400">Copied to clipboard</span>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mt-2">Paste Cursor&apos;s answer here</label>
                  <Textarea
                    value={cursorRepoScan}
                    onChange={(e) => setCursorRepoScan(e.target.value)}
                    className="mt-1.5 min-h-[120px] bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm"
                    placeholder="Paste the repo analysis from Cursor here. Analysis will use the project's Repo scan if set, or this value."
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700">
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-100"
                  onClick={() => void saveDraftTask()}
                  disabled={isSavingDraft || isRunningAnalysis}
                >
                  {isSavingDraft ? "Saving…" : "Save draft"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <h2 className="text-lg font-medium">Original task description</h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-200 whitespace-pre-wrap rounded-md bg-slate-800/50 p-4 border border-slate-700">
                {task.raw_input || "—"}
              </p>
              {(task.card_description_images?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {task.card_description_images!.map((dataUrl, i) => (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL from user upload
                    <img
                      key={i}
                      src={dataUrl}
                      alt=""
                      className="max-h-32 rounded border border-slate-600 object-contain"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(
          task.status === "draft" ||
          task.status === "ready" ||
          task.status === "understanding" ||
          task.status === "architecture_ready" ||
          task.status === "in_progress" ||
          task.status === "completed"
        ) && (
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-wrap gap-2 w-full">
                {(
                  [
                    { step: 1, label: "Understanding" },
                    { step: 2, label: "Notes" },
                    { step: 3, label: "Learnings" },
                    { step: 4, label: "Complete" },
                  ] as const
                ).map(({ step, label }) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setCurrentStep(step)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentStep === step
                        ? "bg-emerald-600/30 text-emerald-200 border border-emerald-500/50"
                        : "text-slate-400 hover:text-slate-200 border border-transparent"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {task.status !== "completed" && task.status !== "draft" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-600 text-slate-200"
                    onClick={() => setShowAnalysisPicker((v) => !v)}
                  >
                    {showAnalysisPicker ? "Hide re-analyze" : "Re-analyze"}
                  </Button>
                )}
                {task.status !== "draft" && (
                  <Button
                    variant="outline"
                    className="border-slate-600 text-slate-100"
                    onClick={() =>
                      router.push(`/projects/${projectId}/tasks/${task.id}/architecture`)
                    }
                  >
                    Full Architecture View
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {currentStep === 1 && (
                <div className="space-y-6">
                  {task.status !== "draft" &&
                    !task.understanding &&
                    task.analysis_mode &&
                    !showAnalysisPicker && (
                      <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 space-y-3">
                        <p className="text-sm text-slate-300">
                          <span className="text-slate-500">Saved flow:</span>{" "}
                          {task.analysis_mode === "execute"
                            ? "Understand & Execute"
                            : "Deep Understanding"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Use Re-analyze to switch flows, or run analysis with the saved flow below.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={isRunningAnalysis}
                            onClick={() => void runAnalysis(task.analysis_mode!)}
                          >
                            Run analysis
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-slate-600 text-slate-200"
                            disabled={isRunningAnalysis}
                            onClick={() => setShowAnalysisPicker(true)}
                          >
                            Change flow
                          </Button>
                        </div>
                      </div>
                    )}
                  {task.status !== "draft" &&
                    ((!task.understanding && (!task.analysis_mode || showAnalysisPicker)) ||
                      (task.understanding && showAnalysisPicker)) && (
                      <AnalysisTypeSelector
                        onSelectExecute={() => void runAnalysis("execute")}
                        onSelectUnderstand={(q) => void runAnalysis("understand", q)}
                        isAnalyzing={isRunningAnalysis}
                        runningLabel={analysisRunningLabel}
                      />
                    )}
                  <AnalysisResultView task={task} />
                  {!task.understanding ? (
                    <p className="text-sm text-slate-400">
                      {task.status === "draft"
                        ? task.analysis_mode && !showDraftFlowOverride
                          ? "Run analysis from the Edit draft task card above, or change flow to pick a different analysis."
                          : "Run Understand & Execute or Deep Understanding from the Edit draft task card above."
                        : task.analysis_mode && !showAnalysisPicker
                          ? "Run analysis with your saved flow above, or use Change flow / Re-analyze to switch."
                          : "Pick a flow above to run Claude analysis. To run again later, use Re-analyze in the header."}
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-400">Understanding</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          onClick={() => {
                            const prompt = generateClaudeArchitecturePrompt(task);
                            void navigator.clipboard.writeText(prompt);
                            setCopyToastMessage("Copied for Claude");
                            setShowCopyToast(true);
                            setTimeout(() => setShowCopyToast(false), 2500);
                          }}
                        >
                          <ClipboardCopy className="w-4 h-4 mr-2" />
                          Copy for Claude
                        </Button>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-400 mb-1">High-level goal</p>
                        <p className="text-slate-200 whitespace-pre-wrap">
                          {task.understanding.high_level_goal}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-400 mb-1">Why this matters</p>
                        <p className="text-slate-200 whitespace-pre-wrap">
                          {task.understanding.why_this_matters}
                        </p>
                      </div>
                      {task.understanding.estimated_time && (
                        <div>
                          <p className="text-sm font-medium text-slate-400 mb-1">Estimated time</p>
                          <p className="text-slate-200">{task.understanding.estimated_time}</p>
                        </div>
                      )}
                      {(task.understanding.stages?.length ?? 0) > 0 ? (
                        <div className="space-y-4">
                          <p className="text-sm font-medium text-slate-400">Stages</p>
                          {task.understanding.stages!.map((stage, idx) => (
                            <div
                              key={`${stage.title}-${idx}`}
                              className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 space-y-2"
                            >
                              <p className="font-medium text-slate-100">{stage.title}</p>
                              <p className="text-sm text-slate-300">{stage.goal}</p>
                              <ul className="text-sm text-slate-200 list-disc pl-5 space-y-0.5">
                                {stage.tasks.map((t, i) => (
                                  <li key={`${idx}-${i}`}>{t}</li>
                                ))}
                              </ul>
                              <p className="text-xs font-medium text-slate-400 pt-1">Done when:</p>
                              <ul className="text-xs text-slate-300 list-disc pl-5 space-y-0.5">
                                {stage.completion_criteria.map((c, i) => (
                                  <li key={`${idx}-c-${i}`}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : (
                        (task.understanding.major_steps?.length ?? 0) > 0 && (
                          <div>
                            <p className="text-sm font-medium text-slate-400 mb-1">Major steps</p>
                            <ol className="text-slate-200 list-decimal pl-5 space-y-1">
                              {task.understanding.major_steps!.map((step, i) => (
                                <li key={`${step}-${i}`}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )
                      )}
                      {(task.key_concepts?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-400 mb-2">Key concepts</p>
                          <ul className="space-y-4">
                            {task.key_concepts!.map((kc, i) => (
                              <li
                                key={`${kc.concept}-${i}`}
                                className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 space-y-1"
                              >
                                <p className="font-medium text-slate-200">{kc.concept}</p>
                                <p className="text-sm text-slate-300">{kc.explanation}</p>
                                <p className="text-xs text-slate-500">
                                  In this task: {kc.context_in_task}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                  <div className="space-y-3 pt-6 border-t border-slate-800">
                    <CollapsibleSection title="Architecture" defaultOpen={false}>
                      <div className="space-y-3">
                        <p className="text-sm text-slate-400">
                          Edit your architecture plan here. Use &quot;Copy for Claude&quot; above to generate a minimal plan, then paste or type here. Saved automatically when you leave the field.
                        </p>
                        <Textarea
                          value={architectureDraft}
                          onChange={(e) => setArchitectureDraft(e.target.value)}
                          onBlur={() => void saveArchitecture()}
                          placeholder="Paste or write your architecture plan."
                          className="min-h-[320px] bg-slate-800 border-slate-700 text-slate-100 font-mono text-sm whitespace-pre-wrap"
                        />
                        <div className="flex items-center gap-2">
                          {isSavingArchitecture && (
                            <span className="text-xs text-slate-400">Saving…</span>
                          )}
                          {architectureSavedAt != null && !isSavingArchitecture && (
                            <span className="text-xs text-emerald-400">Saved</span>
                          )}
                        </div>
                        {(task.status === "architecture_ready" || task.status === "ready") && (
                          <Button
                            onClick={async () => {
                              await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "in_progress" }),
                              });
                              await loadTask();
                            }}
                          >
                            Mark as In Progress
                          </Button>
                        )}
                      </div>
                    </CollapsibleSection>
                    <CollapsibleSection title="Work process" defaultOpen={false}>
                      <div className="space-y-3">
                        <p className="text-sm text-slate-400">
                          Document your work process for this task (saved automatically).
                        </p>
                        <Textarea
                          value={workProcessDraft}
                          onChange={(e) => setWorkProcessDraft(e.target.value)}
                          onBlur={async () => {
                            if (!task || workProcessDraft === (task.work_process ?? ""))
                              return;
                            setIsSavingWorkProcess(true);
                            try {
                              await fetch(
                                `/api/tasks/${encodeURIComponent(task.id)}`,
                                {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    work_process: workProcessDraft,
                                  }),
                                }
                              );
                              await loadTask();
                            } finally {
                              setIsSavingWorkProcess(false);
                            }
                          }}
                          className="min-h-[220px] bg-slate-800 border-slate-700 whitespace-pre-wrap text-slate-100"
                          placeholder={DEFAULT_WORK_PROCESS_TEXT}
                        />
                        {isSavingWorkProcess && (
                          <span className="text-xs text-slate-400">Saving...</span>
                        )}
                      </div>
                    </CollapsibleSection>
                    <CollapsibleSection title="Issues" defaultOpen={false}>
                      <div className="space-y-4">
                        <p className="text-sm text-slate-400">
                          Document problems you ran into and how you solved them.
                        </p>
                        {(task.issues ?? []).length === 0 ? (
                          <p className="text-sm text-slate-500">No issues logged yet.</p>
                        ) : (
                          <ul className="space-y-4">
                            {(task.issues ?? []).map((issue) => (
                              <li
                                key={issue.id}
                                className="border border-slate-700 rounded-lg p-4 bg-slate-800/50 space-y-2"
                              >
                                <p className="text-sm font-medium text-slate-300">What went wrong</p>
                                <p className="text-sm text-slate-200 whitespace-pre-wrap">
                                  {issue.what_went_wrong}
                                </p>
                                <p className="text-sm font-medium text-slate-300 pt-2">How it was solved</p>
                                <p className="text-sm text-slate-200 whitespace-pre-wrap">
                                  {issue.how_solved}
                                </p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 mt-2"
                                  onClick={async () => {
                                    const next = (task.issues ?? []).filter((i) => i.id !== issue.id);
                                    setIsSavingIssues(true);
                                    try {
                                      await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ issues: next }),
                                      });
                                      await loadTask();
                                    } finally {
                                      setIsSavingIssues(false);
                                    }
                                  }}
                                >
                                  Remove
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/30 space-y-3">
                          <p className="text-sm font-medium text-slate-300">Add issue</p>
                          <div>
                            <label className="text-xs text-slate-500">What went wrong</label>
                            <Textarea
                              value={newIssueWrong}
                              onChange={(e) => setNewIssueWrong(e.target.value)}
                              placeholder="Describe the problem..."
                              className="mt-1 min-h-[80px] bg-slate-800 border-slate-700 text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500">How you solved it</label>
                            <Textarea
                              value={newIssueSolved}
                              onChange={(e) => setNewIssueSolved(e.target.value)}
                              placeholder="Describe the solution..."
                              className="mt-1 min-h-[80px] bg-slate-800 border-slate-700 text-slate-100"
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-100"
                            disabled={!newIssueWrong.trim() || !newIssueSolved.trim() || isSavingIssues}
                            onClick={async () => {
                              const newIssue: TaskIssue = {
                                id: `issue_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                                what_went_wrong: newIssueWrong.trim(),
                                how_solved: newIssueSolved.trim(),
                                created_at: new Date().toISOString(),
                              };
                              const next = [...(task.issues ?? []), newIssue];
                              setIsSavingIssues(true);
                              try {
                                await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ issues: next }),
                                });
                                await loadTask();
                                setNewIssueWrong("");
                                setNewIssueSolved("");
                              } finally {
                                setIsSavingIssues(false);
                              }
                            }}
                          >
                            {isSavingIssues ? "Saving…" : "Add issue"}
                          </Button>
                        </div>
                      </div>
                    </CollapsibleSection>
                  </div>
                </div>
              )}
              {currentStep === 2 && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">
                    Implementation notes (saved automatically when you leave the field).
                  </p>
                  <Textarea
                    ref={notesTextareaRef}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={saveNotes}
                    placeholder="Add notes, blockers, and context..."
                    className="min-h-[220px] bg-slate-800 border-slate-700 text-slate-100"
                  />
                  <div>
                    <input
                      ref={notesImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files?.length || !task) return;
                        const urls = await Promise.all(Array.from(files).map(fileToDataUrl));
                        await saveNotesImages([...(task.task_notes_images ?? []), ...urls]);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-100"
                      onClick={() => notesImageInputRef.current?.click()}
                      disabled={isSavingNotes}
                    >
                      <ImagePlus className="w-4 h-4 mr-2" />
                      Add images
                    </Button>
                    {(task.task_notes_images?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(task.task_notes_images ?? []).map((dataUrl, i) => (
                          <div
                            key={i}
                            className="relative rounded border border-slate-600 overflow-hidden bg-slate-800"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- data URL from user upload */}
                            <img
                              src={dataUrl}
                              alt=""
                              className="h-20 w-20 object-cover"
                            />
                            <button
                              type="button"
                              aria-label="Remove image"
                              className="absolute top-0.5 right-0.5 rounded bg-black/70 p-1 text-white hover:bg-black"
                              onClick={() => {
                                const next = (task.task_notes_images ?? []).filter((_, j) => j !== i);
                                void saveNotesImages(next);
                              }}
                              disabled={isSavingNotes}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-100"
                      onClick={openAddLearningFromNotes}
                    >
                      + Add note to Learnings
                    </Button>
                    {isSavingNotes && (
                      <span className="text-xs text-slate-400">Saving…</span>
                    )}
                    {notesSavedAt != null && !isSavingNotes && (
                      <span className="text-xs text-emerald-400">Saved</span>
                    )}
                  </div>
                </div>
              )}
              {currentStep === 3 && (
                <div className="space-y-4">
                  {standaloneLearnings.length === 0 ? (
                    <p className="text-sm text-slate-400">No learnings yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {standaloneLearnings.map((l) => (
                        <LearningCard
                          key={l.id}
                          learning={l}
                          onOpen={() => {
                            setDetailLearning(l);
                            setDetailLearningModalOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-600 text-slate-100"
                    onClick={openAddLearningModal}
                  >
                    + Add learning
                  </Button>
                </div>
              )}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">
                    {task.status === "completed"
                      ? "This task is complete. Learnings are saved to your global library."
                      : "When you are finished, mark the task complete and capture final learnings."}
                  </p>
                  {task.status === "completed" ? (
                    <div className="space-y-3">
                      <p className="text-slate-200">Status: Completed</p>
                      <Link href="/learnings" className="inline-block text-emerald-400 hover:underline text-sm">
                        View all learnings →
                      </Link>
                    </div>
                  ) : (
                    task.status !== "draft" && (
                      <Button
                        variant="outline"
                        className="border-emerald-600 text-emerald-200 hover:bg-emerald-900/40"
                        onClick={() => setCompleteModalOpen(true)}
                      >
                        ✓ Mark Complete
                      </Button>
                    )
                  )}
                </div>
              )}
              <div className="flex flex-wrap justify-between gap-3 pt-6 mt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={currentStep <= 1}
                  onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                >
                  ← Previous
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={currentStep >= 4}
                  onClick={() => setCurrentStep((s) => Math.min(4, s + 1))}
                >
                  Next →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <h2 className="text-lg font-medium">Common Git commands</h2>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-slate-200 space-y-2 font-mono">
              <li><span className="text-slate-400">git status</span> — show working tree status</li>
              <li><span className="text-slate-400">git add .</span> — stage all changes</li>
              <li><span className="text-slate-400">git add &lt;file&gt;</span> — stage a file</li>
              <li><span className="text-slate-400">git commit -m &quot;message&quot;</span> — commit with message</li>
              <li><span className="text-slate-400">git push</span> — push to remote</li>
              <li><span className="text-slate-400">git pull</span> — pull from remote</li>
              <li><span className="text-slate-400">git branch</span> — list branches</li>
              <li><span className="text-slate-400">git checkout -b &lt;name&gt;</span> — create and switch branch</li>
              <li><span className="text-slate-400">git merge &lt;branch&gt;</span> — merge branch</li>
              <li><span className="text-slate-400">git log --oneline</span> — short commit history</li>
              <li><span className="text-slate-400">git diff</span> — show unstaged changes</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      <CompleteTaskModal
        open={completeModalOpen}
        taskTitle={task.title}
        onClose={() => setCompleteModalOpen(false)}
        onComplete={async (learnings) => {
          try {
            await fetch(`/api/tasks/${encodeURIComponent(task.id)}/complete`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ learnings }),
            });
            await loadTask();
            setCompleteModalOpen(false);
            setTimeout(() => {
              router.push("/learnings");
            }, 1500);
          } catch (error) {
            console.error("Failed to complete task:", error);
          }
        }}
      />
      {addLearningModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-gray-800 p-6 rounded-lg w-[min(92vw,640px)] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Add to Learning</h3>
            <p className="text-sm text-slate-400 mb-3">You can fill in 2 notes in parallel (or add more).</p>
            <div className="space-y-4">
              {learningDrafts.map((draft, index) => (
                <div key={index} className="border border-slate-700 rounded-md p-3 space-y-2">
                  <span className="text-xs font-medium text-slate-400">Note {index + 1}</span>
                  <div>
                    <label className="text-sm text-slate-300">Learning Content</label>
                    <Textarea
                      ref={index === 0 ? learningContentTextareaRef : undefined}
                      value={draft.content}
                      onChange={(e) =>
                        setLearningDrafts((prev) =>
                          prev.map((d, i) =>
                            i === index ? { ...d, content: e.target.value } : d
                          )
                        )
                      }
                      className="mt-1 min-h-[100px] bg-slate-900 border-slate-700 whitespace-pre-wrap"
                      placeholder="Write the key learning..."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300">Category (optional)</label>
                    <Input
                      value={draft.category}
                      onChange={(e) =>
                        setLearningDrafts((prev) =>
                          prev.map((d, i) =>
                            i === index ? { ...d, category: e.target.value } : d
                          )
                        )
                      }
                      className="mt-1 bg-slate-900 border-slate-700"
                      placeholder="e.g. API Design"
                    />
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-slate-200"
                      onClick={() => {
                        setLearningDraftImageTargetIndex(index);
                        learningImageInputRef.current?.click();
                      }}
                    >
                      <ImagePlus className="w-4 h-4 mr-1 inline" />
                      Add images
                    </Button>
                    {(draft.attachments?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(draft.attachments ?? []).map((dataUrl, i) => (
                          <div key={i} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element -- data URL from user upload */}
                            <img src={dataUrl} alt="" className="h-12 w-12 rounded object-cover border border-slate-600" />
                            <button
                              type="button"
                              aria-label="Remove"
                              className="absolute -top-0.5 -right-0.5 rounded bg-black/80 text-white w-4 h-4 flex items-center justify-center text-xs"
                              onClick={() =>
                                setLearningDrafts((prev) =>
                                  prev.map((d, j) =>
                                    j === index
                                      ? { ...d, attachments: (d.attachments ?? []).filter((_, k) => k !== i) }
                                      : d
                                  )
                                )
                              }
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-100"
                onClick={() =>
                  setLearningDrafts((prev) => [...prev, { content: "", category: "", attachments: [] }])
                }
              >
                + Add another note
              </Button>
              <input
                ref={learningImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files?.length || learningDraftImageTargetIndex === null) return;
                  const urls = await Promise.all(Array.from(files).map(fileToDataUrl));
                  setLearningDrafts((prev) =>
                    prev.map((d, i) =>
                      i === learningDraftImageTargetIndex
                        ? { ...d, attachments: [...(d.attachments ?? []), ...urls] }
                        : d
                    )
                  );
                  setLearningDraftImageTargetIndex(null);
                  e.target.value = "";
                }}
              />
              <div className="flex gap-2 justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-600 text-slate-100"
                  onClick={() => setAddLearningModalOpen(false)}
                  disabled={isAddingLearning}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void addLearningsFromModal()}
                  disabled={
                    isAddingLearning ||
                    !learningDrafts.some((d) => d.content.trim().length > 0)
                  }
                >
                  {isAddingLearning ? "Adding..." : "Add to Learning"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <LearningModal
        open={detailLearningModalOpen}
        learning={detailLearning}
        onClose={() => {
          setDetailLearningModalOpen(false);
          setDetailLearning(null);
        }}
        onSaved={async () => {
          await loadTask();
          if (taskId) {
            const res = await fetch(`/api/learnings?taskId=${encodeURIComponent(taskId)}`);
            const json = (await res.json()) as { success: boolean; data?: StandaloneLearning[] };
            if (json.success && json.data) setStandaloneLearnings(json.data);
          }
        }}
      />
      {showCopyToast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-slide-in">
          <Check className="w-5 h-5" />
          <span>{copyToastMessage}</span>
        </div>
      )}
    </main>
  );
}
