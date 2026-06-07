"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LearningCard } from "@/components/cards/learning-card";
import { LearningModal } from "@/components/modals/learning-modal";
import type { StandaloneLearning } from "@/schemas/learnings";
import type { Project } from "@/schemas/projects";

type Tab = "projects" | "general";

function ExpandableLearningGroup({
  title,
  count,
  defaultOpen = false,
  href,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  href?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
      <div className="flex items-center gap-2 px-2 py-1 sm:px-3 min-h-[3rem]">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 min-w-0 items-center gap-2 px-2 py-2 text-left rounded-md hover:bg-slate-800/60 transition-colors"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" aria-hidden />
          )}
          <FolderOpen className="h-4 w-4 text-slate-500 shrink-0" aria-hidden />
          <span className="font-medium text-slate-100 truncate">{title}</span>
          <span className="text-sm text-slate-500 tabular-nums shrink-0 ml-auto pl-2">{count}</span>
        </button>
        {href ? (
          <Link
            href={href}
            className="text-xs text-emerald-400 hover:underline shrink-0 px-2 py-2"
          >
            Open
          </Link>
        ) : null}
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function LearningsPage() {
  const [items, setItems] = useState<StandaloneLearning[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("projects");
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

  const loadProjects = async () => {
    const res = await fetch("/api/projects");
    const json = (await res.json()) as { success: boolean; data?: Project[] };
    setProjects(json.success && json.data ? json.data : []);
  };

  useEffect(() => {
    void load();
    void loadProjects();
  }, []);

  const matchesSearch = useCallback((l: StandaloneLearning, q: string) => {
    if (!q) return true;
    const ql = q.toLowerCase();
    const src = `${l.source.taskTitle ?? ""} ${l.source.projectName ?? ""}`.toLowerCase();
    return (
      (l.title ?? "").toLowerCase().includes(ql) ||
      l.content.toLowerCase().includes(ql) ||
      (l.category ?? "").toLowerCase().includes(ql) ||
      src.includes(ql)
    );
  }, []);

  /** General tab — flat grid of source.type === "general" learnings */
  const filteredGeneral = useMemo(() => {
    if (tab !== "general") return [];
    const q = search.trim();
    return items
      .filter((l) => l.source.type === "general")
      .filter((l) => !q || matchesSearch(l, q));
  }, [items, search, tab, matchesSearch]);

  /** From Projects tab — task-attached learnings grouped by project */
  const projectGroups = useMemo(() => {
    if (tab !== "projects") return null;
    const q = search.trim();
    return projects
      .map((p) => ({
        project: p,
        learnings: items
          .filter((l) => l.source.projectId === p.id)
          .filter((l) => !q || matchesSearch(l, q)),
      }))
      .sort((a, b) => a.project.name.localeCompare(b.project.name, undefined, { sensitivity: "base" }));
  }, [tab, items, projects, search, matchesSearch]);

  const projectsIsEmpty =
    tab === "projects" &&
    projectGroups != null &&
    projectGroups.every((x) => x.learnings.length === 0);

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
              <Button variant={tab === "projects" ? "default" : "outline"} onClick={() => setTab("projects")}>
                From Projects
              </Button>
              <Button variant={tab === "general" ? "default" : "outline"} onClick={() => setTab("general")}>
                General
              </Button>
            </div>
            {tab === "projects" && (
              <p className="text-xs text-slate-500 pt-1">
                Learnings grouped by project. Click a row to expand.
              </p>
            )}
            {tab === "general" && (
              <p className="text-xs text-slate-500 pt-1">
                Standalone learnings not attached to any project or task.
              </p>
            )}
          </CardContent>
        </Card>

        {tab === "projects" && projectGroups ? (
          projectsIsEmpty ? (
            <Card className="border-slate-800 bg-slate-900/50">
              <CardContent className="p-6 text-slate-400">
                {search.trim() ? "No learnings match your search." : "No project learnings yet."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {projectGroups.map(({ project, learnings }) => (
                <ExpandableLearningGroup
                  key={project.id}
                  title={project.name}
                  count={learnings.length}
                  href={`/projects/${project.id}`}
                >
                  {learnings.length === 0 ? (
                    <p className="text-sm text-slate-500">No learnings linked to this project yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {learnings.map((l) => (
                        <LearningCard key={l.id} learning={l} onOpen={() => openCard(l)} />
                      ))}
                    </div>
                  )}
                </ExpandableLearningGroup>
              ))}
            </div>
          )
        ) : filteredGeneral.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-6 text-slate-400">
              {search.trim() ? "No learnings match your search." : "No general learnings yet."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGeneral.map((l) => (
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
