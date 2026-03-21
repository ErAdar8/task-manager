import { promises as fs } from "fs";
import path from "path";
import {
  createGenericNoteInputSchema,
  genericNoteSchema,
  type CreateGenericNoteInput,
  type GenericNote,
} from "@/schemas/notes";

const DATA_DIR = path.join(process.cwd(), "data");
const NOTES_DIR = path.join(DATA_DIR, "notes");

async function ensureNotesDir(): Promise<void> {
  await fs.mkdir(NOTES_DIR, { recursive: true });
}

function notePath(noteId: string): string {
  return path.join(NOTES_DIR, `${noteId}.json`);
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
    await fs.unlink(notePath(noteId));
    return true;
  } catch {
    return false;
  }
}
