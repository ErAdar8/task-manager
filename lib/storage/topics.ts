import { topicSchema, type CreateTopicInput, type Topic } from "@/schemas/topics";
import { db } from "@/lib/storage/db";

function rowToTopic(row: Record<string, unknown>): Topic {
  return topicSchema.parse({
    id: row.id,
    course_id: row.course_id,
    user_id: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    sort_order: row.sort_order ?? 0,
    total_subtopics: row.total_subtopics ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

export async function listTopicsByCourse(courseId: string): Promise<Topic[]> {
  const { data, error } = await db()
    .from("topics")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => rowToTopic(r as Record<string, unknown>));
}

export async function getTopic(topicId: string): Promise<Topic | null> {
  const { data, error } = await db().from("topics").select("*").eq("id", topicId).single();
  if (error || !data) return null;
  return rowToTopic(data as Record<string, unknown>);
}

export async function createTopic(input: CreateTopicInput): Promise<Topic> {
  const id = `topic_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const row = {
    id,
    course_id: input.course_id,
    user_id: input.user_id ?? "local_user",
    title: input.title,
    description: input.description ?? null,
    sort_order: input.sort_order ?? 0,
    total_subtopics: 0,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await db().from("topics").insert(row).select().single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create topic");
  return rowToTopic(data as Record<string, unknown>);
}

export async function updateTopic(
  topicId: string,
  updates: Partial<Pick<Topic, "title" | "description" | "sort_order">>
): Promise<Topic | null> {
  const { data, error } = await db()
    .from("topics")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", topicId)
    .select()
    .single();
  if (error || !data) return null;
  return rowToTopic(data as Record<string, unknown>);
}

export async function deleteTopic(topicId: string): Promise<boolean> {
  const { error } = await db().from("topics").delete().eq("id", topicId);
  return !error;
}

export async function syncTopicSubtopicCount(topicId: string): Promise<void> {
  const { count } = await db()
    .from("subtopics")
    .select("id", { count: "exact", head: true })
    .eq("topic_id", topicId);
  await db()
    .from("topics")
    .update({ total_subtopics: count ?? 0, updated_at: new Date().toISOString() })
    .eq("id", topicId);
}
