import type { Learning, Task } from "@/schemas/tasks";
import {
  standaloneLearningSchema,
  type CreateStandaloneLearningInput,
  type StandaloneLearning,
} from "@/schemas/learnings";
import { db } from "@/lib/storage/db";
import { getProject } from "@/lib/storage/projects";
import { createNote, deleteNote, readNote } from "@/lib/storage/notes";
import { readTask, updateTask } from "@/lib/storage/tasks";

function rowToStandalone(row: Record<string, unknown>): StandaloneLearning {
  return standaloneLearningSchema.parse({
    id: row.id,
    content: row.content,
    title: row.title ?? undefined,
    category: row.category ?? undefined,
    attachments: row.attachments ?? [],
    source: {
      type: row.source_type,
      taskId: row.source_task_id ?? undefined,
      taskTitle: row.source_task_title ?? undefined,
      projectId: row.source_project_id ?? undefined,
      projectName: row.source_project_name ?? undefined,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function standaloneToRow(s: StandaloneLearning): Record<string, unknown> {
  return {
    id: s.id,
    user_id: "local_user",
    title: s.title ?? null,
    content: s.content,
    category: s.category ?? null,
    attachments: s.attachments ?? [],
    source_type: s.source.type,
    source_task_id: s.source.taskId ?? null,
    source_task_title: s.source.taskTitle ?? null,
    source_project_id: s.source.projectId ?? null,
    source_project_name: s.source.projectName ?? null,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

export function standaloneToTaskCache(s: StandaloneLearning): Learning {
  return {
    id: s.id,
    content: s.content,
    title: s.title,
    category: s.category,
    attachments: s.attachments ?? [],
    created_at: s.createdAt,
  };
}

export async function readLearning(learningId: string): Promise<StandaloneLearning | null> {
  const { data, error } = await db().from("learnings").select("*").eq("id", learningId).single();
  if (error || !data) return null;
  return rowToStandalone(data as Record<string, unknown>);
}

export async function writeLearning(learning: StandaloneLearning): Promise<void> {
  const row = standaloneToRow(learning);
  await db().from("learnings").upsert(row);
}

export async function listAllLearnings(): Promise<StandaloneLearning[]> {
  const { data, error } = await db()
    .from("learnings")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => rowToStandalone(r as Record<string, unknown>));
}

export async function listLearningsByTask(taskId: string): Promise<StandaloneLearning[]> {
  const { data, error } = await db()
    .from("learnings")
    .select("*")
    .eq("source_task_id", taskId)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => rowToStandalone(r as Record<string, unknown>));
}

export async function listLearningsByProject(projectId: string): Promise<StandaloneLearning[]> {
  const { data, error } = await db()
    .from("learnings")
    .select("*")
    .eq("source_project_id", projectId)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => rowToStandalone(r as Record<string, unknown>));
}

export async function listGeneralLearnings(): Promise<StandaloneLearning[]> {
  const { data, error } = await db()
    .from("learnings")
    .select("*")
    .eq("source_type", "general")
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => rowToStandalone(r as Record<string, unknown>));
}

export async function createLearning(input: CreateStandaloneLearningInput): Promise<StandaloneLearning> {
  const now = new Date().toISOString();
  const learning: StandaloneLearning = {
    id: `learn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    content: input.content.trim(),
    title: input.title?.trim() || undefined,
    category: input.category?.trim() || undefined,
    attachments: input.attachments ?? [],
    source: input.source,
    createdAt: now,
    updatedAt: now,
  };
  const { error } = await db().from("learnings").insert(standaloneToRow(learning));
  if (error) throw new Error(error.message);
  return learning;
}

export async function updateLearning(
  learningId: string,
  updates: Partial<Pick<StandaloneLearning, "content" | "title" | "category" | "attachments" | "source">>
): Promise<StandaloneLearning | null> {
  const current = await readLearning(learningId);
  if (!current) return null;
  const next: StandaloneLearning = {
    ...current,
    ...updates,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };
  standaloneLearningSchema.parse(next);
  await writeLearning(next);
  return next;
}

export async function deleteLearningFile(learningId: string): Promise<boolean> {
  const { error } = await db().from("learnings").delete().eq("id", learningId);
  return !error;
}

export async function deleteLearningEverywhere(learningId: string): Promise<boolean> {
  await deleteLearningFile(learningId);
  return true;
}

export async function removeAllStandaloneForTask(taskId: string): Promise<void> {
  await db().from("learnings").delete().eq("source_task_id", taskId);
}

export async function addLearningToTask(
  taskId: string,
  input: { content: string; category?: string; attachments?: string[]; title?: string }
): Promise<{ task: Task; learning: StandaloneLearning } | null> {
  const task = await readTask(taskId);
  if (!task) return null;
  const project = await getProject(task.project_id);
  const now = new Date().toISOString();
  const standalone: StandaloneLearning = {
    id: `learn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    content: input.content.trim(),
    title: input.title?.trim() || undefined,
    category: input.category?.trim() || undefined,
    attachments: input.attachments ?? [],
    source: {
      type: "task",
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.project_id,
      projectName: project?.name ?? "",
    },
    createdAt: now,
    updatedAt: now,
  };
  const { error } = await db().from("learnings").insert(standaloneToRow(standalone));
  if (error) return null;
  // Touch updated_at on task so callers get a fresh task back
  const updated = await updateTask(taskId, { updated_at: new Date().toISOString() } as Partial<Task>);
  if (!updated) return null;
  return { task: updated, learning: standalone };
}

export async function updateLearningOnTask(
  taskId: string,
  learningId: string,
  updates: { content?: string; category?: string; attachments?: string[]; title?: string }
): Promise<Task | null> {
  const s = await readLearning(learningId);
  if (!s) return null;
  const next: StandaloneLearning = {
    ...s,
    content: typeof updates.content === "string" ? updates.content.trim() : s.content,
    category: updates.category !== undefined ? updates.category.trim() || undefined : s.category,
    attachments: Array.isArray(updates.attachments) ? updates.attachments : s.attachments,
    title: updates.title !== undefined ? updates.title.trim() || undefined : s.title,
    updatedAt: new Date().toISOString(),
  };
  await writeLearning(next);
  return updateTask(taskId, { updated_at: new Date().toISOString() } as Partial<Task>);
}

export async function deleteLearningFromTask(taskId: string, learningId: string): Promise<Task | null> {
  await deleteLearningFile(learningId);
  return readTask(taskId);
}

function learningKey(content: string, category?: string): string {
  return `${content.trim()}::${(category ?? "").trim()}`;
}

export async function completeTaskWithLearnings(
  taskId: string,
  items: Array<{ content: string; category?: string; attachments?: string[] }>
): Promise<Task | null> {
  const task = await readTask(taskId);
  if (!task) return null;
  const now = new Date().toISOString();
  const project = await getProject(task.project_id);

  const existingLearnings = await listLearningsByTask(taskId);
  const existingKeys = new Set(existingLearnings.map((l) => learningKey(l.content, l.category)));

  const seenKeys = new Set<string>();
  const toInsert: StandaloneLearning[] = [];
  for (const item of items) {
    const key = learningKey(item.content, item.category);
    if (seenKeys.has(key) || existingKeys.has(key)) continue;
    seenKeys.add(key);
    toInsert.push({
      id: `learn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      content: item.content.trim(),
      category: item.category?.trim() || undefined,
      attachments: item.attachments ?? [],
      source: {
        type: "task",
        taskId: task.id,
        taskTitle: task.title,
        projectId: task.project_id,
        projectName: project?.name ?? "",
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  if (toInsert.length > 0) {
    await db().from("learnings").insert(toInsert.map(standaloneToRow));
  }

  return updateTask(taskId, { status: "completed", completed_at: now });
}

export async function moveNoteToLearning(noteId: string): Promise<StandaloneLearning | null> {
  const note = await readNote(noteId);
  if (!note) return null;
  const created = await createLearning({
    content: note.content,
    title: note.title,
    category: note.tags?.[0],
    attachments: [],
    source: { type: "general" },
  });
  await deleteNote(noteId);
  return created;
}

export async function moveLearningToNote(
  learningId: string,
  userId = "local_user"
): Promise<{ noteId: string } | null> {
  const s = await readLearning(learningId);
  if (!s) return null;
  const title =
    s.title?.trim() ||
    s.content.split("\n")[0]?.trim()?.slice(0, 120) ||
    "Learning";
  const note = await createNote({
    user_id: userId,
    title,
    content: s.content,
    tags: s.category ? [s.category] : [],
  });
  await deleteLearningEverywhere(learningId);
  return { noteId: note.id };
}

export async function moveLearningToGeneral(learningId: string): Promise<StandaloneLearning | null> {
  const s = await readLearning(learningId);
  if (!s || s.source.type !== "task" || !s.source.taskId) return null;
  return updateLearning(learningId, { source: { type: "general" } });
}

export async function moveLearningToTask(
  learningId: string,
  taskId: string
): Promise<StandaloneLearning | null> {
  const s = await readLearning(learningId);
  if (!s) return null;
  const task = await readTask(taskId);
  if (!task) return null;
  const project = await getProject(task.project_id);

  return updateLearning(learningId, {
    source: {
      type: "task",
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.project_id,
      projectName: project?.name ?? "",
    },
  });
}

export async function rebuildLearningsIndexFromDisk(): Promise<void> {}
