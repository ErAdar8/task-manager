import { NextRequest, NextResponse } from "next/server";
import { ok } from "@/lib/api-types";
import { listTasksByProject } from "@/lib/storage/tasks";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const tasks = await listTasksByProject(id);
  const withLearnings = tasks.filter((task) => task.learnings.length > 0);
  const grouped = withLearnings.map((task) => ({
    task_id: task.id,
    task_title: task.title,
    completed_at: task.completed_at,
    learnings: task.learnings,
  }));
  return NextResponse.json(ok(grouped));
}
