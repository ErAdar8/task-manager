import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { listCourses, createCourse } from "@/lib/storage/courses";

export async function GET(): Promise<NextResponse> {
  const courses = await listCourses();
  return NextResponse.json(ok(courses));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(err("name is required"), { status: 400 });
  }
  const course = await createCourse({
    user_id: "local_user",
    name,
    description: typeof body.description === "string" ? body.description : undefined,
  });
  return NextResponse.json(ok(course));
}
