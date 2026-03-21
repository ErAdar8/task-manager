import { z } from "zod";

export const projectSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  /** Project-level Cursor repo scan; used by all task analyses in this project */
  repo_scan: z.string().default(""),
  total_tasks: z.number().default(0),
  completed_tasks: z.number().default(0),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Project = z.infer<typeof projectSchema>;

export const projectsFileSchema = z.array(projectSchema);
export type ProjectsFile = z.infer<typeof projectsFileSchema>;

export const createProjectInputSchema = z.object({
  user_id: z.string().default("local_user"),
  name: z.string().min(1),
  description: z.string().optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
