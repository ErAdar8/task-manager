import {
  taskArchitectureSchema,
  taskSchema,
  taskUnderstandingSchema,
  type CreateTaskInput,
  type Task,
} from "@/schemas/tasks";
import { db } from "@/lib/storage/db";

// Strip fields that are not columns on the tasks table
const TASK_VIRTUAL_FIELDS = new Set(["learnings"]);

function taskToRow(task: Partial<Task>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(task)) {
    if (!TASK_VIRTUAL_FIELDS.has(k)) row[k] = v;
  }
  return row;
}

async function fetchTaskLearningsCache(taskId: string) {
  // Lazy import to avoid circular dependency
  const { listLearningsByTask, standaloneToTaskCache } = await import("@/lib/storage/learnings");
  const standalones = await listLearningsByTask(taskId);
  return standalones.map(standaloneToTaskCache);
}

function rowToTask(row: Record<string, unknown>, learnings: Task["learnings"] = []): Task {
  return taskSchema.parse({
    ...row,
    raw_input: row.raw_input ?? "",
    card_description_images: row.card_description_images ?? [],
    task_notes: row.task_notes ?? "",
    task_notes_images: row.task_notes_images ?? [],
    cursor_repo_analysis: row.cursor_repo_analysis ?? "",
    cursor_repo_scan: row.cursor_repo_scan ?? "",
    work_process: row.work_process ?? "",
    main_problem: row.main_problem ?? "",
    key_concepts: row.key_concepts ?? [],
    issues: row.issues ?? [],
    requested_clarifications: row.requested_clarifications ?? [],
    learnings,
    completed_at: row.completed_at ?? null,
    analysis_error: row.analysis_error ?? null,
    last_analysis_kind: row.last_analysis_kind ?? null,
    analysis_partial: row.analysis_partial ?? false,
  });
}

export async function readTask(taskId: string): Promise<Task | null> {
  const { data, error } = await db().from("tasks").select("*").eq("id", taskId).single();
  if (error || !data) return null;
  const learnings = await fetchTaskLearningsCache(taskId);
  const result = taskSchema.safeParse(rowToTask(data as Record<string, unknown>, learnings));
  return result.success ? result.data : null;
}

export async function writeTask(_task: Task): Promise<void> {}

export async function listTasksByProject(projectId: string): Promise<Task[]> {
  const { data, error } = await db()
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => rowToTask(r as Record<string, unknown>));
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const now = new Date().toISOString();
  const row = {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    project_id: input.project_id,
    user_id: input.user_id ?? "local_user",
    title: input.title,
    raw_input: input.raw_input,
    card_description_images: input.card_description_images ?? [],
    understanding: null,
    understanding_approved: false,
    requested_clarifications: [],
    user_edited_understanding: null,
    architecture: null,
    status: "draft",
    task_notes: "",
    task_notes_images: [],
    cursor_repo_analysis: "",
    cursor_repo_scan: input.cursor_repo_scan ?? "",
    work_process: "",
    main_problem: "",
    key_concepts: [],
    issues: [],
    created_at: now,
    updated_at: now,
    completed_at: null,
    analysis_error: null,
    canonical_execute_result: null,
    canonical_understand_result: null,
    canonical_testing_result: null,
    canonical_qa_result: null,
    last_analysis_kind: null,
    analysis_mode: input.analysis_mode ?? null,
    analysis_partial: false,
  };
  const { data, error } = await db().from("tasks").insert(row).select().single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create task");
  return rowToTask(data as Record<string, unknown>);
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
  const row = taskToRow({ ...updates, updated_at: new Date().toISOString() });
  const { data, error } = await db()
    .from("tasks")
    .update(row)
    .eq("id", taskId)
    .select()
    .single();
  if (error || !data) return null;
  const learnings = await fetchTaskLearningsCache(taskId);
  return rowToTask(data as Record<string, unknown>, learnings);
}

export async function setTaskUnderstanding(taskId: string, understanding: unknown): Promise<Task | null> {
  const parsed = taskUnderstandingSchema.parse(understanding);
  return updateTask(taskId, { understanding: parsed });
}

export async function setTaskArchitecture(taskId: string, architecture: unknown): Promise<Task | null> {
  const parsed = taskArchitectureSchema.parse(architecture);
  return updateTask(taskId, { architecture: parsed });
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const { removeAllStandaloneForTask } = await import("@/lib/storage/learnings");
  await removeAllStandaloneForTask(taskId);
  const { error } = await db().from("tasks").delete().eq("id", taskId);
  return !error;
}

export async function rebuildProjectTasksIndexFromDisk(): Promise<void> {}
