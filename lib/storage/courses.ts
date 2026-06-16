import { courseSchema, type CreateCourseInput, type Course } from "@/schemas/courses";
import { db } from "@/lib/storage/db";

function rowToCourse(row: Record<string, unknown>): Course {
  return courseSchema.parse({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    description: row.description ?? undefined,
    total_subtopics: row.total_subtopics ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

export async function listCourses(): Promise<Course[]> {
  const { data, error } = await db()
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => rowToCourse(r as Record<string, unknown>));
}

export async function getCourse(courseId: string): Promise<Course | null> {
  const { data, error } = await db()
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();
  if (error || !data) return null;
  return rowToCourse(data as Record<string, unknown>);
}

export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const id = `course_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const row = {
    id,
    user_id: input.user_id ?? "local_user",
    name: input.name,
    description: input.description ?? null,
    total_subtopics: 0,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await db().from("courses").insert(row).select().single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create course");
  return rowToCourse(data as Record<string, unknown>);
}

export async function updateCourse(
  courseId: string,
  updates: Partial<Pick<Course, "name" | "description">>
): Promise<Course | null> {
  const { data, error } = await db()
    .from("courses")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", courseId)
    .select()
    .single();
  if (error || !data) return null;
  return rowToCourse(data as Record<string, unknown>);
}

export async function deleteCourse(courseId: string): Promise<boolean> {
  const { error } = await db().from("courses").delete().eq("id", courseId);
  return !error;
}

export async function syncCourseSubtopicCount(courseId: string): Promise<Course | null> {
  const { data: rows } = await db()
    .from("subtopics")
    .select("id")
    .eq("course_id", courseId);
  const total = rows?.length ?? 0;
  const { data, error } = await db()
    .from("courses")
    .update({ total_subtopics: total, updated_at: new Date().toISOString() })
    .eq("id", courseId)
    .select()
    .single();
  if (error || !data) return null;
  return rowToCourse(data as Record<string, unknown>);
}
