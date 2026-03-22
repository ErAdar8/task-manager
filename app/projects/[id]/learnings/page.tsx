"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LearningCard } from "@/components/cards/learning-card";
import { LearningModal } from "@/components/modals/learning-modal";
import type { StandaloneLearning } from "@/schemas/learnings";

type LearningsByTask = {
  task_id: string;
  task_title: string;
  completed_at: string | null;
  learnings: Array<{ id: string; content: string; category?: string; title?: string }>;
};

export default function ProjectLearningsPage() {
  const params = useParams();
  const projectId = typeof params.id === "string" ? params.id : null;
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<LearningsByTask[]>([]);
  const [lookup, setLookup] = useState<Record<string, StandaloneLearning>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState<StandaloneLearning | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    const [groupedRes, allRes] = await Promise.all([
      fetch(`/api/projects/${encodeURIComponent(projectId)}/learnings`),
      fetch(`/api/learnings?projectId=${encodeURIComponent(projectId)}`),
    ]);
    const groupedJson = (await groupedRes.json()) as { success: boolean; data?: LearningsByTask[] };
    const allJson = (await allRes.json()) as { success: boolean; data?: StandaloneLearning[] };
    if (groupedJson.success && groupedJson.data) setItems(groupedJson.data);
    const map: Record<string, StandaloneLearning> = {};
    if (allJson.success && allJson.data) {
      for (const l of allJson.data) map[l.id] = l;
    }
    setLookup(map);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.task_title.toLowerCase().includes(q) ||
        item.learnings.some(
          (learning) =>
            learning.content.toLowerCase().includes(q) ||
            (learning.category ?? "").toLowerCase().includes(q) ||
            (learning.title ?? "").toLowerCase().includes(q)
        )
    );
  }, [items, search]);

  const openLearning = (id: string) => {
    const l = lookup[id];
    if (l) {
      setActive(l);
      setModalOpen(true);
    }
  };

  if (!projectId) {
    return <main className="flex-1 flex items-center justify-center text-slate-400">Invalid route</main>;
  }

  return (
    <main className="flex-1 overflow-auto bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="space-y-3">
            <h1 className="text-xl font-semibold">Project Learnings</h1>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search learnings..."
              className="bg-slate-800 border-slate-700"
            />
          </CardHeader>
          <CardContent className="space-y-8">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-400">No learnings yet.</p>
            ) : (
              filtered.map((item) => (
                <div key={item.task_id} className="space-y-3">
                  <h2 className="text-sm font-medium text-slate-300">{item.task_title}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {item.learnings.map((learning) => {
                      const full = lookup[learning.id];
                      if (!full) {
                        return (
                          <div
                            key={learning.id}
                            className="text-xs text-slate-500 border border-slate-800 rounded-lg p-3"
                          >
                            Loading…
                          </div>
                        );
                      }
                      return (
                        <LearningCard
                          key={learning.id}
                          learning={full}
                          onOpen={() => openLearning(learning.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <LearningModal
        open={modalOpen}
        learning={active}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
      />
    </main>
  );
}
