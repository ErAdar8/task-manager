"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GenericNote } from "@/schemas/notes";

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

export function NoteModal({
  open,
  initialNote,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialNote: GenericNote | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const titleId = useId();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moveLoading, setMoveLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const panelRef = useModalFocusTrap(open, onClose);

  useEffect(() => {
    if (!open) return;
    if (initialNote) {
      setTitle(initialNote.title);
      setContent(initialNote.content);
      setTagsText((initialNote.tags ?? []).join(", "));
      setEditing(false);
    } else {
      setTitle("");
      setContent("");
      setTagsText("");
      setEditing(true);
    }
    setConfirmDelete(false);
  }, [open, initialNote]);

  const save = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const tags = tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (initialNote) {
        await fetch(`/api/notes/${encodeURIComponent(initialNote.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), content, tags }),
        });
      } else {
        await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), content, tags }),
        });
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!initialNote) return;
    setDeleting(true);
    try {
      await fetch(`/api/notes/${encodeURIComponent(initialNote.id)}`, { method: "DELETE" });
      onSaved();
      onClose();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const moveToLearnings = async () => {
    if (!initialNote) return;
    setMoveLoading(true);
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(initialNote.id)}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "learning" }),
      });
      if (!res.ok) throw new Error("Move failed");
      onSaved();
      onClose();
    } finally {
      setMoveLoading(false);
    }
  };

  const backdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!open) return null;

  const html = marked.parse(content) as string;

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
            {initialNote ? (editing ? "Edit note" : initialNote.title) : "New note"}
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
          {editing || !initialNote ? (
            <>
              <div>
                <label className="text-xs text-slate-400">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-600"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Tags (comma-separated)</label>
                <Input
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-600"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Content (markdown)</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1 min-h-[240px] bg-slate-800 border-slate-600 font-mono text-sm"
                />
              </div>
            </>
          ) : (
            <>
              {(initialNote.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1">
                  {initialNote.tags!.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-600"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500">
                Updated {new Date(initialNote.updated_at).toLocaleString()}
              </p>
              <div
                className="prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2 p-4 border-t border-slate-800 shrink-0">
          {initialNote && !editing && (
            <>
              <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-violet-600 text-violet-200"
                onClick={() => void moveToLearnings()}
                disabled={moveLoading}
              >
                {moveLoading ? "Moving…" : "Move to Learnings"}
              </Button>
              {!confirmDelete ? (
                <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              ) : (
                <>
                  <span className="text-sm text-slate-400 self-center">Delete this note?</span>
                  <Button type="button" variant="destructive" onClick={() => void remove()} disabled={deleting}>
                    {deleting ? "Deleting…" : "Confirm delete"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </>
              )}
            </>
          )}
          {(editing || !initialNote) && (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void save()} disabled={saving || !title.trim() || !content.trim()}>
                {saving ? "Saving…" : initialNote ? "Save" : "Create"}
              </Button>
            </>
          )}
          {initialNote && editing && (
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Done editing
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
