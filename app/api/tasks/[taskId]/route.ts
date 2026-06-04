import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { deleteTask, readTask, updateTask } from "@/lib/storage/tasks";
import { syncProjectTaskCounts } from "@/lib/storage/projects";

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
  return NextResponse.json(ok(task));
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { taskId } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const updates: Parameters<typeof updateTask>[1] = {};
  if (typeof body.title === "string") updates.title = body.title;
  if (typeof body.raw_input === "string") updates.raw_input = body.raw_input;
  if (typeof body.task_notes === "string") updates.task_notes = body.task_notes;
  if (typeof body.cursor_repo_analysis === "string") {
    updates.cursor_repo_analysis = body.cursor_repo_analysis;
  }
  if (typeof body.cursor_repo_scan === "string") {
    updates.cursor_repo_scan = body.cursor_repo_scan;
  }
  if (typeof body.work_process === "string") {
    updates.work_process = body.work_process;
  }
  if (typeof body.main_problem === "string") {
    updates.main_problem = body.main_problem;
  }
  if (
    body.status === "draft" ||
    body.status === "analyzing" ||
    body.status === "ready" ||
    body.status === "understanding" ||
    body.status === "architecture_ready" ||
    body.status === "in_progress" ||
    body.status === "completed"
  ) {
    updates.status = body.status;
  }
  if (Array.isArray(body.issues)) {
    updates.issues = body.issues;
  }
  if (Array.isArray(body.card_description_images) && body.card_description_images.every((s: unknown) => typeof s === "string")) {
    updates.card_description_images = body.card_description_images as string[];
  }
  if (Array.isArray(body.task_notes_images) && body.task_notes_images.every((s: unknown) => typeof s === "string")) {
    updates.task_notes_images = body.task_notes_images as string[];
  }
  if (
    body.analysis_mode === "execute" ||
    body.analysis_mode === "understand" ||
    body.analysis_mode === "testing_understand" ||
    body.analysis_mode === "qa_general"
  ) {
    updates.analysis_mode = body.analysis_mode;
  }
  if (typeof body.analysis_partial === "boolean") {
    updates.analysis_partial = body.analysis_partial;
  }
  const updated = await updateTask(taskId, updates);
  if (!updated) {
    return NextResponse.json(err("Task not found"), { status: 404 });
  }
  await syncProjectTaskCounts(updated.project_id);
  return NextResponse.json(ok(updated));
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { taskId } = await params;
  const task = await readTask(taskId);
  if (!task) {
    return NextResponse.json(err("Task not found"), { status: 404 });
  }
  const deleted = await deleteTask(taskId);
  if (!deleted) {
    return NextResponse.json(err("Failed to delete task"), { status: 500 });
  }
  await syncProjectTaskCounts(task.project_id);
  return NextResponse.json(ok({ deleted: true }));
}
