"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { LearningCard } from "@/components/cards/learning-card";
import { LearningModal } from "@/components/modals/learning-modal";
import { ArrowLeft, Plus, FileText, Lightbulb, GitBranch, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Subtopic } from "@/schemas/subtopics";
import type { Topic } from "@/schemas/topics";
import type { Course } from "@/schemas/courses";
import type { StandaloneLearning } from "@/schemas/learnings";
import type { CardType } from "@/schemas/subtopics";

const CARD_TYPES: { id: CardType; label: string; Icon: typeof FileText }[] = [
  { id: "note", label: "Note", Icon: FileText },
  { id: "learning", label: "Learning", Icon: Lightbulb },
  { id: "flow", label: "Flow", Icon: GitBranch },
  { id: "image", label: "Image", Icon: ImageIcon },
];

type FilterType = CardType | "all";

export default function SubtopicDetailPage() {
  const params = useParams();
  const courseId = typeof params.id === "string" ? params.id : null;
  const topicId = typeof params.topicId === "string" ? params.topicId : null;
  const subtopicId = typeof params.subtopicId === "string" ? params.subtopicId : null;

  const [course, setCourse] = useState<Course | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subtopic, setSubtopic] = useState<Subtopic | null>(null);
  const [items, setItems] = useState<StandaloneLearning[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<CardType>("note");
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeCard, setActiveCard] = useState<StandaloneLearning | null>(null);

  const loadData = useCallback(async () => {
    if (!courseId || !topicId || !subtopicId) return;
    const [cr, tr, str, lr] = await Promise.all([
      fetch(`/api/courses/${courseId}`),
      fetch(`/api/topics/${topicId}`),
      fetch(`/api/subtopics/${subtopicId}`),
      fetch(`/api/learnings?subtopicId=${encodeURIComponent(subtopicId)}`),
    ]);
    const [cj, tj, stj, lj] = await Promise.all([
      cr.json() as Promise<{ success: boolean; data?: Course }>,
      tr.json() as Promise<{ success: boolean; data?: Topic }>,
      str.json() as Promise<{ success: boolean; data?: Subtopic }>,
      lr.json() as Promise<{ success: boolean; data?: StandaloneLearning[] }>,
    ]);
    if (cj.success && cj.data) setCourse(cj.data);
    if (tj.success && tj.data) setTopic(tj.data);
    if (stj.success && stj.data) setSubtopic(stj.data);
    if (lj.success && lj.data) setItems(lj.data);
    setLoading(false);
  }, [courseId, topicId, subtopicId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const filtered = filter === "all" ? items : items.filter((l) => l.cardType === filter);

  const createCard = async () => {
    if (!subtopicId || !courseId || !topicId || !createContent.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/learnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: createContent.trim(),
          title: createTitle.trim() || undefined,
          category: createCategory.trim() || undefined,
          cardType: createType,
          source: {
            type: "subtopic",
            topicId,
            topicTitle: topic?.title ?? "",
            subtopicId,
            subtopicTitle: subtopic?.title ?? "",
            courseId,
            courseName: course?.name ?? "",
          },
        }),
      });
      setCreateTitle("");
      setCreateContent("");
      setCreateCategory("");
      setShowCreate(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 bg-slate-950 text-slate-100 p-6">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  if (!subtopic || !topic || !course) {
    return (
      <main className="flex-1 bg-slate-950 text-slate-100 p-6">
        <p className="text-slate-400">Subtopic not found.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
          <Link href="/courses" className="hover:text-slate-200">Courses</Link>
          <span>/</span>
          <Link href={`/courses/${course.id}`} className="hover:text-slate-200">{course.name}</Link>
          <span>/</span>
          <Link href={`/courses/${course.id}/topics/${topic.id}`} className="hover:text-slate-200">{topic.title}</Link>
        </div>

        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Link href={`/courses/${course.id}/topics/${topic.id}`} className="text-slate-400 hover:text-slate-200">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            {subtopic.title}
          </h1>
          {subtopic.description && (
            <p className="text-slate-400 text-sm mt-1 pl-7">{subtopic.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            <Button size="sm" variant={filter === "all" ? "default" : "outline"}
              className={filter !== "all" ? "border-slate-600 text-slate-300" : ""}
              onClick={() => setFilter("all")}>
              All ({items.length})
            </Button>
            {CARD_TYPES.map((ct) => {
              const count = items.filter((l) => l.cardType === ct.id).length;
              return (
                <Button key={ct.id} size="sm"
                  variant={filter === ct.id ? "default" : "outline"}
                  className={filter !== ct.id ? "border-slate-600 text-slate-300" : ""}
                  onClick={() => setFilter(ct.id)}>
                  <ct.Icon className="h-3.5 w-3.5 mr-1" />
                  {ct.label} ({count})
                </Button>
              );
            })}
          </div>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4 mr-1" />
            Add card
          </Button>
        </div>

        {showCreate && (
          <Card className="border-violet-800/50 bg-violet-950/20">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium text-violet-200">New card</p>
              <div className="flex gap-1.5 flex-wrap">
                {CARD_TYPES.map((ct) => (
                  <button key={ct.id} type="button"
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors",
                      createType === ct.id
                        ? "border-violet-500 bg-violet-600/30 text-violet-100"
                        : "border-slate-700 text-slate-400 hover:border-slate-500"
                    )}
                    onClick={() => setCreateType(ct.id)}>
                    <ct.Icon className="h-3.5 w-3.5" />
                    {ct.label}
                  </button>
                ))}
              </div>
              <Input placeholder="Title (optional)" value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="bg-slate-800 border-slate-600 text-slate-100" />
              <Textarea
                placeholder={createType === "flow" ? "Describe the workflow steps..." : "Write your content here..."}
                value={createContent}
                onChange={(e) => setCreateContent(e.target.value)}
                className="min-h-[120px] bg-slate-800 border-slate-600 text-slate-100" />
              <Input placeholder="Category / tag (optional)" value={createCategory}
                onChange={(e) => setCreateCategory(e.target.value)}
                className="bg-slate-800 border-slate-600 text-slate-100" />
              <div className="flex gap-2">
                <Button size="sm" disabled={saving || !createContent.trim()} className="bg-violet-600 hover:bg-violet-700"
                  onClick={() => void createCard()}>
                  {saving ? "Saving..." : "Create"}
                </Button>
                <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {filtered.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-8 text-center text-slate-400">
              {items.length === 0
                ? "No cards yet. Add your first note, learning, flow, or image."
                : "No cards match this filter."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((l) => (
              <LearningCard key={l.id} learning={l} onOpen={() => { setActiveCard(l); setModalOpen(true); }} />
            ))}
          </div>
        )}
      </div>

      <LearningModal open={modalOpen} learning={activeCard}
        onClose={() => setModalOpen(false)}
        onSaved={() => void loadData()} />
    </main>
  );
}
