"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { Project } from "@/schemas/projects";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((json: { success: boolean; data?: Project[] }) => {
        if (json.success && json.data) setProjects(json.data);
      })
      .finally(() => setLoading(false));
  }, []);


  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center text-slate-400">
        Loading projects…
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-8 bg-slate-950 text-slate-100 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Projects</h1>
        <Link href="/projects/new">
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
        </Link>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        Select a project to organize tasks, architecture plans, and learnings.
      </p>
      <div className="space-y-3">
        {projects.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-8 text-center">
              <FolderOpen className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">No projects yet</p>
              <Link href="/projects/new">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-200 hover:bg-slate-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create your first project
              </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card
                className={cn(
                  "border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 transition-colors cursor-pointer"
                )}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <FolderOpen className="h-5 w-5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <h2 className="font-medium text-slate-100 truncate">{p.name}</h2>
                      {p.description && (
                        <p className="text-sm text-slate-500 truncate">{p.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.total_tasks > 0 && (
                      <span className="text-xs text-slate-500">
                        {p.completed_tasks}/{p.total_tasks} tasks
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
