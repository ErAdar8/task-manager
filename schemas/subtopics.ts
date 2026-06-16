import { z } from "zod";

export const cardTypeEnum = z.enum(["note", "learning", "flow", "image"]);
export type CardType = z.infer<typeof cardTypeEnum>;

export const subtopicSchema = z.object({
  id: z.string(),
  course_id: z.string(),
  user_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  sort_order: z.number().default(0),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Subtopic = z.infer<typeof subtopicSchema>;

export const createSubtopicInputSchema = z.object({
  course_id: z.string(),
  user_id: z.string().optional().default("local_user"),
  title: z.string().min(1),
  description: z.string().optional(),
  sort_order: z.number().optional(),
});
export type CreateSubtopicInput = z.infer<typeof createSubtopicInputSchema>;
