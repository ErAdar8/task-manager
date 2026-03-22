"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LearningCard } from "@/components/cards/learning-card";
import { LearningModal } from "@/components/modals/learning-modal";
import type { StandaloneLearning } from "@/schemas/learnings";

type Tab = "all" | "tasks" | "general";

export default function LearningsPage() {
  const [items, setItems] = useState<StandaloneLearning[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [active, setActive] = useState<StandaloneLearning | null>(null);
  const [newContent, setNewContent] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newTaskId, setNewTaskId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/learnings");
    const json = (await res.json()) as { success: boolean; data?: StandaloneLearning[] };
    setItems(json.success && json.data ? json.data : []);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (tab === "tasks") list = list.filter((l) => l.source.type === "task");
    if (tab === "general") list = list.filter((l) => l.source.type === "general");
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((l) => {
      const src = `${l.source.taskTitle ?? ""} ${l.source.projectName ?? ""}`.toLowerCase();
      return (
        (l.title ?? "").toLowerCase().includes(q) ||
        l.content.toLowerCase().includes(q) ||
        (l.category ?? "").toLowerCase().includes(q) ||
        src.includes(q)
      );
    });
  }, [items, search, tab]);

  const openCard = (l: StandaloneLearning) => {
    setActive(l);
    setModalOpen(true);
  };

  const createLearning = async () => {
    if (!newContent.trim()) return;
    setSaving(true);
    try {
      const body =
        newTaskId.trim().length > 0
          ? {
              content: newContent.trim(),
              title: newTitle.trim() || undefined,
              category: newCategory.trim() || undefined,
              source: { type: "task" as const, taskId: newTaskId.trim() },
            }
          : {
              content: newContent.trim(),
              title: newTitle.trim() || undefined,
              category: newCategory.trim() || undefined,
              source: { type: "general" as const },
            };
      await fetch("/api/learnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setCreateOpen(false);
      setNewContent("");
      setNewTitle("");
      setNewCategory("");
      setNewTaskId("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 overflow-auto bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold">💡 Learnings</h1>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-violet-600 hover:bg-violet-700"
          >
            + New Learning
          </Button>
        </div>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="pt-6 space-y-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, content, category, source..."
              className="bg-slate-800 border-slate-700"
            />
            <div className="flex gap-2 flex-wrap">
              <Button variant={tab === "all" ? "default" : "outline"} onClick={() => setTab("all")}>
                All
              </Button>
              <Button variant={tab === "tasks" ? "default" : "outline"} onClick={() => setTab("tasks")}>
                From Tasks
              </Button>
              <Button variant={tab === "general" ? "default" : "outline"} onClick={() => setTab("general")}>
                General
              </Button>
            </div>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-6 text-slate-400">No learnings found.</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((l) => (
              <LearningCard key={l.id} learning={l} onOpen={() => openCard(l)} />
            ))}
          </div>
        )}
      </div>

      <LearningModal
        open={modalOpen}
        learning={active}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
      />

      {createOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreateOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">New learning</h2>
            <p className="text-xs text-slate-500">
              General by default. Optionally set a task ID to attach to a task.
            </p>
            <Input
              placeholder="Title (optional)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="bg-slate-800 border-slate-600"
            />
            <Input
              placeholder="Category (optional)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="bg-slate-800 border-slate-600"
            />
            <textarea
              placeholder="Content *"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full min-h-[120px] rounded-md bg-slate-800 border border-slate-600 p-2 text-sm"
            />
            <Input
              placeholder="Task ID (optional — leave empty for general)"
              value={newTaskId}
              onChange={(e) => setNewTaskId(e.target.value)}
              className="bg-slate-800 border-slate-600 font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void createLearning()} disabled={saving || !newContent.trim()}>
                {saving ? "Saving…" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
