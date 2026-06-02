"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  BookOpen as BookOpenIcon,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  ClipboardCopy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { generateGenericRepoScanPrompt } from "@/lib/cursor-prompts";
import { NewTaskModal } from "@/components/project/new-task-modal";
import { DeleteConfirmation, type DeleteConfirmationData } from "@/components/dialogs/delete-confirmation";
import type { Project } from "@/schemas/projects";
import type { Task } from "@/schemas/tasks";

function statusLabel(status: Task["status"]): string {
  if (status === "draft") return "Draft";
  if (status === "understanding") return "Reviewing Understanding";
  if (status === "architecture_ready") return "Architecture Ready";
  if (status === "in_progress") return "In Progress";
  if (status === "completed") return "Completed";
  return "Draft";
}

function statusBadgeClass(status: Task["status"]): string {
  if (status === "draft") return "bg-slate-700 text-slate-200";
  if (status === "understanding") return "bg-blue-900/60 text-blue-200";
  if (status === "architecture_ready") return "bg-emerald-900/60 text-emerald-200";
  if (status === "in_progress") return "bg-amber-900/60 text-amber-200";
  return "bg-emerald-800/70 text-emerald-100";
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params.id === "string" ? params.id : null;
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmationData | null>(null);
  const [repoScanDraft, setRepoScanDraft] = useState("");
  const [isSavingRepoScan, setIsSavingRepoScan] = useState(false);
  const [repoScanCopyToast, setRepoScanCopyToast] = useState(false);

  const loadProject = useCallback(async (id: string) => {
    const res = await fetch(`/api/projects/${encodeURIComponent(id)}`);
    const json = (await res.json()) as { success: boolean; data?: Project; error?: string };
    if (json.success && json.data) {
      setProject(json.data);
      setNewName(json.data.name);
      setRepoScanDraft(json.data.repo_scan ?? "");
    } else {
      setProject(null);
    }
  }, []);

  const loadTasks = useCallback(async (id: string) => {
    const res = await fetch(`/api/tasks?projectId=${encodeURIComponent(id)}`);
    const json = (await res.json()) as { success: boolean; data?: Task[]; error?: string };
    if (json.success && json.data) {
      setTasks(json.data);
    } else {
      setTasks([]);
    }
  }, []);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([loadProject(projectId), loadTasks(projectId)]).finally(() =>
      setLoading(false)
    );
  }, [projectId, loadProject, loadTasks]);

  const handleCreateTask = (task: Task) => {
    setTasks((t) => [task, ...t]);
    setShowNewTask(false);
    router.push(`/projects/${projectId}/tasks/${task.id}`);
  };

  const handleDeleteTask = async () => {
    if (!deleteConfirm || deleteConfirm.target !== "task") return;
    const taskId = "taskId" in deleteConfirm ? deleteConfirm.taskId : "";
    if (!taskId) return;
    const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
    if (res.ok) {
      setTasks((t) => t.filter((x) => x.id !== taskId));
      setDeleteConfirm(null);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, { method: "DELETE" });
    if (res.ok) {
      setShowDeleteModal(false);
      window.dispatchEvent(new Event("projects-updated"));
      router.push("/projects");
    }
  };

  const handleRenameProject = async () => {
    if (!projectId || !newName.trim()) return;
    await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setShowRenameModal(false);
    await loadProject(projectId);
  };

  const completedCount = tasks.filter((t) => t.status === "completed").length;

  if (!projectId) {
    return (
      <main className="flex-1 flex items-center justify-center text-slate-400">
        Invalid project
      </main>
    );
  }

  if (loading || !project) {
    return (
      <main className="flex-1 flex items-center justify-center text-slate-400">
        {loading ? "Loading…" : "Project not found"}
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-6 md:p-8 bg-slate-950 text-slate-100 overflow-auto">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <Link
          href="/projects"
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-100 truncate">{project.name}</h1>
            {project.description && (
              <p className="text-slate-400 text-sm mt-1">{project.description}</p>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className="p-2 hover:bg-gray-700 rounded"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowRenameModal(true);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Rename Project
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteModal(true);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center gap-2 text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Project
                </button>
              </div>
            )}
          </div>
        </div>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <h2 className="text-sm font-medium text-slate-300">Project Information</h2>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <div className="flex gap-4">
              <span className="text-slate-500 w-24 shrink-0">Name:</span>
              <span className="text-slate-200">{project.name}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <h2 className="text-sm font-medium text-slate-300">Repo scan</h2>
            <p className="text-xs text-slate-500 mt-1">
              One scan per project. All task analyses use this. Run the prompt in Cursor, then paste the result here.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => {
                  void navigator.clipboard.writeText(generateGenericRepoScanPrompt());
                  setRepoScanCopyToast(true);
                  setTimeout(() => setRepoScanCopyToast(false), 2500);
                }}
              >
                <ClipboardCopy className="w-4 h-4 mr-2" />
                Copy Repo Context
              </Button>
              {repoScanCopyToast && (
                <span className="text-xs text-emerald-400 self-center">Copied to clipboard</span>
              )}
            </div>
            <Textarea
              value={repoScanDraft}
              onChange={(e) => setRepoScanDraft(e.target.value)}
              placeholder="Paste Cursor's repo analysis here. Save once; all tasks in this project will use it."
              className="min-h-[140px] bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 text-sm"
            />
            <Button
              type="button"
              size="sm"
              className="bg-slate-700 hover:bg-slate-600 text-slate-100"
              disabled={isSavingRepoScan || repoScanDraft === (project.repo_scan ?? "")}
              onClick={async () => {
                if (!projectId) return;
                setIsSavingRepoScan(true);
                try {
                  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ repo_scan: repoScanDraft }),
                  });
                  if (res.ok) {
                    const json = (await res.json()) as { success: boolean; data?: Project };
                    if (json.success && json.data) {
                      setProject(json.data);
                      setRepoScanDraft(json.data.repo_scan ?? "");
                    }
                  }
                } finally {
                  setIsSavingRepoScan(false);
                }
              }}
            >
              {isSavingRepoScan ? "Saving…" : "Save repo scan"}
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-300">Tasks</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/projects/${projectId}/learnings`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <BookOpenIcon className="w-4 h-4" />
              View Learnings
            </button>
            <Button
              onClick={() => setShowNewTask(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-0">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No tasks yet. Click &quot;New Task&quot; to create one.
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="divide-y divide-slate-800">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-100 truncate">{t.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] ${statusBadgeClass(
                              t.status
                            )}`}
                          >
                            {t.status === "completed" ? "✓ Completed" : statusLabel(t.status)}
                          </span>
                          <span>
                            {formatRelativeTime(t.updated_at ?? t.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Link href={`/projects/${projectId}/tasks/${t.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-200 hover:bg-slate-800"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {t.status === "completed" ? "View" : "Continue"}
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-red-400"
                          onClick={() =>
                            setDeleteConfirm({
                              target: "task",
                              taskId: t.id,
                              name: t.title,
                              artifactCount: 0,
                              scanCount: 0,
                            })
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <h2 className="text-sm font-medium text-slate-300">Statistics</h2>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            Total Tasks: {tasks.length} • Completed: {completedCount}
          </CardContent>
        </Card>
      </div>

      <NewTaskModal
        isOpen={showNewTask}
        projectId={projectId}
        onClose={() => setShowNewTask(false)}
        onCreate={handleCreateTask}
      />

      <DeleteConfirmation
        isOpen={!!deleteConfirm}
        data={deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={
          deleteConfirm?.target === "task"
              ? handleDeleteTask
              : () => {}
        }
      />
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-lg font-bold mb-4">Rename Project</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowRenameModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRenameProject()}
                className="flex-1 px-4 py-2 bg-blue-600 rounded"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-lg font-bold mb-4 text-red-400">Delete Project?</h3>
            <p className="mb-4">
              Are you sure you want to delete &quot;{project.name}&quot;?
            </p>
            <p className="mb-4">
              This will permanently delete &quot;{project.name}&quot; and all {project.total_tasks} tasks.
              This cannot be undone.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeleteProject()}
                className="flex-1 px-4 py-2 bg-red-600 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
