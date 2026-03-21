import { NextRequest, NextResponse } from "next/server";
import { readProjects, createProject } from "@/lib/storage/projects";
import { createProjectInputSchema } from "@/schemas/projects";
import { ok, err } from "@/lib/api-types";
import { log } from "@/lib/logger";

export async function GET(): Promise<NextResponse> {
  const start = Date.now();
  try {
    const projects = await readProjects();
    await log({
      timestamp: new Date().toISOString(),
      level: "info",
      route: "GET /api/projects",
      duration_ms: Date.now() - start,
      status: "ok",
    });
    return NextResponse.json(ok(projects));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await log({
      timestamp: new Date().toISOString(),
      level: "error",
      route: "GET /api/projects",
      duration_ms: Date.now() - start,
      status: "error",
      message,
    });
    return NextResponse.json(err(message), { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  try {
    const body = (await request.json()) as unknown;
    const parsed = createProjectInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(err(parsed.error.message), { status: 400 });
    }
    const project = await createProject(parsed.data);
    await log({
      timestamp: new Date().toISOString(),
      level: "info",
      route: "POST /api/projects",
      duration_ms: Date.now() - start,
      status: "ok",
    });
    return NextResponse.json(ok(project));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await log({
      timestamp: new Date().toISOString(),
      level: "error",
      route: "POST /api/projects",
      duration_ms: Date.now() - start,
      status: "error",
      message,
    });
    return NextResponse.json(err(message), { status: 500 });
  }
}
