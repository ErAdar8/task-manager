"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NoteCard } from "@/components/cards/note-card";
import { NoteModal } from "@/components/modals/note-modal";
import type { GenericNote } from "@/schemas/notes";

type FilterMode = "all" | "tagged" | "recent";

export default function NotesPage() {
  const [notes, setNotes] = useState<GenericNote[]>([]);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeNote, setActiveNote] = useState<GenericNote | null>(null);

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
    setActiveNote(null);
    setModalOpen(true);
  };

  const openNote = (note: GenericNote) => {
    setActiveNote(note);
    setModalOpen(true);
  };

  return (
    <main className="flex-1 overflow-auto bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
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
            <div className="flex gap-2 flex-wrap">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <NoteCard key={note.id} note={note} onOpen={() => openNote(note)} />
            ))}
          </div>
        )}
      </div>

      <NoteModal
        open={modalOpen}
        initialNote={activeNote}
        onClose={() => setModalOpen(false)}
        onSaved={() => void loadNotes()}
      />
    </main>
  );
}
