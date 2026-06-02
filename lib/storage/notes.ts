import {
  createGenericNoteInputSchema,
  genericNoteSchema,
  type CreateGenericNoteInput,
  type GenericNote,
} from "@/schemas/notes";
import { db } from "@/lib/storage/db";

function rowToNote(row: Record<string, unknown>): GenericNote {
  return genericNoteSchema.parse({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

export async function readNote(noteId: string): Promise<GenericNote | null> {
  const { data, error } = await db().from("notes").select("*").eq("id", noteId).single();
  if (error || !data) return null;
  return rowToNote(data as Record<string, unknown>);
}

export async function writeNote(_note: GenericNote): Promise<void> {}

export async function listNotes(userId = "local_user"): Promise<GenericNote[]> {
  const { data, error } = await db()
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => rowToNote(r as Record<string, unknown>));
}

export async function createNote(input: CreateGenericNoteInput): Promise<GenericNote> {
  const parsed = createGenericNoteInputSchema.parse(input);
  const now = new Date().toISOString();
  const row = {
    id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    user_id: parsed.user_id ?? "local_user",
    title: parsed.title,
    content: parsed.content,
    tags: parsed.tags ?? [],
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await db().from("notes").insert(row).select().single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create note");
  return rowToNote(data as Record<string, unknown>);
}

export async function updateNote(
  noteId: string,
  updates: Partial<Pick<GenericNote, "title" | "content" | "tags">>
): Promise<GenericNote | null> {
  const { data, error } = await db()
    .from("notes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .select()
    .single();
  if (error || !data) return null;
  return rowToNote(data as Record<string, unknown>);
}

export async function deleteNote(noteId: string): Promise<boolean> {
  const { error } = await db().from("notes").delete().eq("id", noteId);
  return !error;
}

export async function rebuildNotesIndexFromDisk(): Promise<void> {}
