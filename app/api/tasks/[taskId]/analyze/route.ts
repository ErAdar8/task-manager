import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { generateTaskUnderstanding } from "@/lib/claude/task-manager";
import { readTask, setTaskUnderstanding, updateTask } from "@/lib/storage/tasks";

type RouteParams = { params: Promise<{ taskId: string }> };

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { taskId } = await params;
    const task = await readTask(taskId);
    if (!task) {
      return NextResponse.json(err("Task not found"), { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      cursor_repo_scan?: unknown;
    };
    const cursorRepoScan =
      typeof body.cursor_repo_scan === "string"
        ? body.cursor_repo_scan
        : task.cursor_repo_scan;
    if (typeof body.cursor_repo_scan === "string") {
      await updateTask(task.id, { cursor_repo_scan: body.cursor_repo_scan });
    }
    const understanding = await generateTaskUnderstanding(
      task.id,
      task.raw_input,
      cursorRepoScan
    );
    await setTaskUnderstanding(task.id, understanding);
    const updatedTask = await updateTask(task.id, { status: "understanding" });
    return NextResponse.json(ok(updatedTask ?? task));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(err(message), { status: 500 });
  }
}
