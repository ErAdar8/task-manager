import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { completeTaskWithLearnings } from "@/lib/storage/learnings";
import { readTask } from "@/lib/storage/tasks";
import { syncProjectTaskCounts } from "@/lib/storage/projects";

type RouteParams = { params: Promise<{ taskId: string }> };

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { taskId } = await params;
  const task = await readTask(taskId);
  if (!task) {
    return NextResponse.json(err("Task not found"), { status: 404 });
  }
  const body = (await request.json()) as {
    learnings?: Array<{ content?: unknown; category?: unknown; attachments?: unknown }>;
  };
  const normalized = Array.isArray(body.learnings)
    ? body.learnings
        .filter((learning) => typeof learning?.content === "string" && learning.content.trim().length > 0)
        .map((learning) => ({
          content: learning.content as string,
          category: typeof learning.category === "string" ? learning.category : undefined,
          attachments:
            Array.isArray(learning.attachments) && learning.attachments.every((s) => typeof s === "string")
              ? (learning.attachments as string[])
              : [],
        }))
    : [];

  const updated = await completeTaskWithLearnings(taskId, normalized);
  if (!updated) {
    return NextResponse.json(err("Failed to complete task"), { status: 500 });
  }
  await syncProjectTaskCounts(task.project_id);
  return NextResponse.json(ok(updated));
}
