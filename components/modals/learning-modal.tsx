"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageLightboxTrigger } from "@/components/image-lightbox-trigger";
import type { StandaloneLearning } from "@/schemas/learnings";

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
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || focusable.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return panelRef;
}

type ConfirmAction =
  | null
  | "delete"
  | "move_note"
  | "move_task"
  | "make_general";

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
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moveLoading, setMoveLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [taskIdForMove, setTaskIdForMove] = useState("");
  const panelRef = useModalFocusTrap(open, onClose);

  useEffect(() => {
    if (!open || !learning) return;
    setTitle(learning.title ?? "");
    setContent(learning.content);
    setCategory(learning.category ?? "");
    setEditing(false);
    setConfirm(null);
    setTaskIdForMove("");
  }, [open, learning]);

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

  const backdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!open || !learning) return null;

  const src = learning.source;
  const sourceLabel =
    src.type === "task" && src.taskTitle
      ? `📌 ${src.taskTitle}${src.projectName ? ` · ${src.projectName}` : ""}`
      : "🌐 General";

  const html = marked.parse(editing ? content : learning.content) as string;

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
        <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-800 shrink-0">
          <h2 id={titleId} className="text-lg font-semibold text-slate-100 pr-2">
            {learning.title?.trim() || "Learning"}
          </h2>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-200 text-sm shrink-0"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          <p className="text-sm text-slate-400">{sourceLabel}</p>
          {learning.category && !editing && (
            <span className="inline-block text-xs px-2 py-0.5 rounded border border-slate-600 text-slate-300">
              {learning.category}
            </span>
          )}
          <p className="text-xs text-slate-500">
            Updated {new Date(learning.updatedAt).toLocaleString()}
          </p>

          {editing ? (
            <>
              <div>
                <label className="text-xs text-slate-400">Title (optional)</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-600"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Category (optional)</label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-600"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Content (markdown)</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1 min-h-[220px] bg-slate-800 border-slate-600 font-mono text-sm"
                />
              </div>
            </>
          ) : (
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}

          {(learning.attachments?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {learning.attachments!.map((url, i) => (
                <ImageLightboxTrigger
                  key={i}
                  src={url}
                  imgClassName="max-h-40 rounded border border-slate-600 object-contain"
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 p-4 border-t border-slate-800 shrink-0">
          {confirm === "delete" && (
            <p className="text-sm text-amber-200">Delete this learning permanently?</p>
          )}
          {confirm === "move_note" && (
            <p className="text-sm text-amber-200">Convert to a note? This learning will be removed.</p>
          )}
          {confirm === "make_general" && (
            <p className="text-sm text-amber-200">Detach from task and mark as general?</p>
          )}
          {confirm === "move_task" && (
            <div className="space-y-2">
              <p className="text-sm text-amber-200">Attach to a task by ID (must exist).</p>
              <Input
                value={taskIdForMove}
                onChange={(e) => setTaskIdForMove(e.target.value)}
                placeholder="task_..."
                className="bg-slate-800 border-slate-600 font-mono text-sm"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void save()} disabled={saving || !content.trim()}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </>
            ) : confirm ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={
                    moveLoading ||
                    deleting ||
                    (confirm === "move_task" && !taskIdForMove.trim())
                  }
                  onClick={() => {
                    if (confirm === "delete") void remove();
                    else if (confirm === "move_note") void runMove({ target: "note" });
                    else if (confirm === "make_general") void runMove({ target: "general" });
                    else if (confirm === "move_task" && taskIdForMove.trim()) {
                      void runMove({ target: "task", taskId: taskIdForMove.trim() });
                    }
                  }}
                >
                  {deleting || moveLoading ? "…" : "Confirm"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button type="button" variant="outline" className="border-slate-600" onClick={() => setConfirm("move_note")}>
                  Move to Notes
                </Button>
                {src.type === "general" && (
                  <Button type="button" variant="outline" className="border-slate-600" onClick={() => setConfirm("move_task")}>
                    Move to Task
                  </Button>
                )}
                {src.type === "task" && (
                  <Button type="button" variant="outline" className="border-slate-600" onClick={() => setConfirm("make_general")}>
                    Make General
                  </Button>
                )}
                <Button type="button" variant="destructive" onClick={() => setConfirm("delete")}>
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
