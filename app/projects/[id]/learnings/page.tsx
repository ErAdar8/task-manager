"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type LearningsByTask = {
  task_id: string;
  task_title: string;
  completed_at: string | null;
  learnings: Array<{ id: string; content: string; category?: string }>;
};

export default function ProjectLearningsPage() {
  const params = useParams();
  const projectId = typeof params.id === "string" ? params.id : null;
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<LearningsByTask[]>([]);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${encodeURIComponent(projectId)}/learnings`)
      .then((res) => res.json())
      .then((json: { success: boolean; data?: LearningsByTask[] }) => {
        if (json.success && json.data) setItems(json.data);
      });
  }, [projectId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.task_title.toLowerCase().includes(q) ||
        item.learnings.some(
          (learning) =>
            learning.content.toLowerCase().includes(q) ||
            (learning.category ?? "").toLowerCase().includes(q)
        )
    );
  }, [items, search]);

  if (!projectId) {
    return <main className="flex-1 flex items-center justify-center text-slate-400">Invalid route</main>;
  }

  return (
    <main className="flex-1 overflow-auto bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
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
          <CardContent className="space-y-4">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-400">No learnings yet.</p>
            ) : (
              filtered.map((item) => (
                <div key={item.task_id} className="border border-slate-700 rounded-md p-3 space-y-2">
                  <h2 className="font-medium">{item.task_title}</h2>
                  {item.learnings.map((learning) => (
                    <div key={learning.id} className="text-sm">
                      - {learning.content}
                      {learning.category ? ` (${learning.category})` : ""}
                    </div>
                  ))}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
