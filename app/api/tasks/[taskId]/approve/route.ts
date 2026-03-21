import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { generateTaskArchitecture } from "@/lib/claude/task-manager";
import { readTask, setTaskArchitecture, updateTask } from "@/lib/storage/tasks";
import { taskUnderstandingSchema } from "@/schemas/tasks";

type RouteParams = { params: Promise<{ taskId: string }> };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { taskId } = await params;
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 ARCHITECTURE GENERATION START");
    console.log("Task ID:", taskId);
    console.log("Clarifications:", []);

    const task = await readTask(taskId);
    if (!task) {
      return NextResponse.json(err("Task not found"), { status: 404 });
    }
    if (!task.understanding) {
      return NextResponse.json(err("Task understanding missing"), { status: 400 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      understanding_override?: unknown;
      cursor_repo_analysis?: unknown;
    };
    const understandingToUse = body.understanding_override
      ? taskUnderstandingSchema.parse(body.understanding_override)
      : task.understanding;

    const architecture = await generateTaskArchitecture(
      task.id,
      task.raw_input,
      understandingToUse,
      [],
      typeof body.cursor_repo_analysis === "string"
        ? body.cursor_repo_analysis
        : task.cursor_repo_analysis
    );
    console.log("✓ Architecture generated");
    console.log("Architecture keys:", Object.keys(architecture));

    await setTaskArchitecture(task.id, architecture);
    const updated = await updateTask(task.id, {
      understanding: understandingToUse,
      cursor_repo_analysis:
        typeof body.cursor_repo_analysis === "string"
          ? body.cursor_repo_analysis
          : task.cursor_repo_analysis,
      understanding_approved: true,
      requested_clarifications: [],
      status: "architecture_ready",
    });
    return NextResponse.json(ok(updated?.architecture ?? architecture));
  } catch (error) {
    console.error("❌ ARCHITECTURE GENERATION FAILED");
    console.error("Error:", error);
    console.error(
      "Stack:",
      error instanceof Error ? error.stack : "No stack trace available"
    );
    return NextResponse.json(
      {
        error: "Architecture generation failed",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
