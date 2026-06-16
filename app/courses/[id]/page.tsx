"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import type { Course } from "@/schemas/courses";
import type { Subtopic } from "@/schemas/subtopics";

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = typeof params.id === "string" ? params.id : null;

  const [course, setCourse] = useState<Course | null>(null);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadCourse = useCallback(async () => {
    if (!courseId) return;
    const res = await fetch(`/api/courses/${courseId}`);
    const json = (await res.json()) as { success: boolean; data?: Course };
    if (json.success && json.data) setCourse(json.data);
  }, [courseId]);

  const loadSubtopics = useCallback(async () => {
    if (!courseId) return;
    const res = await fetch(`/api/subtopics?courseId=${encodeURIComponent(courseId)}`);
    const json = (await res.json()) as { success: boolean; data?: Subtopic[] };
    if (json.success && json.data) setSubtopics(json.data);
  }, [courseId]);

  useEffect(() => {
    void Promise.all([loadCourse(), loadSubtopics()]).finally(() => setLoading(false));
  }, [loadCourse, loadSubtopics]);

  const addSubtopic = async () => {
    if (!courseId || !newTitle.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/subtopics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
          sort_order: subtopics.length,
        }),
      });
      setNewTitle("");
      setNewDesc("");
      setShowAdd(false);
      await loadSubtopics();
      await loadCourse();
      window.dispatchEvent(new Event("courses-updated"));
    } finally {
      setAdding(false);
    }
  };

  const deleteSubtopic = async (subtopicId: string) => {
    await fetch(`/api/subtopics/${subtopicId}`, { method: "DELETE" });
    setConfirmDelete(null);
    await loadSubtopics();
    await loadCourse();
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
              if (confirm("Delete this course and all its subtopics?")) {
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
            <h2 className="text-lg font-medium">Subtopics</h2>
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-700"
              onClick={() => setShowAdd(!showAdd)}
            >
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
                  <Button
                    size="sm"
                    disabled={adding || !newTitle.trim()}
                    className="bg-violet-600 hover:bg-violet-700"
                    onClick={() => void addSubtopic()}
                  >
                    {adding ? "Adding..." : "Add"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-400"
                    onClick={() => setShowAdd(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {subtopics.length === 0 && !showAdd ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                No subtopics yet. Add one to start capturing knowledge.
              </p>
            ) : (
              <div className="space-y-1">
                {subtopics.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/30 px-3 py-2.5 hover:border-violet-600/40 transition-colors group"
                  >
                    <GripVertical className="h-4 w-4 text-slate-600 shrink-0" />
                    <Link
                      href={`/courses/${course.id}/subtopics/${st.id}`}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-sm font-medium text-slate-100 truncate">{st.title}</p>
                      {st.description && (
                        <p className="text-xs text-slate-500 truncate">{st.description}</p>
                      )}
                    </Link>
                    {confirmDelete === st.id ? (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 text-xs h-7 px-2"
                          onClick={() => void deleteSubtopic(st.id)}
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 text-xs h-7 px-2"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 h-7 w-7 p-0 shrink-0"
                        onClick={() => setConfirmDelete(st.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
