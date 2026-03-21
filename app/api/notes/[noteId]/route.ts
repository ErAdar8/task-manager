import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { deleteNote, readNote, updateNote } from "@/lib/storage/notes";

type RouteParams = { params: Promise<{ noteId: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { noteId } = await params;
  const note = await readNote(noteId);
  if (!note) {
    return NextResponse.json(err("Note not found"), { status: 404 });
  }
  return NextResponse.json(ok(note));
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { noteId } = await params;
  const body = (await request.json()) as {
    title?: unknown;
    content?: unknown;
    tags?: unknown;
  };
  const updates: Parameters<typeof updateNote>[1] = {};
  if (typeof body.title === "string") updates.title = body.title;
  if (typeof body.content === "string") updates.content = body.content;
  if (Array.isArray(body.tags)) {
    updates.tags = body.tags.filter((tag): tag is string => typeof tag === "string");
  }
  const updated = await updateNote(noteId, updates);
  if (!updated) {
    return NextResponse.json(err("Note not found"), { status: 404 });
  }
  return NextResponse.json(ok(updated));
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { noteId } = await params;
  const deleted = await deleteNote(noteId);
  if (!deleted) {
    return NextResponse.json(err("Failed to delete note"), { status: 500 });
  }
  return NextResponse.json(ok({ deleted: true }));
}
