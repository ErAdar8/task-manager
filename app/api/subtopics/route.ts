import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { listSubtopicsByCourse, createSubtopic } from "@/lib/storage/subtopics";
import { syncCourseSubtopicCount } from "@/lib/storage/courses";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const courseId = new URL(request.url).searchParams.get("courseId");
  if (!courseId) {
    return NextResponse.json(err("courseId query param is required"), { status: 400 });
  }
  const subtopics = await listSubtopicsByCourse(courseId);
  return NextResponse.json(ok(subtopics));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const courseId = typeof body.course_id === "string" ? body.course_id : "";
  if (!title || !courseId) {
    return NextResponse.json(err("title and course_id are required"), { status: 400 });
  }
  const subtopic = await createSubtopic({
    user_id: "local_user",
    course_id: courseId,
    title,
    description: typeof body.description === "string" ? body.description : undefined,
    sort_order: typeof body.sort_order === "number" ? body.sort_order : undefined,
  });
  await syncCourseSubtopicCount(courseId);
  return NextResponse.json(ok(subtopic));
}
