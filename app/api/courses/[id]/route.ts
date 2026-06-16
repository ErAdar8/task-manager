import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { getCourse, updateCourse, deleteCourse } from "@/lib/storage/courses";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) return NextResponse.json(err("Course not found"), { status: 404 });
  return NextResponse.json(ok(course));
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name;
  if (typeof body.description === "string") updates.description = body.description;
  const updated = await updateCourse(id, updates as { name?: string; description?: string });
  if (!updated) return NextResponse.json(err("Course not found"), { status: 404 });
  return NextResponse.json(ok(updated));
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const deleted = await deleteCourse(id);
  if (!deleted) return NextResponse.json(err("Failed to delete"), { status: 500 });
  return NextResponse.json(ok({ deleted: true }));
}
