import { z } from "zod";

export const cardTypeEnum = z.enum(["note", "learning", "flow", "image"]);
export type CardType = z.infer<typeof cardTypeEnum>;

export const learningSourceSchema = z.object({
  type: z.enum(["task", "general", "subtopic"]),
  taskId: z.string().optional(),
  taskTitle: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  topicId: z.string().optional(),
  topicTitle: z.string().optional(),
  subtopicId: z.string().optional(),
  subtopicTitle: z.string().optional(),
  courseId: z.string().optional(),
  courseName: z.string().optional(),
});
export type LearningSource = z.infer<typeof learningSourceSchema>;

export const standaloneLearningSchema = z.object({
  id: z.string(),
  content: z.string(),
  title: z.string().optional(),
  category: z.string().optional(),
  cardType: cardTypeEnum.default("note"),
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
  cardType: cardTypeEnum.optional(),
  attachments: z.array(z.string()).optional(),
  source: learningSourceSchema,
});
export type CreateStandaloneLearningInput = z.infer<typeof createStandaloneLearningInputSchema>;
