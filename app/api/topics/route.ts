import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { listTopicsByCourse, createTopic } from "@/lib/storage/topics";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const courseId = new URL(request.url).searchParams.get("courseId");
  if (!courseId) {
    return NextResponse.json(err("courseId query param is required"), { status: 400 });
  }
  const topics = await listTopicsByCourse(courseId);
  return NextResponse.json(ok(topics));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const courseId = typeof body.course_id === "string" ? body.course_id : "";
  if (!title || !courseId) {
    return NextResponse.json(err("title and course_id are required"), { status: 400 });
  }
  const topic = await createTopic({
    course_id: courseId,
    user_id: "local_user",
    title,
    description: typeof body.description === "string" ? body.description : undefined,
    sort_order: typeof body.sort_order === "number" ? body.sort_order : undefined,
  });
  return NextResponse.json(ok(topic));
}
