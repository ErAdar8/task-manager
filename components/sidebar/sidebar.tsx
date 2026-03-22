"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Project } from "@/schemas/projects";
import type { Task } from "@/schemas/tasks";

function taskStatusIcon(status: Task["status"]): string {
  if (status === "draft") return "📝";
  if (status === "understanding") return "🔍";
  if (status === "architecture_ready") return "🏗️";
  if (status === "in_progress") return "🔄";
  return "✅";
}

export function Sidebar({
  selectedTaskId,
  selectedProjectId,
  onClose,
}: {
  selectedTaskId: string | null;
  selectedProjectId: string | null;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(selectedProjectId);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const loadProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    const json = (await res.json()) as { success: boolean; data?: Project[]; error?: string };
    if (json.success && json.data) setProjects(json.data);
  }, []);

  const loadTasks = useCallback(async (projectId: string) => {
    const res = await fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}`);
    const json = (await res.json()) as { success: boolean; data?: Task[]; error?: string };
    if (json.success && json.data) setTasks(json.data);
  }, []);

  useEffect(() => {
    setActiveProjectId(selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const refreshProjects = () => {
      void loadProjects();
    };
    window.addEventListener("projects-updated", refreshProjects);
    return () => {
      window.removeEventListener("projects-updated", refreshProjects);
    };
  }, [loadProjects]);

  useEffect(() => {
    if (!activeProjectId) {
      setTasks([]);
      return;
    }
    void loadTasks(activeProjectId);
  }, [activeProjectId, loadTasks]);

  useEffect(() => {
    if (!activeProjectId) return;
    const exists = projects.some((project) => project.id === activeProjectId);
    if (!exists) {
      setActiveProjectId(selectedProjectId);
      setTasks([]);
    }
  }, [projects, activeProjectId, selectedProjectId]);

  return (
    <div className="flex flex-col h-full min-w-0 border-r border-slate-800 bg-slate-950 text-slate-100">
      <div className="flex h-12 items-center justify-between border-b border-slate-800 px-3 shrink-0">
        <span className="text-sm font-semibold">Junior Dev Task Manager</span>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
      <div className="p-3 border-b border-slate-800">
        <div className="flex flex-col gap-1">
          <Link href="/projects" className="text-sm text-slate-300 hover:text-white">
            Projects
          </Link>
          <Link href="/notes" className="text-sm text-slate-300 hover:text-white">
            Notes
          </Link>
          <Link href="/learnings" className="text-sm text-slate-300 hover:text-white">
            Learnings
          </Link>
        </div>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-3">
          {projects.map((project) => (
            <div key={project.id} className="space-y-1">
              <button
                type="button"
                className={cn(
                  "w-full text-left px-2 py-1 rounded text-sm",
                  activeProjectId === project.id ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/60"
                )}
                onClick={() => {
                  setActiveProjectId(project.id);
                  router.push(`/projects/${project.id}`);
                  onClose?.();
                }}
              >
                {project.name}
              </button>
              {activeProjectId === project.id && (
                <div className="pl-3 space-y-1">
                  <Link href={`/projects/${project.id}/learnings`} className="block text-xs text-blue-300 hover:text-blue-200">
                    View Learnings
                  </Link>
                  {tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/projects/${project.id}/tasks/${task.id}`}
                      className={cn(
                        "block text-xs truncate px-1 py-0.5 rounded",
                        selectedTaskId === task.id ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {taskStatusIcon(task.status)} {task.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-2 border-t border-slate-800">
        <Link href="/projects/new">
          <Button className="w-full bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>
    </div>
  );
}
