import { z } from "zod";

export const courseSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  total_subtopics: z.number().default(0),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Course = z.infer<typeof courseSchema>;

export const createCourseInputSchema = z.object({
  user_id: z.string().optional().default("local_user"),
  name: z.string().min(1),
  description: z.string().optional(),
});
export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;
