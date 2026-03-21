import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject, deleteProject } from "@/lib/storage/projects";
import { ok, err } from "@/lib/api-types";
import { log } from "@/lib/logger";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const start = Date.now();
  const { id } = await params;
  try {
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(err("Project not found"), { status: 404 });
    }
    await log({
      timestamp: new Date().toISOString(),
      level: "info",
      route: "GET /api/projects/[id]",
      project_id: id,
      duration_ms: Date.now() - start,
      status: "ok",
    });
    return NextResponse.json(ok(project));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await log({
      timestamp: new Date().toISOString(),
      level: "error",
      route: "GET /api/projects/[id]",
      project_id: id,
      duration_ms: Date.now() - start,
      status: "error",
      message,
    });
    return NextResponse.json(err(message), { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const start = Date.now();
  const { id } = await params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const updates: Parameters<typeof updateProject>[1] = {};
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name;
    if (typeof body.description === "string") updates.description = body.description;
    if (typeof body.repo_scan === "string") updates.repo_scan = body.repo_scan;

    const project = await updateProject(id, updates);
    if (!project) {
      return NextResponse.json(err("Project not found"), { status: 404 });
    }
    await log({
      timestamp: new Date().toISOString(),
      level: "info",
      route: "PATCH /api/projects/[id]",
      project_id: id,
      duration_ms: Date.now() - start,
      status: "ok",
    });
    return NextResponse.json(ok(project));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await log({
      timestamp: new Date().toISOString(),
      level: "error",
      route: "PATCH /api/projects/[id]",
      project_id: id,
      duration_ms: Date.now() - start,
      status: "error",
      message,
    });
    return NextResponse.json(err(message), { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const start = Date.now();
  const { id } = await params;
  try {
    const deleted = await deleteProject(id);
    if (!deleted) {
      return NextResponse.json(err("Project not found"), { status: 404 });
    }
    await log({
      timestamp: new Date().toISOString(),
      level: "info",
      route: "DELETE /api/projects/[id]",
      project_id: id,
      duration_ms: Date.now() - start,
      status: "ok",
    });
    return NextResponse.json(ok({ deleted: true }));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await log({
      timestamp: new Date().toISOString(),
      level: "error",
      route: "DELETE /api/projects/[id]",
      project_id: id,
      duration_ms: Date.now() - start,
      status: "error",
      message,
    });
    return NextResponse.json(err(message), { status: 500 });
  }
}
