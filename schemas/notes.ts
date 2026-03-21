import { z } from "zod";

export const genericNoteSchema = z.object({
  id: z.string(),
  user_id: z.string().default("local_user"),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  created_at: z.string(),
  updated_at: z.string(),
});
export type GenericNote = z.infer<typeof genericNoteSchema>;

export const createGenericNoteInputSchema = z.object({
  user_id: z.string().default("local_user"),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
});
export type CreateGenericNoteInput = z.infer<typeof createGenericNoteInputSchema>;
