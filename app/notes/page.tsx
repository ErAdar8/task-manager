"use client";

import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GenericNote } from "@/schemas/notes";

type FilterMode = "all" | "tagged" | "recent";

export default function NotesPage() {
  const [notes, setNotes] = useState<GenericNote[]>([]);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [openEditor, setOpenEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<GenericNote | null>(null);
  const [title, setTitle] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const loadNotes = async () => {
    const res = await fetch("/api/notes");
    const json = (await res.json()) as { success: boolean; data?: GenericNote[] };
    setNotes(json.success && json.data ? json.data : []);
  };

  useEffect(() => {
    void loadNotes();
  }, []);

  const filteredNotes = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return notes.filter((note) => {
      if (filterMode === "tagged" && (note.tags?.length ?? 0) === 0) return false;
      if (filterMode === "recent") {
        const updated = new Date(note.updated_at).getTime();
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (updated < weekAgo) return false;
      }
      if (!lower) return true;
      return (
        note.title.toLowerCase().includes(lower) ||
        note.content.toLowerCase().includes(lower) ||
        (note.tags ?? []).join(" ").toLowerCase().includes(lower)
      );
    });
  }, [notes, search, filterMode]);

  const openNew = () => {
    setEditingNote(null);
    setTitle("");
    setTagsText("");
    setContent("");
    setOpenEditor(true);
  };

  const openEdit = (note: GenericNote) => {
    setEditingNote(note);
    setTitle(note.title);
    setTagsText((note.tags ?? []).join(", "));
    setContent(note.content);
    setOpenEditor(true);
  };

  const saveNote = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    try {
      if (editingNote) {
        await fetch(`/api/notes/${encodeURIComponent(editingNote.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content,
            tags,
          }),
        });
      } else {
        await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content,
            tags,
          }),
        });
      }
      setOpenEditor(false);
      await loadNotes();
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    await fetch(`/api/notes/${encodeURIComponent(noteId)}`, { method: "DELETE" });
    await loadNotes();
  };

  return (
    <main className="flex-1 overflow-auto bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">📝 Notes</h1>
          <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700">
            + New Note
          </Button>
        </div>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="pt-6 space-y-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, content, tags..."
              className="bg-slate-800 border-slate-700"
            />
            <div className="flex gap-2">
              <Button
                variant={filterMode === "all" ? "default" : "outline"}
                onClick={() => setFilterMode("all")}
              >
                All
              </Button>
              <Button
                variant={filterMode === "tagged" ? "default" : "outline"}
                onClick={() => setFilterMode("tagged")}
              >
                Tagged
              </Button>
              <Button
                variant={filterMode === "recent" ? "default" : "outline"}
                onClick={() => setFilterMode("recent")}
              >
                Recent
              </Button>
            </div>
          </CardContent>
        </Card>

        {filteredNotes.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-6 text-slate-400">No notes found.</CardContent>
          </Card>
        ) : (
          filteredNotes.map((note) => (
            <Card key={note.id} className="border-slate-800 bg-slate-900/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-medium">{note.title}</h2>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(note)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void deleteNote(note.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  Updated: {new Date(note.updated_at).toLocaleString()}
                </div>
                {(note.tags?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {note.tags.map((tag) => (
                      <span
                        key={`${note.id}-${tag}`}
                        className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: marked.parse(note.content) as string }}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {openEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-[min(96vw,760px)] max-h-[92vh] overflow-auto">
            <h3 className="text-lg font-bold mb-4">
              {editingNote ? "Edit Note" : "New Note"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-300">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 bg-slate-900 border-slate-700"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300">Tags (comma-separated)</label>
                <Input
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  className="mt-1 bg-slate-900 border-slate-700"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300">Content (markdown supported)</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1 min-h-[220px] bg-slate-900 border-slate-700"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenEditor(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void saveNote()} disabled={saving}>
                  {saving ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
