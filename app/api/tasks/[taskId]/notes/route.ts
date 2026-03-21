import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { updateTask } from "@/lib/storage/tasks";

type RouteParams = { params: Promise<{ taskId: string }> };

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { taskId } = await params;
  const body = (await request.json()) as { task_notes?: unknown; task_notes_images?: unknown };
  if (typeof body.task_notes !== "string") {
    return NextResponse.json(err("task_notes must be a string"), { status: 400 });
  }
  const task_notes_images =
    Array.isArray(body.task_notes_images) && body.task_notes_images.every((s) => typeof s === "string")
      ? (body.task_notes_images as string[])
      : undefined;
  const task = await updateTask(taskId, {
    task_notes: body.task_notes,
    ...(task_notes_images !== undefined && { task_notes_images }),
  });
  if (!task) {
    return NextResponse.json(err("Task not found"), { status: 404 });
  }
  return NextResponse.json(ok(task));
}
