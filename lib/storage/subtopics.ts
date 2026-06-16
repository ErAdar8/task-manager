import { subtopicSchema, type CreateSubtopicInput, type Subtopic } from "@/schemas/subtopics";
import { db } from "@/lib/storage/db";

function rowToSubtopic(row: Record<string, unknown>): Subtopic {
  return subtopicSchema.parse({
    id: row.id,
    course_id: row.course_id,
    topic_id: row.topic_id ?? undefined,
    user_id: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    sort_order: row.sort_order ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

export async function listSubtopicsByTopic(topicId: string): Promise<Subtopic[]> {
  const { data, error } = await db()
    .from("subtopics")
    .select("*")
    .eq("topic_id", topicId)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => rowToSubtopic(r as Record<string, unknown>));
}

export async function listSubtopicsByCourse(courseId: string): Promise<Subtopic[]> {
  const { data, error } = await db()
    .from("subtopics")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => rowToSubtopic(r as Record<string, unknown>));
}

export async function getSubtopic(subtopicId: string): Promise<Subtopic | null> {
  const { data, error } = await db().from("subtopics").select("*").eq("id", subtopicId).single();
  if (error || !data) return null;
  return rowToSubtopic(data as Record<string, unknown>);
}

export async function createSubtopic(input: CreateSubtopicInput): Promise<Subtopic> {
  const id = `subtopic_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const row = {
    id,
    course_id: input.course_id,
    topic_id: input.topic_id,
    user_id: input.user_id ?? "local_user",
    title: input.title,
    description: input.description ?? null,
    sort_order: input.sort_order ?? 0,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await db().from("subtopics").insert(row).select().single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create subtopic");
  return rowToSubtopic(data as Record<string, unknown>);
}

export async function updateSubtopic(
  subtopicId: string,
  updates: Partial<Pick<Subtopic, "title" | "description" | "sort_order">>
): Promise<Subtopic | null> {
  const { data, error } = await db()
    .from("subtopics")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", subtopicId)
    .select()
    .single();
  if (error || !data) return null;
  return rowToSubtopic(data as Record<string, unknown>);
}

export async function deleteSubtopic(subtopicId: string): Promise<boolean> {
  const { error } = await db().from("subtopics").delete().eq("id", subtopicId);
  return !error;
}
