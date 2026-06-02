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
  stage_number?: number;
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

  const stages = executionPlan.map((e, index) => {
    const topic = e.topic_card_id ? topicById.get(e.topic_card_id) : undefined;
    const topicDesc = typeof topic?.description === "string" ? topic.description : "";
    const stageNum = typeof e.stage_number === "number" ? e.stage_number : index + 1;
    return {
      title: e.stage_title ?? topic?.title ?? "Stage",
      goal: topicDesc,
      tasks: e.mini_prompt ? [e.mini_prompt] : [],
      completion_criteria: [] as string[],
      topic_description: topicDesc || undefined,
      stage_number: stageNum,
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

type TestingScenario = {
  title?: string;
  purpose?: string;
  inputs?: Array<{ label?: string; content?: string; input_type?: string }>;
  steps?: string[];
  expected_outcomes?: string[];
  failure_signals?: string[];
};

type TestingAxis = {
  metric?: string;
  how_to_measure?: string;
  success_signal?: string;
};

/**
 * Maps canonical testing JSON into TaskUnderstanding + key_concepts (no mini-prompts).
 */
export function mapTestingJsonToUnderstanding(
  raw: Record<string, unknown>
): { understanding: TaskUnderstanding; key_concepts: ConceptExplanation[] } {
  const high =
    typeof raw.high_level_goal === "string" ? raw.high_level_goal : String(raw.high_level_goal ?? "");

  const sut = raw.system_under_test as Record<string, unknown> | undefined;
  const scope = typeof sut?.scope === "string" ? sut.scope : "";
  const sutName = typeof sut?.name === "string" ? sut.name : "";
  const whyParts = [sutName && `Under test: ${sutName}`, scope].filter(Boolean);
  const goals = (Array.isArray(raw.testing_goals) ? raw.testing_goals : []) as Array<{
    goal?: string;
    why_it_matters?: string;
  }>;
  const goalLine =
    goals[0]?.goal && typeof goals[0].goal === "string"
      ? `${goals[0].goal}${goals[0].why_it_matters ? ` — ${goals[0].why_it_matters}` : ""}`
      : "";
  const why_this_matters = [whyParts.join(". "), goalLine].filter(Boolean).join("\n\n") || scope;

  const scenarios = (Array.isArray(raw.test_scenarios) ? raw.test_scenarios : []) as TestingScenario[];
  const checklist = (Array.isArray(raw.execution_checklist) ? raw.execution_checklist : []) as string[];

  const major_steps =
    scenarios.length > 0
      ? scenarios.map((s) => s.title ?? "").filter(Boolean)
      : checklist.length > 0
        ? checklist
        : goals.map((g) => g.goal ?? "").filter(Boolean);

  const stages = scenarios.map((s) => {
    const inputLines =
      (s.inputs ?? []).map((inp) => {
        const label = inp.label?.trim();
        const t = inp.input_type?.trim();
        const head = [label, t].filter(Boolean).join(" — ");
        const body = typeof inp.content === "string" ? inp.content : "";
        return head ? `${head}: ${body}` : body;
      }) ?? [];
    const tasks = [
      ...(s.purpose ? [`Purpose: ${s.purpose}`] : []),
      ...inputLines.map((line) => `Input / case: ${line}`),
      ...(s.steps ?? []).map((step) => `Step: ${step}`),
    ];
    const completion_criteria = [
      ...(s.expected_outcomes ?? []).map((o) => `Expected: ${o}`),
      ...(s.failure_signals ?? []).map((f) => `Watch for: ${f}`),
    ];
    return {
      title: s.title ?? "Scenario",
      goal: s.purpose ?? "",
      tasks,
      completion_criteria,
    };
  });

  const axes = (Array.isArray(raw.comparison_axes) ? raw.comparison_axes : []) as TestingAxis[];
  const key_concepts: ConceptExplanation[] = axes.map((a) => ({
    concept: a.metric ?? "Metric",
    explanation: [a.how_to_measure, a.success_signal].filter(Boolean).join(" — ") || "",
    context_in_task: "Comparison / evaluation axis for this test plan",
  }));

  const rubric = (Array.isArray(raw.evaluation_rubric) ? raw.evaluation_rubric : []) as Array<{
    criterion?: string;
    scoring?: string;
    notes?: string;
  }>;
  for (const r of rubric) {
    key_concepts.push({
      concept: r.criterion ?? "Criterion",
      explanation: [r.scoring, r.notes].filter(Boolean).join(" — ") || "",
      context_in_task: "Rubric",
    });
  }

  const understanding = taskUnderstandingSchema.parse({
    high_level_goal: high,
    why_this_matters,
    major_steps,
    key_concepts: key_concepts.map((k) => k.concept).filter(Boolean),
    estimated_time: "",
    stages,
  });

  return { understanding, key_concepts };
}

/**
 * Maps canonical QA analysis JSON (qa-kalk / qa-general) into TaskUnderstanding for summary display.
 */
export function mapQaJsonToUnderstanding(raw: Record<string, unknown>): {
  understanding: TaskUnderstanding;
  key_concepts: ConceptExplanation[];
} {
  const high =
    typeof raw.high_level_goal === "string" ? raw.high_level_goal : String(raw.high_level_goal ?? "");
  const report =
    typeof raw.qa_report_markdown === "string" ? raw.qa_report_markdown : "";

  const understanding = taskUnderstandingSchema.parse({
    high_level_goal: high || "QA test analysis",
    why_this_matters: report
      ? "The full structured QA output is in the Analysis output → QA Test Analysis section above."
      : "",
    major_steps: [],
    key_concepts: [],
    estimated_time: "",
    stages: [],
  });

  return { understanding, key_concepts: [] };
}
