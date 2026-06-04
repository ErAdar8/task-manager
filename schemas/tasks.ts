import { z } from "zod";

export const taskStatusEnum = z.enum([
  "draft",
  "analyzing",
  "ready",
  "understanding",
  "architecture_ready",
  "in_progress",
  "completed",
]);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

export const taskIssueSchema = z.object({
  id: z.string(),
  what_went_wrong: z.string(),
  how_solved: z.string(),
  created_at: z.string(),
});
export type TaskIssue = z.infer<typeof taskIssueSchema>;

export const understandingStageSchema = z.object({
  title: z.string(),
  goal: z.string(),
  tasks: z.array(z.string()),
  completion_criteria: z.array(z.string()),
  /** From execute analysis: topic card summary for this stage (deduped from topic_cards). */
  topic_description: z.string().optional(),
  /** From execute analysis execution_plan.stage_number; used for UI checkbox keys. */
  stage_number: z.number().optional(),
});
export type UnderstandingStage = z.infer<typeof understandingStageSchema>;

export const taskUnderstandingSchema = z.object({
  high_level_goal: z.string(),
  why_this_matters: z.string(),
  major_steps: z.array(z.string()).default([]),
  key_concepts: z.array(z.string()).default([]),
  /** Optional for backward compatibility; prefer estimated_time. */
  estimated_complexity: z.enum(["simple", "medium", "complex"]).optional(),
  estimated_time: z.string().default(""),
  stages: z.array(understandingStageSchema).default([]),
});
export type TaskUnderstanding = z.infer<typeof taskUnderstandingSchema>;

export const conceptExplanationSchema = z.object({
  concept: z.string(),
  explanation: z.string(),
  context_in_task: z.string(),
});
export type ConceptExplanation = z.infer<typeof conceptExplanationSchema>;

export const fileModificationSchema = z.object({
  path: z.string(),
  changes_needed: z.string(),
});
export type FileModification = z.infer<typeof fileModificationSchema>;

export const taskArchitectureSchema = z.object({
  clarifications: z.array(conceptExplanationSchema).default([]),
  detailed_breakdown: z.string(),
  file_modifications: z.array(fileModificationSchema).default([]),
  testing_steps: z.array(z.string()).default([]),
  edge_cases: z.array(z.string()).default([]),
  estimated_time: z.string(),
});
export type TaskArchitecture = z.infer<typeof taskArchitectureSchema>;

export const learningSchema = z.object({
  id: z.string(),
  content: z.string(),
  /** Optional headline; synced from standalone store when present */
  title: z.string().optional(),
  category: z.string().optional(),
  /** Data URLs (data:image/...) for attached images */
  attachments: z.array(z.string()).default([]),
  created_at: z.string(),
});
export type Learning = z.infer<typeof learningSchema>;

export const taskSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  user_id: z.string(),
  title: z.string(),
  raw_input: z.string(),
  /** Data URLs for images attached to the card description (used in analysis) */
  card_description_images: z.array(z.string()).default([]),
  understanding: taskUnderstandingSchema.nullable(),
  understanding_approved: z.boolean().default(false),
  requested_clarifications: z.array(z.string()).default([]),
  user_edited_understanding: z.string().nullable().default(null),
  architecture: taskArchitectureSchema.nullable(),
  status: taskStatusEnum.default("draft"),
  task_notes: z.string().default(""),
  /** Data URLs for images attached to notes */
  task_notes_images: z.array(z.string()).default([]),
  cursor_repo_analysis: z.string().default(""),
  cursor_repo_scan: z.string().default(""),
  learnings: z.array(learningSchema).default([]),
  work_process: z.string().default(""),
  main_problem: z.string().default(""),
  key_concepts: z.array(conceptExplanationSchema).default([]),
  issues: z.array(taskIssueSchema).default([]),
  created_at: z.string(),
  updated_at: z.string(),
  completed_at: z.string().nullable().default(null),
  /** Set when analysis fails; cleared on next successful analysis. */
  analysis_error: z.string().nullable().default(null),
  /** Raw JSON from understanding-execution.md flow (canonical execute analysis). */
  canonical_execute_result: z.record(z.string(), z.unknown()).nullable().default(null),
  /** Raw JSON from understanding-learning.md flow (deep understanding). */
  canonical_understand_result: z.record(z.string(), z.unknown()).nullable().default(null),
  /** Raw JSON from understanding-testing.md flow (testing / evaluation plan). */
  canonical_testing_result: z.record(z.string(), z.unknown()).nullable().default(null),
  /** Raw JSON from qa-kalk.md / qa-general.md flows (QA test analysis). */
  canonical_qa_result: z.record(z.string(), z.unknown()).nullable().default(null),
  last_analysis_kind: z
    .enum(["execute", "understand", "testing_understand", "qa_general"])
    .nullable()
    .default(null),
  /** Preferred analysis flow chosen at creation (or updated on re-analyze). */
  analysis_mode: z
    .enum(["execute", "understand", "testing_understand", "qa_general"])
    .nullable()
    .optional(),
  /** True when we repaired truncated JSON and produced a partial analysis result. */
  analysis_partial: z.boolean().optional(),
});
export type Task = z.infer<typeof taskSchema>;

export const createTaskInputSchema = z.object({
  project_id: z.string(),
  user_id: z.string().default("local_user"),
  title: z.string().min(1),
  raw_input: z.string().min(1),
  cursor_repo_scan: z.string().optional(),
  /** Data URLs for images attached to the card description */
  card_description_images: z.array(z.string()).optional(),
  analysis_mode: z
    .enum(["execute", "understand", "testing_understand", "qa_general"])
    .optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export type TaskAnalysisMode = NonNullable<Task["analysis_mode"]>;
