import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { moveNoteToLearning } from "@/lib/storage/learnings";
import { readNote } from "@/lib/storage/notes";

type RouteParams = { params: Promise<{ noteId: string }> };

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { noteId } = await params;
  const note = await readNote(noteId);
  if (!note) {
    return NextResponse.json(err("Note not found"), { status: 404 });
  }
  const body = (await request.json()) as { target?: unknown };
  if (body.target !== "learning") {
    return NextResponse.json(err("Invalid target"), { status: 400 });
  }
  const created = await moveNoteToLearning(noteId);
  if (!created) {
    return NextResponse.json(err("Move failed"), { status: 500 });
  }
  return NextResponse.json(ok(created));
}
