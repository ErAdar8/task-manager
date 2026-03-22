import { promises as fs } from "fs";
import path from "path";
import {
  taskArchitectureSchema,
  taskSchema,
  taskUnderstandingSchema,
  type CreateTaskInput,
  type Task,
} from "@/schemas/tasks";
import {
  addTaskToIndex,
  readProjectTasksIndex,
  rebuildProjectTasksIndex,
  removeTaskFromIndex,
} from "@/lib/storage/index-utils";

const DATA_DIR = path.join(process.cwd(), "data");
const TASKS_DIR = path.join(DATA_DIR, "tasks");

async function ensureTasksDir(): Promise<void> {
  await fs.mkdir(TASKS_DIR, { recursive: true });
}

function taskPath(taskId: string): string {
  return path.join(TASKS_DIR, `${taskId}.json`);
}

async function scanAllTasksForIndex(): Promise<Array<{ project_id: string; id: string }>> {
  await ensureTasksDir();
  const files = await fs.readdir(TASKS_DIR);
  const rows: Array<{ project_id: string; id: string }> = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const task = await readTask(file.replace(".json", ""));
    if (task) rows.push({ project_id: task.project_id, id: task.id });
  }
  return rows;
}

export async function rebuildProjectTasksIndexFromDisk(): Promise<void> {
  const rows = await scanAllTasksForIndex();
  await rebuildProjectTasksIndex(async () => rows);
}

export async function readTask(taskId: string): Promise<Task | null> {
  try {
    await ensureTasksDir();
    const raw = await fs.readFile(taskPath(taskId), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const result = taskSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function writeTask(task: Task): Promise<void> {
  await ensureTasksDir();
  taskSchema.parse(task);
  await fs.writeFile(taskPath(task.id), JSON.stringify(task, null, 2), "utf-8");
}

export async function listTasksByProject(projectId: string): Promise<Task[]> {
  try {
    await ensureTasksDir();
    const index = await readProjectTasksIndex();
    const ids = index?.[projectId];
    if (ids && ids.length > 0) {
      const tasks: Task[] = [];
      for (const id of ids) {
        const task = await readTask(id);
        if (task && task.project_id === projectId) tasks.push(task);
      }
      tasks.sort((a, b) => b.created_at.localeCompare(a.created_at));
      return tasks;
    }
    const files = await fs.readdir(TASKS_DIR);
    const tasks: Task[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const task = await readTask(file.replace(".json", ""));
      if (task && task.project_id === projectId) {
        tasks.push(task);
      }
    }
    tasks.sort((a, b) => b.created_at.localeCompare(a.created_at));
    await rebuildProjectTasksIndexFromDisk();
    return tasks;
  } catch {
    return [];
  }
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const now = new Date().toISOString();
  const task: Task = {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    project_id: input.project_id,
    user_id: input.user_id,
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
    cursor_repo_scan: "",
    learnings: [],
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
    last_analysis_kind: null,
    analysis_mode: input.analysis_mode,
  };
  await writeTask(task);
  await addTaskToIndex(task.project_id, task.id);
  return task;
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
  const current = await readTask(taskId);
  if (!current) return null;
  const next: Task = {
    ...current,
    ...updates,
    id: current.id,
    project_id: current.project_id,
    user_id: current.user_id,
    created_at: current.created_at,
    updated_at: new Date().toISOString(),
  };
  taskSchema.parse(next);
  await writeTask(next);
  return next;
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
  try {
    const task = await readTask(taskId);
    if (task) {
      const { removeAllStandaloneForTask } = await import("@/lib/storage/learnings");
      await removeAllStandaloneForTask(task.id);
      await removeTaskFromIndex(task.project_id, task.id);
    }
    await fs.unlink(taskPath(taskId));
    return true;
  } catch {
    return false;
  }
}
