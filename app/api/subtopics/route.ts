import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { listSubtopicsByTopic, listSubtopicsByCourse, createSubtopic } from "@/lib/storage/subtopics";
import { syncTopicSubtopicCount } from "@/lib/storage/topics";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get("topicId");
  const courseId = searchParams.get("courseId");

  if (topicId) {
    const subtopics = await listSubtopicsByTopic(topicId);
    return NextResponse.json(ok(subtopics));
  }
  if (courseId) {
    const subtopics = await listSubtopicsByCourse(courseId);
    return NextResponse.json(ok(subtopics));
  }
  return NextResponse.json(err("topicId or courseId query param is required"), { status: 400 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const courseId = typeof body.course_id === "string" ? body.course_id : "";
  const topicId = typeof body.topic_id === "string" ? body.topic_id : "";
  if (!title || !courseId || !topicId) {
    return NextResponse.json(err("title, course_id, and topic_id are required"), { status: 400 });
  }
  const subtopic = await createSubtopic({
    course_id: courseId,
    topic_id: topicId,
    user_id: "local_user",
    title,
    description: typeof body.description === "string" ? body.description : undefined,
    sort_order: typeof body.sort_order === "number" ? body.sort_order : undefined,
  });
  await syncTopicSubtopicCount(topicId);
  return NextResponse.json(ok(subtopic));
}
