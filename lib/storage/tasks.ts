import { promises as fs } from "fs";
import path from "path";
import {
  taskArchitectureSchema,
  taskSchema,
  taskUnderstandingSchema,
  type CreateTaskInput,
  type Learning,
  type Task,
} from "@/schemas/tasks";

const DATA_DIR = path.join(process.cwd(), "data");
const TASKS_DIR = path.join(DATA_DIR, "tasks");

async function ensureTasksDir(): Promise<void> {
  await fs.mkdir(TASKS_DIR, { recursive: true });
}

function taskPath(taskId: string): string {
  return path.join(TASKS_DIR, `${taskId}.json`);
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
  };
  await writeTask(task);
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

export async function setTaskLearnings(taskId: string, learnings: Omit<Learning, "id" | "created_at">[]): Promise<Task | null> {
  const task = await readTask(taskId);
  if (!task) return null;
  const now = new Date().toISOString();
  const normalized: Learning[] = learnings.map((learning) => ({
    id: `learn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    content: learning.content,
    category: learning.category,
    attachments: learning.attachments ?? [],
    created_at: now,
  }));
  return updateTask(taskId, {
    status: "completed",
    completed_at: now,
    learnings: [...task.learnings, ...normalized],
  });
}

export async function addTaskLearning(
  taskId: string,
  learning: Omit<Learning, "id" | "created_at">
): Promise<Task | null> {
  const task = await readTask(taskId);
  if (!task) return null;
  const now = new Date().toISOString();
  const appended: Learning = {
    id: `learn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    content: learning.content,
    category: learning.category,
    attachments: learning.attachments ?? [],
    created_at: now,
  };
  return updateTask(taskId, {
    learnings: [...task.learnings, appended],
  });
}

export async function updateTaskLearning(
  taskId: string,
  learningId: string,
  updates: { content?: string; category?: string; attachments?: string[] }
): Promise<Task | null> {
  const task = await readTask(taskId);
  if (!task) return null;
  const learnings = task.learnings.map((l) =>
    l.id === learningId
      ? {
          ...l,
          ...(typeof updates.content === "string" && { content: updates.content }),
          ...(updates.category !== undefined && { category: updates.category }),
          ...(Array.isArray(updates.attachments) && { attachments: updates.attachments }),
        }
      : l
  );
  return updateTask(taskId, { learnings });
}

export async function deleteTaskLearning(
  taskId: string,
  learningId: string
): Promise<Task | null> {
  const task = await readTask(taskId);
  if (!task) return null;
  const learnings = task.learnings.filter((l) => l.id !== learningId);
  return updateTask(taskId, { learnings });
}

export async function deleteTask(taskId: string): Promise<boolean> {
  try {
    await fs.unlink(taskPath(taskId));
    return true;
  } catch {
    return false;
  }
}
