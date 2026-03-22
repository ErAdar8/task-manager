import { z } from "zod";

export const learningSourceSchema = z.object({
  type: z.enum(["task", "general"]),
  taskId: z.string().optional(),
  taskTitle: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
});
export type LearningSource = z.infer<typeof learningSourceSchema>;

export const standaloneLearningSchema = z.object({
  id: z.string(),
  content: z.string(),
  title: z.string().optional(),
  category: z.string().optional(),
  attachments: z.array(z.string()).default([]),
  source: learningSourceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StandaloneLearning = z.infer<typeof standaloneLearningSchema>;

export const createStandaloneLearningInputSchema = z.object({
  content: z.string().min(1),
  title: z.string().optional(),
  category: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  source: learningSourceSchema,
});
export type CreateStandaloneLearningInput = z.infer<typeof createStandaloneLearningInputSchema>;
