import { z } from "zod";

export const topicSchema = z.object({
  id: z.string(),
  course_id: z.string(),
  user_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  sort_order: z.number().default(0),
  total_subtopics: z.number().default(0),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Topic = z.infer<typeof topicSchema>;

export const createTopicInputSchema = z.object({
  course_id: z.string(),
  user_id: z.string().optional().default("local_user"),
  title: z.string().min(1),
  description: z.string().optional(),
  sort_order: z.number().optional(),
});
export type CreateTopicInput = z.infer<typeof createTopicInputSchema>;
