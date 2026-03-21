import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { createNote, listNotes } from "@/lib/storage/notes";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = request.nextUrl.searchParams.get("userId") ?? "local_user";
  const notes = await listNotes(userId);
  return NextResponse.json(ok(notes));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      user_id?: unknown;
      title?: unknown;
      content?: unknown;
      tags?: unknown;
    };
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json(err("title required"), { status: 400 });
    }
    if (typeof body.content !== "string" || body.content.trim().length === 0) {
      return NextResponse.json(err("content required"), { status: 400 });
    }
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((tag): tag is string => typeof tag === "string")
      : [];
    const note = await createNote({
      user_id: typeof body.user_id === "string" ? body.user_id : "local_user",
      title: body.title.trim(),
      content: body.content,
      tags,
    });
    return NextResponse.json(ok(note));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(err(message), { status: 500 });
  }
}
