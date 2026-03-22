import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
export const INDEX_DIR = path.join(DATA_DIR, "index");

export const PROJECT_TASKS_INDEX_PATH = path.join(INDEX_DIR, "project-tasks.json");
export const NOTES_LIST_INDEX_PATH = path.join(INDEX_DIR, "notes-list.json");
export const LEARNINGS_LIST_INDEX_PATH = path.join(INDEX_DIR, "learnings-list.json");

export type ProjectTasksIndex = Record<string, string[]>;

export type NotesListIndex = Record<string, string[]>;

export type LearningsListIndex = { ids: string[] };

async function ensureIndexDir(): Promise<void> {
  await fs.mkdir(INDEX_DIR, { recursive: true });
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJsonAtomic<T>(filePath: string, data: T): Promise<void> {
  await ensureIndexDir();
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(data, null, 2);
  await fs.writeFile(tmp, payload, "utf-8");
  await fs.rename(tmp, filePath);
}

export async function readProjectTasksIndex(): Promise<ProjectTasksIndex | null> {
  return readJsonFile<ProjectTasksIndex>(PROJECT_TASKS_INDEX_PATH);
}

export async function writeProjectTasksIndex(index: ProjectTasksIndex): Promise<void> {
  await writeJsonAtomic(PROJECT_TASKS_INDEX_PATH, index);
}

export async function readNotesListIndex(): Promise<NotesListIndex | null> {
  return readJsonFile<NotesListIndex>(NOTES_LIST_INDEX_PATH);
}

export async function writeNotesListIndex(index: NotesListIndex): Promise<void> {
  await writeJsonAtomic(NOTES_LIST_INDEX_PATH, index);
}

export async function readLearningsListIndex(): Promise<LearningsListIndex | null> {
  return readJsonFile<LearningsListIndex>(LEARNINGS_LIST_INDEX_PATH);
}

export async function writeLearningsListIndex(index: LearningsListIndex): Promise<void> {
  await writeJsonAtomic(LEARNINGS_LIST_INDEX_PATH, index);
}

export async function addTaskToIndex(projectId: string, taskId: string): Promise<void> {
  const idx = (await readProjectTasksIndex()) ?? {};
  const list = idx[projectId] ?? [];
  if (!list.includes(taskId)) {
    idx[projectId] = [...list, taskId];
    await writeProjectTasksIndex(idx);
  }
}

export async function removeTaskFromIndex(projectId: string, taskId: string): Promise<void> {
  const idx = await readProjectTasksIndex();
  if (!idx || !idx[projectId]) return;
  idx[projectId] = idx[projectId]!.filter((id) => id !== taskId);
  await writeProjectTasksIndex(idx);
}

export async function moveTaskInIndex(
  oldProjectId: string,
  newProjectId: string,
  taskId: string
): Promise<void> {
  const idx = (await readProjectTasksIndex()) ?? {};
  if (idx[oldProjectId]) {
    idx[oldProjectId] = idx[oldProjectId]!.filter((id) => id !== taskId);
  }
  const next = idx[newProjectId] ?? [];
  if (!next.includes(taskId)) idx[newProjectId] = [...next, taskId];
  else idx[newProjectId] = next;
  await writeProjectTasksIndex(idx);
}

export async function rebuildProjectTasksIndex(
  scanFn: () => Promise<Array<{ project_id: string; id: string }>>
): Promise<void> {
  const rows = await scanFn();
  const idx: ProjectTasksIndex = {};
  for (const r of rows) {
    if (!idx[r.project_id]) idx[r.project_id] = [];
    idx[r.project_id]!.push(r.id);
  }
  await writeProjectTasksIndex(idx);
}

export async function addNoteToIndex(userId: string, noteId: string): Promise<void> {
  const idx = (await readNotesListIndex()) ?? {};
  const list = idx[userId] ?? [];
  if (!list.includes(noteId)) {
    idx[userId] = [...list, noteId];
    await writeNotesListIndex(idx);
  }
}

export async function removeNoteFromIndex(userId: string, noteId: string): Promise<void> {
  const idx = await readNotesListIndex();
  if (!idx || !idx[userId]) return;
  idx[userId] = idx[userId]!.filter((id) => id !== noteId);
  await writeNotesListIndex(idx);
}

export async function rebuildNotesIndex(
  scanFn: () => Promise<Array<{ user_id: string; id: string }>>
): Promise<void> {
  const rows = await scanFn();
  const idx: NotesListIndex = {};
  for (const r of rows) {
    if (!idx[r.user_id]) idx[r.user_id] = [];
    idx[r.user_id]!.push(r.id);
  }
  await writeNotesListIndex(idx);
}

export async function addLearningToListIndex(learningId: string): Promise<void> {
  const idx = (await readLearningsListIndex()) ?? { ids: [] };
  if (!idx.ids.includes(learningId)) {
    idx.ids = [...idx.ids, learningId];
    await writeLearningsListIndex(idx);
  }
}

export async function removeLearningFromListIndex(learningId: string): Promise<void> {
  const idx = await readLearningsListIndex();
  if (!idx) return;
  idx.ids = idx.ids.filter((id) => id !== learningId);
  await writeLearningsListIndex(idx);
}

export async function rebuildLearningsIndex(scanFn: () => Promise<string[]>): Promise<void> {
  const ids = await scanFn();
  await writeLearningsListIndex({ ids });
}
