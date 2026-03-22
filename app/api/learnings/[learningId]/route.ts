import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import {
  deleteLearningEverywhere,
  readLearning,
  updateLearning,
} from "@/lib/storage/learnings";

type RouteParams = { params: Promise<{ learningId: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { learningId } = await params;
  const learning = await readLearning(learningId);
  if (!learning) {
    return NextResponse.json(err("Learning not found"), { status: 404 });
  }
  return NextResponse.json(ok(learning));
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { learningId } = await params;
  const learning = await readLearning(learningId);
  if (!learning) {
    return NextResponse.json(err("Learning not found"), { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const updates: Parameters<typeof updateLearning>[1] = {};
  if (typeof body.content === "string") updates.content = body.content;
  if (body.title !== undefined) {
    updates.title = typeof body.title === "string" ? body.title : undefined;
  }
  if (body.category !== undefined) {
    updates.category = typeof body.category === "string" ? body.category : undefined;
  }
  if (Array.isArray(body.attachments) && body.attachments.every((s) => typeof s === "string")) {
    updates.attachments = body.attachments as string[];
  }

  const updated = await updateLearning(learningId, updates);
  if (!updated) {
    return NextResponse.json(err("Failed to update"), { status: 500 });
  }
  return NextResponse.json(ok(updated));
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { learningId } = await params;
  const learning = await readLearning(learningId);
  if (!learning) {
    return NextResponse.json(err("Learning not found"), { status: 404 });
  }
  const okDel = await deleteLearningEverywhere(learningId);
  if (!okDel) {
    return NextResponse.json(err("Failed to delete"), { status: 500 });
  }
  return NextResponse.json(ok({ deleted: true }));
}
