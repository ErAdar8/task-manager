import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { addTaskLearning, readTask } from "@/lib/storage/tasks";

type RouteParams = { params: Promise<{ taskId: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { taskId } = await params;
  const task = await readTask(taskId);
  if (!task) {
    return NextResponse.json(err("Task not found"), { status: 404 });
  }
  return NextResponse.json(ok(task.learnings));
}

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
    content?: unknown;
    category?: unknown;
    attachments?: unknown;
  };
  if (typeof body.content !== "string" || body.content.trim().length === 0) {
    return NextResponse.json(err("content is required"), { status: 400 });
  }

  const attachments =
    Array.isArray(body.attachments) && body.attachments.every((s) => typeof s === "string")
      ? (body.attachments as string[])
      : [];

  const updated = await addTaskLearning(taskId, {
    content: body.content.trim(),
    category:
      typeof body.category === "string" && body.category.trim().length > 0
        ? body.category.trim()
        : undefined,
    attachments,
  });
  if (!updated) {
    return NextResponse.json(err("Failed to add learning"), { status: 500 });
  }
  return NextResponse.json(ok(updated));
}
