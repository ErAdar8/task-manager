import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { readTask, setTaskArchitecture } from "@/lib/storage/tasks";
import { taskArchitectureSchema } from "@/schemas/tasks";

type RouteParams = { params: Promise<{ taskId: string }> };

/**
 * PATCH: Update task architecture (detailed_breakdown only).
 * Safe when empty — merges with existing architecture or creates minimal object
 * so existing consumers of task.architecture still get a full object.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { taskId } = await params;
  const task = await readTask(taskId);
  if (!task) {
    return NextResponse.json(err("Task not found"), { status: 404 });
  }

  let body: { detailed_breakdown?: string };
  try {
    body = (await request.json()) as { detailed_breakdown?: string };
  } catch {
    return NextResponse.json(err("Invalid JSON body"), { status: 400 });
  }

  const detailed_breakdown =
    typeof body.detailed_breakdown === "string" ? body.detailed_breakdown : "";

  const existing = task.architecture;
  const merged = taskArchitectureSchema.parse({
    clarifications: existing?.clarifications ?? [],
    detailed_breakdown,
    file_modifications: existing?.file_modifications ?? [],
    testing_steps: existing?.testing_steps ?? [],
    edge_cases: existing?.edge_cases ?? [],
    estimated_time: existing?.estimated_time ?? "",
  });

  const updated = await setTaskArchitecture(taskId, merged);
  if (!updated) {
    return NextResponse.json(err("Task not found"), { status: 404 });
  }
  return NextResponse.json(ok(updated));
}
