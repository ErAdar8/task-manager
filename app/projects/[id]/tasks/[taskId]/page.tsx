"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, ClipboardCopy, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Learning, Task, TaskIssue } from "@/schemas/tasks";
import { generateTaskAwareRepoScanPromptFromDraft } from "@/lib/prompts";
import CompleteTaskModal from "@/components/tasks/complete-task-modal";

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

function getDisplayUnderstanding(task: Task): string {
  if (task.user_edited_understanding) {
    return task.user_edited_understanding;
  }
  if (!task.understanding) return "";
  const u = task.understanding;
  const parts = [
    `High-Level Goal:\n${u.high_level_goal}`,
    `Why This Matters:\n${u.why_this_matters}`,
    u.estimated_time ? `Estimated Time: ${u.estimated_time}` : "",
  ];
  if ((u.stages?.length ?? 0) > 0) {
    u.stages!.forEach((s, i) => {
      parts.push(`Stage ${i + 1}: ${s.title}\nGoal: ${s.goal}\nTasks:\n${s.tasks.map((t) => `- ${t}`).join("\n")}\nDone when:\n${s.completion_criteria.map((c) => `- ${c}`).join("\n")}`);
    });
  } else if ((u.major_steps?.length ?? 0) > 0) {
    parts.push(`Major Steps:\n${u.major_steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}`);
  }
  return parts.filter(Boolean).join("\n\n");
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

function generateCursorAnalysisPrompt(task: Task): string {
  const understanding = task.understanding;
  if (!understanding) {
    return `⚠️ ANALYSIS ONLY — DO NOT MAKE ANY CODE CHANGES ⚠️

TASK: ${task.title}

YOUR JOB: SCAN AND REPORT ONLY
Do NOT write or change any code. Analyze repository structure and report relevant files for this task.`;
  }

  return `⚠️ ANALYSIS ONLY — DO NOT MAKE ANY CODE CHANGES ⚠️

TASK: ${task.title}

GOAL:
${understanding.high_level_goal}

YOUR JOB: SCAN AND REPORT ONLY
I need you to analyze this repository to help me understand the codebase structure before making changes.

DO NOT:
❌ Make any code changes
❌ Create any files
❌ Modify existing files
❌ Implement any features
❌ Write any code
❌ Suggest final implementation details yet

DO:
✓ Scan the repository structure
✓ Identify relevant files for this task
✓ Report which files would likely need modification
✓ Explain current code architecture
✓ List dependencies and imports
✓ Identify potential risks or conflicts

REPORT FORMAT:

REPOSITORY STRUCTURE
- List key directories relevant to this task
- Identify main entry points

RELEVANT FILES
For each file that would need modification:
- File path
- Current purpose/functionality
- Why it is relevant to this task
- Dependencies (what it imports/uses)

CURRENT ARCHITECTURE
- How is this feature currently organized (if it exists)?
- What patterns are used in this codebase?
- Any framework-specific conventions?

DEPENDENCIES
- What libraries/packages are involved?
- Any version constraints to be aware of?

POTENTIAL RISKS
- What could break if these files are changed later?
- Are there tests covering these areas?
- Any circular dependency or coupling concerns?

MAJOR STEPS TO SCAN FOR:
${(understanding.major_steps ?? []).map((step, i) => `${i + 1}. ${step}`).join("\n")}

KEY CONCEPTS:
${(understanding.key_concepts ?? []).join(", ")}

IMPORTANT: This is ANALYSIS ONLY. After you provide this report, I will use it to plan implementation with another agent. You will receive specific implementation instructions later.

Provide a detailed analysis report using the format above.`;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params.id === "string" ? params.id : null;
  const taskId = typeof params.taskId === "string" ? params.taskId : null;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingUnderstanding, setEditingUnderstanding] = useState(false);
  const [understandingDraft, setUnderstandingDraft] = useState("");
  const [regenNotes, setRegenNotes] = useState("");
  const [selectedClarifications, setSelectedClarifications] = useState<string[]>([]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState<number | null>(null);
  const [cursorRepoAnalysis, setCursorRepoAnalysis] = useState("");
  const [isSavingCursorRepoAnalysis, setIsSavingCursorRepoAnalysis] =
    useState(false);
  const [cursorRepoScan, setCursorRepoScan] = useState("");
  const [activeTab, setActiveTab] = useState<
    "understanding" | "architecture" | "notes" | "learnings" | "work_process" | "issues"
  >("understanding");
  const [isAnalyzingFull, setIsAnalyzingFull] = useState(false);
  const [analyzeFullError, setAnalyzeFullError] = useState<string | null>(null);
  const [analyzeTakingLong, setAnalyzeTakingLong] = useState(false);
  const [workProcessDraft, setWorkProcessDraft] = useState("");
  const [isSavingWorkProcess, setIsSavingWorkProcess] = useState(false);
  const [isSavingIssues, setIsSavingIssues] = useState(false);
  const [newIssueWrong, setNewIssueWrong] = useState("");
  const [newIssueSolved, setNewIssueSolved] = useState("");
  const learningContentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [editingLearning, setEditingLearning] = useState<Learning | null>(null);
  const [learningEditContent, setLearningEditContent] = useState("");
  const [learningEditCategory, setLearningEditCategory] = useState("");
  const [isSavingLearningEdit, setIsSavingLearningEdit] = useState(false);
  const [deleteLearningId, setDeleteLearningId] = useState<string | null>(null);
  const [isDeletingLearning, setIsDeletingLearning] = useState(false);
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
  const [isAnalyzingDraft, setIsAnalyzingDraft] = useState(false);
  const [draftCopyToast, setDraftCopyToast] = useState(false);
  const [learningModalOpen, setLearningModalOpen] = useState(false);
  const [learningDrafts, setLearningDrafts] = useState<
    Array<{ content: string; category: string; attachments: string[] }>
  >([
    { content: "", category: "", attachments: [] },
    { content: "", category: "", attachments: [] },
  ]);
  const [isAddingLearning, setIsAddingLearning] = useState(false);
  const [learningEditAttachments, setLearningEditAttachments] = useState<string[]>([]);
  const [learningDraftImageTargetIndex, setLearningDraftImageTargetIndex] = useState<number | null>(null);
  const learningImageInputRef = useRef<HTMLInputElement>(null);
  const learningEditImageInputRef = useRef<HTMLInputElement>(null);
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
      setUnderstandingDraft(getDisplayUnderstanding(json.data));
      setSelectedClarifications(json.data.requested_clarifications ?? []);
      setNotes(json.data?.task_notes ?? "");
      setCursorRepoAnalysis((prev) =>
        prev.length > 0 && isSavingCursorRepoAnalysis
          ? prev
          : (json.data?.cursor_repo_analysis ?? "")
      );
      setCursorRepoScan(json.data?.cursor_repo_scan ?? "");
      setArchitectureDraft(json.data?.architecture?.detailed_breakdown ?? "");
      setAnalyzeFullError(json.data?.analysis_error ?? null);
    } else {
      setTask(null);
    }
    setLoading(false);
  }, [taskId, isSavingCursorRepoAnalysis]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

  // Single-flow analysis: when task is in "analyzing", run analyze-full once
  useEffect(() => {
    if (!task || task.status !== "analyzing" || !taskId) return;
    let cancelled = false;
    setAnalyzeFullError(null);
    setAnalyzeTakingLong(false);
    setIsAnalyzingFull(true);
    const longTimeoutId = setTimeout(() => {
      if (!cancelled) setAnalyzeTakingLong(true);
    }, 200_000);
    (async () => {
      try {
        const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/analyze-full`, {
          method: "POST",
        });
        if (cancelled) return;
        const json = (await res.json()) as { success?: boolean; data?: Task; error?: string };
        if (json.success && json.data) {
          setTask(json.data);
        } else {
          setAnalyzeFullError(json.error ?? "Analysis failed");
          if (!cancelled) await loadTask();
        }
      } catch (e) {
        if (!cancelled) {
          setAnalyzeFullError(e instanceof Error ? e.message : "Analysis failed");
          await loadTask();
        }
      } finally {
        if (!cancelled) {
          setIsAnalyzingFull(false);
          setAnalyzeTakingLong(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(longTimeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when status is analyzing or taskId changes
  }, [task?.status, taskId]);

  useEffect(() => {
    if (learningModalOpen && learningContentTextareaRef.current) {
      learningContentTextareaRef.current.focus();
    }
  }, [learningModalOpen]);

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

  // Full-page loading when running single-flow analysis
  if (task.status === "analyzing" || isAnalyzingFull) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100 p-8">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
        <p className="text-slate-400 font-medium">Analyzing task</p>
        <p className="text-sm text-slate-500 max-w-md text-center">
          Running analysis: understanding and key concepts. This usually takes 1–3 minutes. Timeout: 5 min.
        </p>
        {analyzeTakingLong && (
          <p className="text-sm text-amber-400 max-w-md text-center">
            This is taking longer than expected. The request may have timed out (5 min). You can go back and try again.
          </p>
        )}
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

  const handleManualUnderstandingSave = async () => {
    await fetch(`/api/tasks/${encodeURIComponent(task.id)}/edit-understanding`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edited_text: understandingDraft, request_regeneration: false }),
    });
    setEditingUnderstanding(false);
    await loadTask();
  };

  const handleRegenerate = async () => {
    await fetch(`/api/tasks/${encodeURIComponent(task.id)}/edit-understanding`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regeneration_notes: regenNotes, request_regeneration: true }),
    });
    setRegenNotes("");
    setEditingUnderstanding(false);
    await loadTask();
  };

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

  const saveCursorAnalysis = async () => {
    if (cursorRepoAnalysis === (task?.cursor_repo_analysis ?? "")) return;
    setIsSavingCursorRepoAnalysis(true);
    try {
      await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursor_repo_analysis: cursorRepoAnalysis }),
      });
      await loadTask();
    } catch (error) {
      console.error("Failed to save Cursor repo analysis:", error);
    } finally {
      setIsSavingCursorRepoAnalysis(false);
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

  /** Start full analysis for a draft task: save current fields, set status to "analyzing"; useEffect will call analyze-full */
  const analyzeDraftTask = async () => {
    if (!task) return;
    setIsAnalyzingDraft(true);
    setAnalyzeFullError(null);
    try {
      await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draftTitle.trim() || task.title,
          raw_input: draftRawInput,
          task_notes: notes,
          cursor_repo_scan: cursorRepoScan,
          status: "analyzing",
        }),
      });
      await loadTask();
    } catch (error) {
      console.error("Failed to start draft analysis:", error);
      alert("Failed to start analysis.");
    } finally {
      setIsAnalyzingDraft(false);
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
    setLearningModalOpen(true);
  };

  const openAddLearningModal = () => {
    setLearningDrafts([
      { content: "", category: "", attachments: [] },
      { content: "", category: "", attachments: [] },
    ]);
    setLearningModalOpen(true);
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
      setLearningModalOpen(false);
      setLearningDrafts([
        { content: "", category: "", attachments: [] },
        { content: "", category: "", attachments: [] },
      ]);
      await loadTask();
      setActiveTab("learnings");
    } catch (error) {
      console.error("Failed to add learning:", error);
      alert("Failed to add learning.");
    } finally {
      setIsAddingLearning(false);
    }
  };

  const saveLearningEdit = async () => {
    if (!task || !editingLearning) return;
    setIsSavingLearningEdit(true);
    try {
      const res = await fetch(
        `/api/tasks/${encodeURIComponent(task.id)}/learnings/${encodeURIComponent(editingLearning.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: learningEditContent.trim(),
            category: learningEditCategory.trim() || undefined,
            attachments: learningEditAttachments,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to update learning");
      setEditingLearning(null);
      setLearningEditContent("");
      setLearningEditCategory("");
      setLearningEditAttachments([]);
      await loadTask();
    } catch (error) {
      console.error("Failed to update learning:", error);
      alert("Failed to update learning.");
    } finally {
      setIsSavingLearningEdit(false);
    }
  };

  const confirmDeleteLearning = async () => {
    if (!task || !deleteLearningId) return;
    setIsDeletingLearning(true);
    try {
      const res = await fetch(
        `/api/tasks/${encodeURIComponent(task.id)}/learnings/${encodeURIComponent(deleteLearningId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete learning");
      setDeleteLearningId(null);
      await loadTask();
    } catch (error) {
      console.error("Failed to delete learning:", error);
      alert("Failed to delete learning.");
    } finally {
      setIsDeletingLearning(false);
    }
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
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{task.title}</h1>
          <p className="text-sm text-slate-400">
            Status: {task.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </p>
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
                  disabled={isSavingDraft || isAnalyzingDraft}
                >
                  {isSavingDraft ? "Saving…" : "Save draft"}
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => void analyzeDraftTask()}
                  disabled={isSavingDraft || isAnalyzingDraft || !draftRawInput.trim()}
                >
                  {isAnalyzingDraft ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Starting…
                    </>
                  ) : (
                    "Analyze Task"
                  )}
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex flex-wrap gap-1 border-b border-slate-700 w-full">
                {(
                  [
                    "understanding",
                    "architecture",
                    "notes",
                    "learnings",
                    "work_process",
                    "issues",
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "border-b-2 border-emerald-500 text-emerald-400 bg-slate-800/50"
                        : "text-slate-400 hover:text-slate-200 border-b-2 border-transparent"
                    }`}
                  >
                    {tab === "work_process" ? "Work process" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {task.status === "draft" && (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => void analyzeDraftTask()}
                    disabled={isAnalyzingDraft || !draftRawInput.trim()}
                  >
                    {isAnalyzingDraft ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Starting…
                      </>
                    ) : (
                      "Analyze Task"
                    )}
                  </Button>
                )}
                {task.status !== "completed" && task.status !== "draft" && (
                  <Button
                    variant="outline"
                    className="border-emerald-600 text-emerald-200 hover:bg-emerald-900/40"
                    onClick={() => setCompleteModalOpen(true)}
                  >
                    ✓ Mark Complete
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
              {activeTab === "understanding" && (
                <div className="space-y-6">
                  {!task.understanding ? (
                    <p className="text-sm text-slate-400">
                      {task.status === "draft"
                        ? "No analysis yet. Use \"Analyze Task\" above to run analysis (understanding + key concepts)."
                        : "Understanding is not available yet."}
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
                </div>
              )}
              {activeTab === "architecture" && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">
                    Edit your architecture plan here. Use &quot;Copy for Claude&quot; in the Understanding tab to generate a minimal plan, then paste or type here. Saved automatically when you leave the field.
                  </p>
                  <Textarea
                    value={architectureDraft}
                    onChange={(e) => setArchitectureDraft(e.target.value)}
                    onBlur={() => void saveArchitecture()}
                    placeholder="Paste or write your architecture plan. You can use “Copy for Claude” in the Understanding tab to get a prompt, then paste Claude’s reply here."
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
              )}
              {activeTab === "notes" && (
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
              {activeTab === "learnings" && (
                <div className="space-y-4">
                  {task.learnings.length === 0 ? (
                    <p className="text-sm text-slate-400">No learnings yet.</p>
                  ) : (
                    task.learnings.map((learning) => (
                      <div
                        key={learning.id}
                        className="border border-slate-700 rounded-md p-4 space-y-2"
                      >
                        <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {learning.content}
                        </p>
                        {(learning.attachments?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {learning.attachments!.map((dataUrl, i) => (
                              /* eslint-disable-next-line @next/next/no-img-element -- data URL from user upload */
                              <img
                                key={i}
                                src={dataUrl}
                                alt=""
                                className="h-16 w-16 rounded border border-slate-600 object-cover"
                              />
                            ))}
                          </div>
                        )}
                        {learning.category && (
                          <p className="text-xs text-slate-400 mt-1">
                            {learning.category}
                          </p>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-100"
                            onClick={() => {
                              setEditingLearning(learning);
                              setLearningEditContent(learning.content);
                              setLearningEditCategory(learning.category ?? "");
                              setLearningEditAttachments(learning.attachments ?? []);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteLearningId(learning.id)}
                            disabled={isDeletingLearning}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-600 text-slate-100"
                    onClick={openAddLearningModal}
                  >
                    + Add learning note
                  </Button>
                </div>
              )}
              {activeTab === "work_process" && (
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
                    className="min-h-[220px] bg-slate-800 border-slate-700 whitespace-pre-wrap"
                    placeholder={DEFAULT_WORK_PROCESS_TEXT}
                  />
                  {isSavingWorkProcess && (
                    <span className="text-xs text-slate-400">Saving...</span>
                  )}
                </div>
              )}
              {activeTab === "issues" && (
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
              )}
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
            alert("Task completed! Learnings saved.");
          } catch (error) {
            console.error("Failed to complete task:", error);
            alert("Failed to save learnings. Please try again.");
          }
        }}
      />
      {learningModalOpen && (
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
                  onClick={() => setLearningModalOpen(false)}
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
      {editingLearning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-[min(92vw,560px)]">
            <h3 className="text-lg font-bold mb-4">Edit learning</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-300">Learning Content</label>
                <Textarea
                  value={learningEditContent}
                  onChange={(e) => setLearningEditContent(e.target.value)}
                  className="mt-1 min-h-[140px] bg-slate-900 border-slate-700 whitespace-pre-wrap"
                  placeholder="Write the key learning..."
                />
              </div>
              <div>
                <label className="text-sm text-slate-300">Category (optional)</label>
                <Input
                  value={learningEditCategory}
                  onChange={(e) => setLearningEditCategory(e.target.value)}
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
                  onClick={() => learningEditImageInputRef.current?.click()}
                >
                  <ImagePlus className="w-4 h-4 mr-1 inline" />
                  Add images
                </Button>
                <input
                  ref={learningEditImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files?.length) return;
                    const urls = await Promise.all(Array.from(files).map(fileToDataUrl));
                    setLearningEditAttachments((prev) => [...prev, ...urls]);
                    e.target.value = "";
                  }}
                />
                {learningEditAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {learningEditAttachments.map((dataUrl, i) => (
                      <div key={i} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element -- data URL from user upload */}
                        <img src={dataUrl} alt="" className="h-14 w-14 rounded object-cover border border-slate-600" />
                        <button
                          type="button"
                          aria-label="Remove"
                          className="absolute -top-0.5 -right-0.5 rounded bg-black/80 text-white w-5 h-5 flex items-center justify-center"
                          onClick={() => setLearningEditAttachments((prev) => prev.filter((_, j) => j !== i))}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-600 text-slate-100"
                  onClick={() => {
                    setEditingLearning(null);
                    setLearningEditContent("");
                    setLearningEditCategory("");
                  }}
                  disabled={isSavingLearningEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void saveLearningEdit()}
                  disabled={isSavingLearningEdit || !learningEditContent.trim()}
                >
                  {isSavingLearningEdit ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteLearningId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-[min(92vw,400px)]">
            <h3 className="text-lg font-bold mb-2">Delete learning?</h3>
            <p className="text-sm text-slate-300 mb-4">
              This learning note will be removed. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-100"
                onClick={() => setDeleteLearningId(null)}
                disabled={isDeletingLearning}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void confirmDeleteLearning()}
                disabled={isDeletingLearning}
              >
                {isDeletingLearning ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showCopyToast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-slide-in">
          <Check className="w-5 h-5" />
          <span>{copyToastMessage}</span>
        </div>
      )}
    </main>
  );
}
