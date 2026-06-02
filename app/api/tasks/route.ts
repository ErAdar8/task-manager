import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { createTaskInputSchema } from "@/schemas/tasks";
import {
  createTask,
  listTasksByProject,
  updateTask,
} from "@/lib/storage/tasks";
import { syncProjectTaskCounts } from "@/lib/storage/projects";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(err("projectId required"), { status: 400 });
  }
  try {
    const tasks = await listTasksByProject(projectId);
    return NextResponse.json(ok(tasks));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/tasks] error:", message);
    return NextResponse.json(err(message), { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as unknown;
    const parsed = createTaskInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(err(parsed.error.message), { status: 400 });
    }
    const cardDescriptionImages =
      Array.isArray((body as { card_description_images?: unknown }).card_description_images) &&
      (body as { card_description_images: string[] }).card_description_images.every((s) => typeof s === "string")
        ? (body as { card_description_images: string[] }).card_description_images
        : undefined;
    const cursorRepoScan =
      typeof body === "object" &&
      body !== null &&
      "cursor_repo_scan" in body &&
      typeof (body as { cursor_repo_scan?: unknown }).cursor_repo_scan === "string"
        ? ((body as { cursor_repo_scan?: string }).cursor_repo_scan ?? "")
        : "";

    const task = await createTask({
      ...parsed.data,
      ...(cardDescriptionImages != null && { card_description_images: cardDescriptionImages }),
    });
    const updates: { cursor_repo_scan?: string } = {};
    if (cursorRepoScan.trim().length > 0) {
      updates.cursor_repo_scan = cursorRepoScan;
    }
    const updatedTask =
      Object.keys(updates).length > 0
        ? (await updateTask(task.id, updates)) ?? task
        : task;
    await syncProjectTaskCounts(updatedTask.project_id);
    return NextResponse.json(ok({ task: updatedTask }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(err(message), { status: 500 });
  }
}
