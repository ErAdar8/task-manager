import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import {
  deleteLearningFromTask,
  readLearning,
  updateLearningOnTask,
} from "@/lib/storage/learnings";
import { readTask } from "@/lib/storage/tasks";

type RouteParams = { params: Promise<{ taskId: string; learningId: string }> };

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { taskId, learningId } = await params;
  const task = await readTask(taskId);
  if (!task) {
    return NextResponse.json(err("Task not found"), { status: 404 });
  }
  const learning = task.learnings.find((l) => l.id === learningId);
  if (!learning) {
    return NextResponse.json(err("Learning not found"), { status: 404 });
  }
  const standalone = await readLearning(learningId);
  if (!standalone) {
    return NextResponse.json(err("Learning not found"), { status: 404 });
  }

  const body = (await request.json()) as {
    content?: unknown;
    category?: unknown;
    attachments?: unknown;
    title?: unknown;
  };
  const updates: Parameters<typeof updateLearningOnTask>[2] = {};
  if (typeof body.content === "string") updates.content = body.content.trim();
  if (body.category !== undefined) {
    updates.category =
      typeof body.category === "string" && body.category.trim().length > 0
        ? body.category.trim()
        : "";
  }
  if (Array.isArray(body.attachments) && body.attachments.every((s) => typeof s === "string")) {
    updates.attachments = body.attachments as string[];
  }
  if (body.title !== undefined) {
    updates.title = typeof body.title === "string" ? body.title : undefined;
  }

  const updated = await updateLearningOnTask(taskId, learningId, updates);
  if (!updated) {
    return NextResponse.json(err("Failed to update learning"), { status: 500 });
  }
  return NextResponse.json(ok(updated));
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { taskId, learningId } = await params;
  const task = await readTask(taskId);
  if (!task) {
    return NextResponse.json(err("Task not found"), { status: 404 });
  }
  const learning = task.learnings.find((l) => l.id === learningId);
  if (!learning) {
    return NextResponse.json(err("Learning not found"), { status: 404 });
  }

  const updated = await deleteLearningFromTask(taskId, learningId);
  if (!updated) {
    return NextResponse.json(err("Failed to delete learning"), { status: 500 });
  }
  return NextResponse.json(ok(updated));
}
