"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, GripVertical, Pencil, Check, X } from "lucide-react";
import type { Course } from "@/schemas/courses";
import type { Topic } from "@/schemas/topics";
import type { Subtopic } from "@/schemas/subtopics";

export default function TopicDetailPage() {
  const params = useParams();
  const courseId = typeof params.id === "string" ? params.id : null;
  const topicId = typeof params.topicId === "string" ? params.topicId : null;

  const [course, setCourse] = useState<Course | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Inline edit for topic title (h1)
  const [editingTopicTitle, setEditingTopicTitle] = useState(false);
  const [topicTitleDraft, setTopicTitleDraft] = useState("");
  const topicTitleRef = useRef<HTMLInputElement>(null);

  // Inline edit for subtopic rows
  const [editingSubtopicId, setEditingSubtopicId] = useState<string | null>(null);
  const [subtopicTitleDraft, setSubtopicTitleDraft] = useState("");
  const subtopicInputRef = useRef<HTMLInputElement>(null);

  const loadAll = useCallback(async () => {
    if (!courseId || !topicId) return;
    const [cr, tr, sr] = await Promise.all([
      fetch(`/api/courses/${courseId}`),
      fetch(`/api/topics/${topicId}`),
      fetch(`/api/subtopics?topicId=${encodeURIComponent(topicId)}`),
    ]);
    const [cj, tj, sj] = await Promise.all([
      cr.json() as Promise<{ success: boolean; data?: Course }>,
      tr.json() as Promise<{ success: boolean; data?: Topic }>,
      sr.json() as Promise<{ success: boolean; data?: Subtopic[] }>,
    ]);
    if (cj.success && cj.data) setCourse(cj.data);
    if (tj.success && tj.data) setTopic(tj.data);
    if (sj.success && sj.data) setSubtopics(sj.data);
  }, [courseId, topicId]);

  useEffect(() => {
    void loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  useEffect(() => {
    if (editingTopicTitle) topicTitleRef.current?.focus();
  }, [editingTopicTitle]);

  useEffect(() => {
    if (editingSubtopicId) subtopicInputRef.current?.focus();
  }, [editingSubtopicId]);

  const saveTopicTitle = async () => {
    if (!topicId || !topicTitleDraft.trim() || !topic) return;
    await fetch(`/api/topics/${topicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: topicTitleDraft.trim() }),
    });
    setTopic({ ...topic, title: topicTitleDraft.trim() });
    setEditingTopicTitle(false);
    window.dispatchEvent(new Event("courses-updated"));
  };

  const saveSubtopicTitle = async () => {
    if (!editingSubtopicId || !subtopicTitleDraft.trim()) return;
    await fetch(`/api/subtopics/${editingSubtopicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: subtopicTitleDraft.trim() }),
    });
    setSubtopics((prev) =>
      prev.map((s) =>
        s.id === editingSubtopicId ? { ...s, title: subtopicTitleDraft.trim() } : s
      )
    );
    setEditingSubtopicId(null);
    window.dispatchEvent(new Event("courses-updated"));
  };

  const addSubtopic = async () => {
    if (!courseId || !topicId || !newTitle.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/subtopics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          topic_id: topicId,
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
          sort_order: subtopics.length,
        }),
      });
      setNewTitle("");
      setNewDesc("");
      setShowAdd(false);
      await loadAll();
      window.dispatchEvent(new Event("courses-updated"));
    } finally {
      setAdding(false);
    }
  };

  const deleteSubtopic = async (subtopicId: string) => {
    await fetch(`/api/subtopics/${subtopicId}`, { method: "DELETE" });
    setConfirmDelete(null);
    await loadAll();
    window.dispatchEvent(new Event("courses-updated"));
  };

  if (loading) {
    return (
      <main className="flex-1 bg-slate-950 text-slate-100 p-6">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  if (!course || !topic) {
    return (
      <main className="flex-1 bg-slate-950 text-slate-100 p-6">
        <p className="text-slate-400">Topic not found.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/courses" className="hover:text-slate-200">Courses</Link>
          <span>/</span>
          <Link href={`/courses/${course.id}`} className="hover:text-slate-200">{course.name}</Link>
        </div>

        {/* Topic title with inline edit */}
        <div>
          {editingTopicTitle ? (
            <div className="flex items-center gap-2">
              <Input
                ref={topicTitleRef}
                value={topicTitleDraft}
                onChange={(e) => setTopicTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveTopicTitle();
                  if (e.key === "Escape") setEditingTopicTitle(false);
                }}
                className="text-xl font-semibold bg-slate-800 border-slate-600 text-slate-100 h-10 max-w-md"
              />
              <Button size="sm" variant="ghost" className="text-green-400 h-8 w-8 p-0" onClick={() => void saveTopicTitle()}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-slate-400 h-8 w-8 p-0" onClick={() => setEditingTopicTitle(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h1 className="text-2xl font-semibold flex items-center gap-2 group">
              <Link href={`/courses/${course.id}`} className="text-slate-400 hover:text-slate-200">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              {topic.title}
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300"
                onClick={() => { setTopicTitleDraft(topic.title); setEditingTopicTitle(true); }}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </h1>
          )}
          {topic.description && !editingTopicTitle && (
            <p className="text-slate-400 text-sm mt-1 pl-7">{topic.description}</p>
          )}
        </div>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-lg font-medium">Subtopics</h2>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-4 w-4 mr-1" />
              Add subtopic
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {showAdd && (
              <div className="rounded-lg border border-violet-800/50 bg-violet-950/20 p-3 space-y-2">
                <Input
                  placeholder="Subtopic title *"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-slate-100"
                />
                <Input
                  placeholder="Description (optional)"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-slate-100"
                />
                <div className="flex gap-2">
                  <Button size="sm" disabled={adding || !newTitle.trim()} className="bg-violet-600 hover:bg-violet-700"
                    onClick={() => void addSubtopic()}>
                    {adding ? "Adding..." : "Add"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => setShowAdd(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {subtopics.length === 0 && !showAdd ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                No subtopics yet. Add one to start capturing notes and learnings.
              </p>
            ) : (
              <div className="space-y-1">
                {subtopics.map((st) => (
                  <div key={st.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/30 px-3 py-2.5 hover:border-violet-600/40 transition-colors group">
                    <GripVertical className="h-4 w-4 text-slate-600 shrink-0" />

                    {editingSubtopicId === st.id ? (
                      <div className="flex-1 flex items-center gap-1.5 min-w-0">
                        <Input
                          ref={subtopicInputRef}
                          value={subtopicTitleDraft}
                          onChange={(e) => setSubtopicTitleDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveSubtopicTitle();
                            if (e.key === "Escape") setEditingSubtopicId(null);
                          }}
                          className="h-7 text-sm bg-slate-800 border-slate-600 text-slate-100 flex-1"
                        />
                        <Button size="sm" variant="ghost" className="text-green-400 h-7 w-7 p-0 shrink-0" onClick={() => void saveSubtopicTitle()}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-slate-400 h-7 w-7 p-0 shrink-0" onClick={() => setEditingSubtopicId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Link
                          href={`/courses/${course.id}/topics/${topic.id}/subtopics/${st.id}`}
                          className="flex-1 min-w-0"
                        >
                          <p className="text-sm font-medium text-slate-100 truncate">{st.title}</p>
                          {st.description && (
                            <p className="text-xs text-slate-500 truncate">{st.description}</p>
                          )}
                        </Link>
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300 h-7 w-7 p-0 flex items-center justify-center shrink-0"
                          onClick={(e) => { e.preventDefault(); setSubtopicTitleDraft(st.title); setEditingSubtopicId(st.id); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}

                    {editingSubtopicId !== st.id && (
                      confirmDelete === st.id ? (
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="text-red-400 text-xs h-7 px-2"
                            onClick={() => void deleteSubtopic(st.id)}>Confirm</Button>
                          <Button size="sm" variant="ghost" className="text-slate-400 text-xs h-7 px-2"
                            onClick={() => setConfirmDelete(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost"
                          className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 h-7 w-7 p-0 shrink-0"
                          onClick={() => setConfirmDelete(st.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
