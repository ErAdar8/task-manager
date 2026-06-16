"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, GripVertical, ChevronRight, Pencil, Check, X } from "lucide-react";
import { useRef } from "react";
import type { Course } from "@/schemas/courses";
import type { Topic } from "@/schemas/topics";

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = typeof params.id === "string" ? params.id : null;

  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Inline edit for topic rows
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [topicTitleDraft, setTopicTitleDraft] = useState("");
  const topicEditRef = useRef<HTMLInputElement>(null);

  const loadCourse = useCallback(async () => {
    if (!courseId) return;
    const res = await fetch(`/api/courses/${courseId}`);
    const json = (await res.json()) as { success: boolean; data?: Course };
    if (json.success && json.data) setCourse(json.data);
  }, [courseId]);

  const loadTopics = useCallback(async () => {
    if (!courseId) return;
    const res = await fetch(`/api/topics?courseId=${encodeURIComponent(courseId)}`);
    const json = (await res.json()) as { success: boolean; data?: Topic[] };
    if (json.success && json.data) setTopics(json.data);
  }, [courseId]);

  useEffect(() => {
    void Promise.all([loadCourse(), loadTopics()]).finally(() => setLoading(false));
  }, [loadCourse, loadTopics]);

  useEffect(() => {
    if (editingTopicId) topicEditRef.current?.focus();
  }, [editingTopicId]);

  const saveTopicTitle = async () => {
    if (!editingTopicId || !topicTitleDraft.trim()) return;
    await fetch(`/api/topics/${editingTopicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: topicTitleDraft.trim() }),
    });
    setTopics((prev) =>
      prev.map((t) => t.id === editingTopicId ? { ...t, title: topicTitleDraft.trim() } : t)
    );
    setEditingTopicId(null);
    window.dispatchEvent(new Event("courses-updated"));
  };

  const addTopic = async () => {
    if (!courseId || !newTitle.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
          sort_order: topics.length,
        }),
      });
      setNewTitle("");
      setNewDesc("");
      setShowAdd(false);
      await loadTopics();
      window.dispatchEvent(new Event("courses-updated"));
    } finally {
      setAdding(false);
    }
  };

  const deleteTopic = async (topicId: string) => {
    await fetch(`/api/topics/${topicId}`, { method: "DELETE" });
    setConfirmDelete(null);
    await loadTopics();
    window.dispatchEvent(new Event("courses-updated"));
  };

  const deleteCourse = async () => {
    if (!courseId) return;
    await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
    window.dispatchEvent(new Event("courses-updated"));
    router.push("/courses");
  };

  if (loading) {
    return (
      <main className="flex-1 bg-slate-950 text-slate-100 p-6">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="flex-1 bg-slate-950 text-slate-100 p-6">
        <p className="text-slate-400">Course not found.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/courses"
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to courses
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{course.name}</h1>
            {course.description && (
              <p className="text-slate-400 text-sm mt-1">{course.description}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-red-800 text-red-400 hover:bg-red-950"
            onClick={() => {
              if (confirm("Delete this course and all its topics?")) {
                void deleteCourse();
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-lg font-medium">Topics</h2>
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-700"
              onClick={() => setShowAdd(!showAdd)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add topic
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {showAdd && (
              <div className="rounded-lg border border-violet-800/50 bg-violet-950/20 p-3 space-y-2">
                <Input
                  placeholder="Topic title *"
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
                  <Button
                    size="sm"
                    disabled={adding || !newTitle.trim()}
                    className="bg-violet-600 hover:bg-violet-700"
                    onClick={() => void addTopic()}
                  >
                    {adding ? "Adding..." : "Add"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => setShowAdd(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {topics.length === 0 && !showAdd ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                No topics yet. Add one to start organising this course.
              </p>
            ) : (
              <div className="space-y-1">
                {topics.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/30 px-3 py-2.5 hover:border-violet-600/40 transition-colors group"
                  >
                    <GripVertical className="h-4 w-4 text-slate-600 shrink-0" />

                    {editingTopicId === t.id ? (
                      <div className="flex-1 flex items-center gap-1.5 min-w-0">
                        <input
                          ref={topicEditRef}
                          value={topicTitleDraft}
                          onChange={(e) => setTopicTitleDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveTopicTitle();
                            if (e.key === "Escape") setEditingTopicId(null);
                          }}
                          className="h-7 text-sm bg-slate-800 border border-slate-600 text-slate-100 flex-1 rounded px-2 outline-none focus:border-violet-500"
                        />
                        <Button size="sm" variant="ghost" className="text-green-400 h-7 w-7 p-0 shrink-0" onClick={() => void saveTopicTitle()}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-slate-400 h-7 w-7 p-0 shrink-0" onClick={() => setEditingTopicId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Link
                          href={`/courses/${course.id}/topics/${t.id}`}
                          className="flex-1 min-w-0 flex items-center gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-100 truncate">{t.title}</p>
                            {t.description && (
                              <p className="text-xs text-slate-500 truncate">{t.description}</p>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 shrink-0">
                            {t.total_subtopics} subtopic{t.total_subtopics !== 1 ? "s" : ""}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-600 shrink-0 ml-auto" />
                        </Link>
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300 h-7 w-7 flex items-center justify-center shrink-0"
                          onClick={(e) => { e.preventDefault(); setTopicTitleDraft(t.title); setEditingTopicId(t.id); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}

                    {editingTopicId !== t.id && (
                      confirmDelete === t.id ? (
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="text-red-400 text-xs h-7 px-2"
                            onClick={() => void deleteTopic(t.id)}>
                            Confirm
                          </Button>
                          <Button size="sm" variant="ghost" className="text-slate-400 text-xs h-7 px-2"
                            onClick={() => setConfirmDelete(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost"
                          className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 h-7 w-7 p-0 shrink-0"
                          onClick={() => setConfirmDelete(t.id)}>
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
