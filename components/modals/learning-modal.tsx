"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { marked } from "marked";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageLightboxTrigger } from "@/components/image-lightbox-trigger";
import type { StandaloneLearning, CardType } from "@/schemas/learnings";
import type { Topic } from "@/schemas/topics";
import type { Subtopic } from "@/schemas/subtopics";
import { cn } from "@/lib/utils/cn";

function useModalFocusTrap(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab" || focusable.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return panelRef;
}

type ConfirmAction = null | "delete" | "move_note" | "move_task" | "make_general" | "move_subtopic";

type SubtopicOption = { subtopicId: string; subtopicTitle: string; topicId: string; topicTitle: string };

export function LearningModal({
  open,
  learning,
  onClose,
  onSaved,
}: {
  open: boolean;
  learning: StandaloneLearning | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const titleId = useId();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [cardType, setCardType] = useState<CardType>("note");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moveLoading, setMoveLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [taskIdForMove, setTaskIdForMove] = useState("");

  // Move-to-subtopic state
  const [subtopicOptions, setSubtopicOptions] = useState<SubtopicOption[]>([]);
  const [selectedSubtopicId, setSelectedSubtopicId] = useState("");
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);

  const panelRef = useModalFocusTrap(open, onClose);

  useEffect(() => {
    if (!open || !learning) return;
    setTitle(learning.title ?? "");
    setContent(learning.content);
    setCategory(learning.category ?? "");
    setCardType(learning.cardType ?? "note");
    setEditing(false);
    setConfirm(null);
    setTaskIdForMove("");
    setSelectedSubtopicId("");
    setSubtopicOptions([]);
  }, [open, learning]);

  // Load subtopics when "Move to…" is selected
  useEffect(() => {
    if (confirm !== "move_subtopic" || !learning?.source.courseId) return;
    setLoadingSubtopics(true);
    const courseId = learning.source.courseId;
    void (async () => {
      const [topicsRes, subtopicsRes] = await Promise.all([
        fetch(`/api/topics?courseId=${encodeURIComponent(courseId)}`),
        fetch(`/api/subtopics?courseId=${encodeURIComponent(courseId)}`),
      ]);
      const topicsJson = (await topicsRes.json()) as { success: boolean; data?: Topic[] };
      const subtopicsJson = (await subtopicsRes.json()) as { success: boolean; data?: Subtopic[] };
      const topics = topicsJson.data ?? [];
      const subtopics = subtopicsJson.data ?? [];

      const topicMap = new Map(topics.map((t) => [t.id, t.title]));
      const options: SubtopicOption[] = subtopics
        .filter((s) => s.id !== learning.source.subtopicId)
        .map((s) => ({
          subtopicId: s.id,
          subtopicTitle: s.title,
          topicId: s.topic_id ?? "",
          topicTitle: topicMap.get(s.topic_id ?? "") ?? "Unknown Topic",
        }));
      setSubtopicOptions(options);
      setSelectedSubtopicId(options[0]?.subtopicId ?? "");
      setLoadingSubtopics(false);
    })();
  }, [confirm, learning]);

  const save = async () => {
    if (!learning || !content.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/learnings/${encodeURIComponent(learning.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          content: content.trim(),
          category: category.trim() || undefined,
          cardType,
        }),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!learning) return;
    setDeleting(true);
    try {
      await fetch(`/api/learnings/${encodeURIComponent(learning.id)}`, { method: "DELETE" });
      onSaved();
      onClose();
    } finally {
      setDeleting(false);
      setConfirm(null);
    }
  };

  const runMove = async (body: Record<string, unknown>) => {
    if (!learning) return;
    setMoveLoading(true);
    try {
      const res = await fetch(`/api/learnings/${encodeURIComponent(learning.id)}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Move failed");
      }
      onSaved();
      onClose();
    } finally {
      setMoveLoading(false);
      setConfirm(null);
    }
  };

  const moveToSubtopic = async () => {
    if (!learning || !selectedSubtopicId) return;
    const target = subtopicOptions.find((o) => o.subtopicId === selectedSubtopicId);
    if (!target) return;
    setMoveLoading(true);
    try {
      await fetch(`/api/learnings/${encodeURIComponent(learning.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: {
            ...learning.source,
            topicId: target.topicId,
            topicTitle: target.topicTitle,
            subtopicId: target.subtopicId,
            subtopicTitle: target.subtopicTitle,
          },
        }),
      });
      onSaved();
      onClose();
    } finally {
      setMoveLoading(false);
      setConfirm(null);
    }
  };

  const backdropClick = useCallback(
    (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); },
    [onClose]
  );

  if (!open || !learning) return null;

  const src = learning.source;
  const isLearningMode = src.type === "subtopic";
  const isFile = learning.cardType === "file";
  const fileUrl = isFile ? (learning.attachments?.[0] ?? null) : null;

  const sourceLabel =
    src.type === "subtopic" && src.subtopicTitle
      ? `📖 ${src.subtopicTitle}${src.topicTitle ? ` / ${src.topicTitle}` : ""}${src.courseName ? ` · ${src.courseName}` : ""}`
      : src.type === "task" && src.taskTitle
      ? `📌 ${src.taskTitle}${src.projectName ? ` · ${src.projectName}` : ""}`
      : "🌐 General";

  const CARD_TYPES: { value: CardType; label: string }[] = [
    { value: "note", label: "Note" },
    { value: "learning", label: "Learning" },
    { value: "flow", label: "Flow" },
    { value: "image", label: "Image" },
  ];

  const html = (!isFile && marked.parse(editing ? content : learning.content)) as string;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onMouseDown={backdropClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-800 shrink-0">
          <h2 id={titleId} className="text-lg font-semibold text-slate-100 pr-2">
            {learning.title?.trim() || "Learning"}
          </h2>
          <button type="button" className="text-slate-400 hover:text-slate-200 text-sm shrink-0" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          <p className="text-sm text-slate-400">{sourceLabel}</p>
          {learning.category && !editing && (
            <span className="inline-block text-xs px-2 py-0.5 rounded border border-slate-600 text-slate-300">
              {learning.category}
            </span>
          )}
          <p className="text-xs text-slate-500">Updated {new Date(learning.updatedAt).toLocaleString()}</p>

          {/* File view */}
          {isFile && !editing && fileUrl && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-3">
              <p className="text-sm text-slate-300">{learning.content}</p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 font-medium"
              >
                <ExternalLink className="h-4 w-4" />
                Open file
              </a>
            </div>
          )}

          {/* Edit form */}
          {editing ? (
            <>
              <div>
                <label className="text-xs text-slate-400">Title (optional)</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 bg-slate-800 border-slate-600" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Category (optional)</label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 bg-slate-800 border-slate-600" />
              </div>
              {!isFile && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Card type</label>
                    <div className="flex gap-1">
                      {CARD_TYPES.map((ct) => (
                        <button key={ct.value} type="button" onClick={() => setCardType(ct.value)}
                          className={cn(
                            "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                            cardType === ct.value ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"
                          )}>
                          {ct.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Content (markdown)</label>
                    <Textarea value={content} onChange={(e) => setContent(e.target.value)}
                      className="mt-1 min-h-[220px] bg-slate-800 border-slate-600 font-mono text-sm" />
                  </div>
                </>
              )}
            </>
          ) : (
            !isFile && (
              <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
            )
          )}

          {/* Image attachments (non-file cards) */}
          {!isFile && (learning.attachments?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {learning.attachments!.map((url, i) => (
                <ImageLightboxTrigger key={i} src={url} imgClassName="max-h-40 rounded border border-slate-600 object-contain" />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 p-4 border-t border-slate-800 shrink-0">
          {confirm === "delete" && <p className="text-sm text-amber-200">Delete this card permanently?</p>}
          {confirm === "move_note" && <p className="text-sm text-amber-200">Convert to a note? This learning will be removed.</p>}
          {confirm === "make_general" && <p className="text-sm text-amber-200">Detach from task and mark as general?</p>}
          {confirm === "move_task" && (
            <div className="space-y-2">
              <p className="text-sm text-amber-200">Attach to a task by ID (must exist).</p>
              <Input value={taskIdForMove} onChange={(e) => setTaskIdForMove(e.target.value)}
                placeholder="task_..." className="bg-slate-800 border-slate-600 font-mono text-sm" />
            </div>
          )}
          {confirm === "move_subtopic" && (
            <div className="space-y-2">
              <p className="text-sm text-amber-200">Move to a different subtopic:</p>
              {loadingSubtopics ? (
                <p className="text-xs text-slate-400">Loading subtopics…</p>
              ) : subtopicOptions.length === 0 ? (
                <p className="text-xs text-slate-400">No other subtopics in this course.</p>
              ) : (
                <select
                  value={selectedSubtopicId}
                  onChange={(e) => setSelectedSubtopicId(e.target.value)}
                  className="w-full rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm px-2 py-1.5"
                >
                  {subtopicOptions.map((o) => (
                    <option key={o.subtopicId} value={o.subtopicId}>
                      {o.topicTitle} / {o.subtopicTitle}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button type="button" onClick={() => void save()} disabled={saving || (!isFile && !content.trim())}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </>
            ) : confirm ? (
              <>
                <Button type="button" variant="destructive"
                  disabled={
                    moveLoading || deleting || loadingSubtopics ||
                    (confirm === "move_task" && !taskIdForMove.trim()) ||
                    (confirm === "move_subtopic" && !selectedSubtopicId)
                  }
                  onClick={() => {
                    if (confirm === "delete") void remove();
                    else if (confirm === "move_note") void runMove({ target: "note" });
                    else if (confirm === "make_general") void runMove({ target: "general" });
                    else if (confirm === "move_task" && taskIdForMove.trim()) void runMove({ target: "task", taskId: taskIdForMove.trim() });
                    else if (confirm === "move_subtopic") void moveToSubtopic();
                  }}>
                  {deleting || moveLoading ? "…" : "Confirm"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
              </>
            ) : (
              <>
                <Button type="button" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
                {isLearningMode && (
                  <Button type="button" variant="outline" className="border-slate-600"
                    onClick={() => setConfirm("move_subtopic")}>
                    Move to…
                  </Button>
                )}
                {!isLearningMode && (
                  <Button type="button" variant="outline" className="border-slate-600" onClick={() => setConfirm("move_note")}>
                    Move to Notes
                  </Button>
                )}
                {!isLearningMode && src.type === "general" && (
                  <Button type="button" variant="outline" className="border-slate-600" onClick={() => setConfirm("move_task")}>
                    Move to Task
                  </Button>
                )}
                {!isLearningMode && src.type === "task" && (
                  <Button type="button" variant="outline" className="border-slate-600" onClick={() => setConfirm("make_general")}>
                    Make General
                  </Button>
                )}
                <Button type="button" variant="destructive" onClick={() => setConfirm("delete")}>Delete</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
