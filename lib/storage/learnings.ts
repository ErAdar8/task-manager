import { promises as fs } from "fs";
import path from "path";
import type { Learning, Task } from "@/schemas/tasks";
import {
  standaloneLearningSchema,
  type CreateStandaloneLearningInput,
  type StandaloneLearning,
} from "@/schemas/learnings";
import { getProject } from "@/lib/storage/projects";
import {
  addLearningToListIndex,
  readLearningsListIndex,
  rebuildLearningsIndex,
  removeLearningFromListIndex,
  writeLearningsListIndex,
} from "@/lib/storage/index-utils";
import { createNote, deleteNote, readNote } from "@/lib/storage/notes";
import { readTask, updateTask } from "@/lib/storage/tasks";

const DATA_DIR = path.join(process.cwd(), "data");
const LEARNINGS_DIR = path.join(DATA_DIR, "learnings");

async function ensureLearningsDir(): Promise<void> {
  await fs.mkdir(LEARNINGS_DIR, { recursive: true });
}

function learningPath(id: string): string {
  return path.join(LEARNINGS_DIR, `${id}.json`);
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
  try {
    await ensureLearningsDir();
    const raw = await fs.readFile(learningPath(learningId), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const result = standaloneLearningSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function writeLearning(learning: StandaloneLearning): Promise<void> {
  await ensureLearningsDir();
  standaloneLearningSchema.parse(learning);
  await fs.writeFile(learningPath(learning.id), JSON.stringify(learning, null, 2), "utf-8");
}

export async function rebuildLearningsIndexFromDisk(): Promise<void> {
  const ids = await scanAllLearningIds();
  await rebuildLearningsIndex(async () => ids);
}

async function scanAllLearningIds(): Promise<string[]> {
  try {
    await ensureLearningsDir();
    const files = await fs.readdir(LEARNINGS_DIR);
    return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

export async function listAllLearnings(): Promise<StandaloneLearning[]> {
  const index = await readLearningsListIndex();
  const ids = index?.ids?.length ? index.ids : await scanAllLearningIds();
  if (!index?.ids?.length && ids.length > 0) {
    await writeLearningsListIndex({ ids });
  }
  const out: StandaloneLearning[] = [];
  for (const id of ids) {
    const l = await readLearning(id);
    if (l) out.push(l);
  }
  out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return out;
}

export async function listLearningsByTask(taskId: string): Promise<StandaloneLearning[]> {
  const all = await listAllLearnings();
  return all.filter((l) => l.source.type === "task" && l.source.taskId === taskId);
}

export async function listLearningsByProject(projectId: string): Promise<StandaloneLearning[]> {
  const all = await listAllLearnings();
  return all.filter((l) => l.source.projectId === projectId);
}

export async function listGeneralLearnings(): Promise<StandaloneLearning[]> {
  const all = await listAllLearnings();
  return all.filter((l) => l.source.type === "general");
}

export async function createLearning(input: CreateStandaloneLearningInput): Promise<StandaloneLearning> {
  const now = new Date().toISOString();
  const id = `learn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const learning: StandaloneLearning = {
    id,
    content: input.content.trim(),
    title: input.title?.trim() || undefined,
    category: input.category?.trim() || undefined,
    attachments: input.attachments ?? [],
    source: input.source,
    createdAt: now,
    updatedAt: now,
  };
  await writeLearning(learning);
  await addLearningToListIndex(learning.id);
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
  const taskId = next.source.taskId;
  if (taskId && next.source.type === "task") {
    const task = await readTask(taskId);
    if (task) {
      const learnings = task.learnings.map((l) =>
        l.id === learningId ? standaloneToTaskCache(next) : l
      );
      await updateTask(taskId, { learnings });
    }
  }
  return next;
}

export async function deleteLearningFile(learningId: string): Promise<boolean> {
  try {
    await fs.unlink(learningPath(learningId));
    await removeLearningFromListIndex(learningId);
    return true;
  } catch {
    return false;
  }
}

/** Remove standalone file and strip from task cache if attached. */
export async function deleteLearningEverywhere(learningId: string): Promise<boolean> {
  const s = await readLearning(learningId);
  if (!s) return false;
  if (s.source.type === "task" && s.source.taskId) {
    const task = await readTask(s.source.taskId);
    if (task) {
      const learnings = task.learnings.filter((l) => l.id !== learningId);
      await updateTask(s.source.taskId, { learnings });
    }
  }
  await deleteLearningFile(learningId);
  return true;
}

export async function addLearningToTask(
  taskId: string,
  input: { content: string; category?: string; attachments?: string[]; title?: string }
): Promise<{ task: Task; learning: StandaloneLearning } | null> {
  const task = await readTask(taskId);
  if (!task) return null;
  const project = await getProject(task.project_id);
  const now = new Date().toISOString();
  const id = `learn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const standalone: StandaloneLearning = {
    id,
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
  await writeLearning(standalone);
  await addLearningToListIndex(standalone.id);
  const nextLearnings = [...task.learnings, standaloneToTaskCache(standalone)];
  const updated = await updateTask(taskId, { learnings: nextLearnings });
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
  const nextStandalone: StandaloneLearning = {
    ...s,
    content: typeof updates.content === "string" ? updates.content.trim() : s.content,
    category:
      updates.category !== undefined
        ? updates.category.trim() || undefined
        : s.category,
    attachments: Array.isArray(updates.attachments) ? updates.attachments : s.attachments,
    title: updates.title !== undefined ? updates.title.trim() || undefined : s.title,
    updatedAt: new Date().toISOString(),
  };
  await writeLearning(nextStandalone);
  const t = await readTask(taskId);
  if (!t) return null;
  const learnings = t.learnings.map((l) =>
    l.id === learningId ? standaloneToTaskCache(nextStandalone) : l
  );
  return updateTask(taskId, { learnings });
}

export async function deleteLearningFromTask(taskId: string, learningId: string): Promise<Task | null> {
  const task = await readTask(taskId);
  if (!task) return null;
  const learnings = task.learnings.filter((l) => l.id !== learningId);
  await updateTask(taskId, { learnings });
  await deleteLearningFile(learningId);
  return readTask(taskId);
}

export async function removeAllStandaloneForTask(taskId: string): Promise<void> {
  const list = await listLearningsByTask(taskId);
  for (const l of list) {
    await deleteLearningFile(l.id);
  }
}

function learningKey(content: string, category?: string): string {
  return `${content.trim()}::${(category ?? "").trim()}`;
}

function dedupeLearningsByIdAndContent(existing: Learning[], incoming: Learning[]): Learning[] {
  const seen = new Set<string>();
  const out: Learning[] = [];
  for (const l of [...existing, ...incoming]) {
    const key = `${l.id}::${learningKey(l.content, l.category)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(l);
  }
  return out;
}

export async function completeTaskWithLearnings(
  taskId: string,
  items: Array<{ content: string; category?: string; attachments?: string[] }>
): Promise<Task | null> {
  const task = await readTask(taskId);
  if (!task) return null;
  const now = new Date().toISOString();
  const project = await getProject(task.project_id);

  const seenKeys = new Set<string>();
  const deduped: typeof items = [];
  for (const item of items) {
    const key = learningKey(item.content, item.category);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    const existsOnTask = task.learnings.some(
      (m) => learningKey(m.content, m.category) === key
    );
    if (existsOnTask) continue;
    deduped.push(item);
  }

  const newCache: Learning[] = [];
  for (const item of deduped) {
    const id = `learn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const standalone: StandaloneLearning = {
      id,
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
    };
    await writeLearning(standalone);
    await addLearningToListIndex(standalone.id);
    newCache.push(standaloneToTaskCache(standalone));
  }

  const merged = dedupeLearningsByIdAndContent(task.learnings, newCache);

  return updateTask(taskId, {
    status: "completed",
    completed_at: now,
    learnings: merged,
  });
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
  const task = await readTask(s.source.taskId);
  if (task) {
    await updateTask(s.source.taskId, {
      learnings: task.learnings.filter((l) => l.id !== learningId),
    });
  }
  const next: StandaloneLearning = {
    ...s,
    source: { type: "general" },
    updatedAt: new Date().toISOString(),
  };
  await writeLearning(next);
  return next;
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

  if (s.source.type === "task" && s.source.taskId && s.source.taskId !== taskId) {
    const prev = await readTask(s.source.taskId);
    if (prev) {
      await updateTask(s.source.taskId, {
        learnings: prev.learnings.filter((l) => l.id !== learningId),
      });
    }
  }

  const next: StandaloneLearning = {
    ...s,
    source: {
      type: "task",
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.project_id,
      projectName: project?.name ?? "",
    },
    updatedAt: new Date().toISOString(),
  };
  await writeLearning(next);

  const learnings = [
    ...task.learnings.filter((l) => l.id !== learningId),
    standaloneToTaskCache(next),
  ];
  await updateTask(taskId, { learnings });
  return next;
}
