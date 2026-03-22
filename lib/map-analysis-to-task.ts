import type { ConceptExplanation } from "@/schemas/tasks";
import { taskUnderstandingSchema, type TaskUnderstanding } from "@/schemas/tasks";

type ExecuteTopicCard = {
  id?: string;
  title?: string;
  description?: string;
};

type ExecutePlanItem = {
  topic_card_id?: string;
  stage_title?: string;
  mini_prompt?: string;
};

type ExecuteKeyConcept = {
  term?: string;
  explanation?: string;
  relevance?: string;
};

/**
 * Maps canonical "execute" analysis JSON into existing TaskUnderstanding + key_concepts for UI compatibility.
 */
export function mapExecuteJsonToUnderstanding(
  raw: Record<string, unknown>
): { understanding: TaskUnderstanding; key_concepts: ConceptExplanation[] } {
  const topicCards = (Array.isArray(raw.topic_cards) ? raw.topic_cards : []) as ExecuteTopicCard[];
  const executionPlan = (Array.isArray(raw.execution_plan) ? raw.execution_plan : []) as ExecutePlanItem[];
  const keyConceptsRaw = (Array.isArray(raw.key_concepts) ? raw.key_concepts : []) as ExecuteKeyConcept[];

  const topicById = new Map<string, ExecuteTopicCard>();
  for (const tc of topicCards) {
    if (typeof tc.id === "string") topicById.set(tc.id, tc);
  }

  const high =
    typeof raw.high_level_goal === "string" ? raw.high_level_goal : String(raw.high_level_goal ?? "");

  const why =
    topicCards[0]?.description && typeof topicCards[0].description === "string"
      ? topicCards[0].description
      : "";

  const major_steps =
    executionPlan.length > 0
      ? executionPlan.map((e) => e.stage_title ?? "").filter(Boolean)
      : topicCards.map((t) => t.title ?? "").filter(Boolean);

  const stages = executionPlan.map((e) => {
    const topic = e.topic_card_id ? topicById.get(e.topic_card_id) : undefined;
    return {
      title: e.stage_title ?? topic?.title ?? "Stage",
      goal: topic?.description ?? "",
      tasks: e.mini_prompt ? [e.mini_prompt] : [],
      completion_criteria: [] as string[],
    };
  });

  const understanding = taskUnderstandingSchema.parse({
    high_level_goal: high,
    why_this_matters: why,
    major_steps,
    key_concepts: keyConceptsRaw.map((k) => k.term ?? "").filter(Boolean),
    estimated_time: "",
    stages,
  });

  const key_concepts: ConceptExplanation[] = keyConceptsRaw.map((k) => ({
    concept: k.term ?? "Concept",
    explanation: k.explanation ?? "",
    context_in_task: k.relevance ?? "",
  }));

  return { understanding, key_concepts };
}

/**
 * Minimal mapping from "understand" JSON into TaskUnderstanding for summary display.
 */
export function mapUnderstandJsonToUnderstanding(
  raw: Record<string, unknown>
): TaskUnderstanding {
  const high =
    typeof raw.high_level_goal === "string" ? raw.high_level_goal : String(raw.high_level_goal ?? "");
  const topicCards = (Array.isArray(raw.topic_cards) ? raw.topic_cards : []) as Array<{
    title?: string;
    description?: string;
  }>;

  const firstDesc =
    topicCards[0]?.description && typeof topicCards[0].description === "string"
      ? topicCards[0].description
      : "";

  return taskUnderstandingSchema.parse({
    high_level_goal: high,
    why_this_matters: firstDesc,
    major_steps: topicCards.map((t) => t.title ?? "").filter(Boolean),
    key_concepts: [],
    estimated_time: "",
    stages: [],
  });
}

export function mapUnderstandJsonToKeyConcepts(raw: Record<string, unknown>): ConceptExplanation[] {
  const kc = (Array.isArray(raw.key_concepts) ? raw.key_concepts : []) as Array<{
    term?: string;
    explanation?: string;
    example_in_codebase?: string;
    relevance?: string;
  }>;
  return kc.map((k) => ({
    concept: k.term ?? "Concept",
    explanation: k.explanation ?? "",
    context_in_task: [k.example_in_codebase, k.relevance].filter(Boolean).join(" — ") || "",
  }));
}
