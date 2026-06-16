"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { LearningCard } from "@/components/cards/learning-card";
import { LearningModal } from "@/components/modals/learning-modal";
import { ArrowLeft, Plus, FileText, Lightbulb, GitBranch, ImageIcon, Upload, Pencil, Check, X } from "lucide-react";
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

  // Inline subtopic title edit
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Create card state
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<CardType>("note");
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [saving, setSaving] = useState(false);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Modal state
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

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  const filtered = filter === "all" ? items : items.filter((l) => l.cardType === filter);

  const saveTitle = async () => {
    if (!subtopicId || !titleDraft.trim() || !subtopic) return;
    await fetch(`/api/subtopics/${subtopicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleDraft.trim() }),
    });
    setSubtopic({ ...subtopic, title: titleDraft.trim() });
    setEditingTitle(false);
    window.dispatchEvent(new Event("courses-updated"));
  };

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
      setCreateTitle(""); setCreateContent(""); setCreateCategory("");
      setShowCreate(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!subtopicId || !courseId || !topicId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { success: boolean; data?: { url: string; name: string; size: number; type: string } };
      if (!json.success || !json.data) return;

      const { url, name, size } = json.data;
      const ext = name.includes(".") ? name.split(".").pop()?.toUpperCase() : "FILE";
      await fetch("/api/learnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `${ext} · ${formatBytes(size)}`,
          title: name,
          cardType: "file",
          attachments: [url],
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
      await loadData();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  const allTypes: (FilterType)[] = ["all", ...CARD_TYPES.map((c) => c.id), "file"];

  return (
    <main className="flex-1 overflow-auto bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
          <Link href="/courses" className="hover:text-slate-200">Courses</Link>
          <span>/</span>
          <Link href={`/courses/${course.id}`} className="hover:text-slate-200">{course.name}</Link>
          <span>/</span>
          <Link href={`/courses/${course.id}/topics/${topic.id}`} className="hover:text-slate-200">{topic.title}</Link>
        </div>

        {/* Title with inline edit */}
        <div>
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                className="text-xl font-semibold bg-slate-800 border-slate-600 text-slate-100 h-10 max-w-md"
              />
              <Button size="sm" variant="ghost" className="text-green-400 h-8 w-8 p-0" onClick={() => void saveTitle()}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-slate-400 h-8 w-8 p-0" onClick={() => setEditingTitle(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h1 className="text-2xl font-semibold flex items-center gap-2 group">
              <Link href={`/courses/${course.id}/topics/${topic.id}`} className="text-slate-400 hover:text-slate-200">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              {subtopic.title}
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300"
                onClick={() => { setTitleDraft(subtopic.title); setEditingTitle(true); }}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </h1>
          )}
          {subtopic.description && !editingTitle && (
            <p className="text-slate-400 text-sm mt-1 pl-7">{subtopic.description}</p>
          )}
        </div>

        {/* Filter bar + action buttons */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {allTypes.map((ft) => {
              const count = ft === "all" ? items.length : items.filter((l) => l.cardType === ft).length;
              const label = ft === "all" ? "All" : ft === "file" ? "Files" :
                CARD_TYPES.find((c) => c.id === ft)?.label ?? ft;
              return (
                <Button key={ft} size="sm"
                  variant={filter === ft ? "default" : "outline"}
                  className={filter !== ft ? "border-slate-600 text-slate-300" : ""}
                  onClick={() => setFilter(ft as FilterType)}>
                  {label} ({count})
                </Button>
              );
            })}
          </div>
          <div className="flex gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.csv,.md,.png,.jpg,.jpeg,.gif,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
              }}
            />
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" />
              {uploading ? "Uploading…" : "Upload file"}
            </Button>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="h-4 w-4 mr-1" />
              Add card
            </Button>
          </div>
        </div>

        {/* Create card form */}
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
                value={createContent} onChange={(e) => setCreateContent(e.target.value)}
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

        {/* Card grid */}
        {filtered.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-8 text-center text-slate-400">
              {items.length === 0
                ? "No cards yet. Add a note, learning, flow, or upload a file."
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

      <LearningModal
        open={modalOpen}
        learning={activeCard}
        onClose={() => setModalOpen(false)}
        onSaved={() => void loadData()}
      />
    </main>
  );
}
