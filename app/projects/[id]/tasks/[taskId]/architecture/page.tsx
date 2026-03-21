"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Task } from "@/schemas/tasks";

export default function ArchitecturePage() {
  const params = useParams();
  const projectId = typeof params.id === "string" ? params.id : null;
  const taskId = typeof params.taskId === "string" ? params.taskId : null;
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!taskId) return;
    fetch(`/api/tasks/${encodeURIComponent(taskId)}`)
      .then((res) => res.json())
      .then((json: { success: boolean; data?: Task }) => {
        if (json.success && json.data) setTask(json.data);
      });
  }, [taskId]);

  if (!projectId || !taskId) {
    return <main className="flex-1 flex items-center justify-center text-slate-400">Invalid route</main>;
  }

  return (
    <main className="flex-1 overflow-auto bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href={`/projects/${projectId}/tasks/${taskId}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" />
          Back to Task
        </Link>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <h1 className="text-xl font-semibold">Full Architecture</h1>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-slate-800 bg-slate-950 p-6 text-sm text-slate-200">
              {((task?.architecture?.detailed_breakdown ?? "").trim() || "No architecture yet. Use the Architecture tab on the task page to add or paste a plan.")
                .split(/\n\n+/)
                .filter((block) => block.trim())
                .map((block, i) => (
                  <div key={i} className="mb-6 last:mb-0">
                    {block.split("\n").map((line, j) => {
                      const t = line.trim();
                      const isPhase = /^PHASE\s+\d+/i.test(t) || /^Phase\s+\d+/i.test(t);
                      return (
                        <p
                          key={j}
                          className={`mb-2 last:mb-0 leading-relaxed ${isPhase ? "mt-4 first:mt-0 font-semibold text-slate-100" : ""}`}
                        >
                          {t || "\u00A0"}
                        </p>
                      );
                    })}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
