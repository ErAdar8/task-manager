import { promises as fs } from "fs";
import path from "path";
import {
  createGenericNoteInputSchema,
  genericNoteSchema,
  type CreateGenericNoteInput,
  type GenericNote,
} from "@/schemas/notes";
import {
  addNoteToIndex,
  readNotesListIndex,
  rebuildNotesIndex,
  removeNoteFromIndex,
} from "@/lib/storage/index-utils";

const DATA_DIR = path.join(process.cwd(), "data");
const NOTES_DIR = path.join(DATA_DIR, "notes");

async function ensureNotesDir(): Promise<void> {
  await fs.mkdir(NOTES_DIR, { recursive: true });
}

function notePath(noteId: string): string {
  return path.join(NOTES_DIR, `${noteId}.json`);
}

async function scanAllNotesForIndex(): Promise<Array<{ user_id: string; id: string }>> {
  await ensureNotesDir();
  const files = await fs.readdir(NOTES_DIR);
  const rows: Array<{ user_id: string; id: string }> = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const note = await readNote(file.replace(".json", ""));
    if (note) rows.push({ user_id: note.user_id, id: note.id });
  }
  return rows;
}

export async function rebuildNotesIndexFromDisk(): Promise<void> {
  const rows = await scanAllNotesForIndex();
  await rebuildNotesIndex(async () => rows);
}

export async function readNote(noteId: string): Promise<GenericNote | null> {
  try {
    await ensureNotesDir();
    const raw = await fs.readFile(notePath(noteId), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const result = genericNoteSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function writeNote(note: GenericNote): Promise<void> {
  await ensureNotesDir();
  genericNoteSchema.parse(note);
  await fs.writeFile(notePath(note.id), JSON.stringify(note, null, 2), "utf-8");
}

export async function listNotes(userId = "local_user"): Promise<GenericNote[]> {
  try {
    await ensureNotesDir();
    const index = await readNotesListIndex();
    const ids = index?.[userId];
    if (ids && ids.length > 0) {
      const notes: GenericNote[] = [];
      for (const id of ids) {
        const note = await readNote(id);
        if (note && note.user_id === userId) notes.push(note);
      }
      notes.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      return notes;
    }
    const files = await fs.readdir(NOTES_DIR);
    const notes: GenericNote[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const note = await readNote(file.replace(".json", ""));
      if (note && note.user_id === userId) {
        notes.push(note);
      }
    }
    notes.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    await rebuildNotesIndexFromDisk();
    return notes;
  } catch {
    return [];
  }
}

export async function createNote(input: CreateGenericNoteInput): Promise<GenericNote> {
  const parsed = createGenericNoteInputSchema.parse(input);
  const now = new Date().toISOString();
  const note: GenericNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    user_id: parsed.user_id,
    title: parsed.title,
    content: parsed.content,
    tags: parsed.tags ?? [],
    created_at: now,
    updated_at: now,
  };
  await writeNote(note);
  await addNoteToIndex(note.user_id, note.id);
  return note;
}

export async function updateNote(
  noteId: string,
  updates: Partial<Pick<GenericNote, "title" | "content" | "tags">>
): Promise<GenericNote | null> {
  const current = await readNote(noteId);
  if (!current) return null;
  const next: GenericNote = {
    ...current,
    ...updates,
    id: current.id,
    user_id: current.user_id,
    created_at: current.created_at,
    updated_at: new Date().toISOString(),
  };
  genericNoteSchema.parse(next);
  await writeNote(next);
  return next;
}

export async function deleteNote(noteId: string): Promise<boolean> {
  try {
    const note = await readNote(noteId);
    if (note) {
      await removeNoteFromIndex(note.user_id, note.id);
    }
    await fs.unlink(notePath(noteId));
    return true;
  } catch {
    return false;
  }
}
