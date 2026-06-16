import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { getTopic, updateTopic, deleteTopic } from "@/lib/storage/topics";

type RouteParams = { params: Promise<{ topicId: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { topicId } = await params;
  const topic = await getTopic(topicId);
  if (!topic) return NextResponse.json(err("Topic not found"), { status: 404 });
  return NextResponse.json(ok(topic));
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { topicId } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") updates.title = body.title;
  if (typeof body.description === "string") updates.description = body.description;
  if (typeof body.sort_order === "number") updates.sort_order = body.sort_order;
  const updated = await updateTopic(topicId, updates as { title?: string; description?: string; sort_order?: number });
  if (!updated) return NextResponse.json(err("Topic not found"), { status: 404 });
  return NextResponse.json(ok(updated));
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { topicId } = await params;
  const topic = await getTopic(topicId);
  if (!topic) return NextResponse.json(err("Topic not found"), { status: 404 });
  const deleted = await deleteTopic(topicId);
  if (!deleted) return NextResponse.json(err("Failed to delete"), { status: 500 });
  return NextResponse.json(ok({ deleted: true }));
}
