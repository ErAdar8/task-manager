import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { getSubtopic, updateSubtopic, deleteSubtopic } from "@/lib/storage/subtopics";
import { syncCourseSubtopicCount } from "@/lib/storage/courses";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const subtopic = await getSubtopic(id);
  if (!subtopic) return NextResponse.json(err("Subtopic not found"), { status: 404 });
  return NextResponse.json(ok(subtopic));
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") updates.title = body.title;
  if (typeof body.description === "string") updates.description = body.description;
  if (typeof body.sort_order === "number") updates.sort_order = body.sort_order;
  const updated = await updateSubtopic(id, updates as { title?: string; description?: string; sort_order?: number });
  if (!updated) return NextResponse.json(err("Subtopic not found"), { status: 404 });
  return NextResponse.json(ok(updated));
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const subtopic = await getSubtopic(id);
  if (!subtopic) return NextResponse.json(err("Subtopic not found"), { status: 404 });
  const deleted = await deleteSubtopic(id);
  if (!deleted) return NextResponse.json(err("Failed to delete"), { status: 500 });
  await syncCourseSubtopicCount(subtopic.course_id);
  return NextResponse.json(ok({ deleted: true }));
}
