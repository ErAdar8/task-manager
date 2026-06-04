export type AnalyzeMode =
  | "execute"
  | "understand"
  | "testing_understand"
  | "qa_general";

const DEFAULT_EXECUTE_MODEL = "claude-opus-4-6";
/** Deep understanding + QA test analysis — Sonnet on the Messages API. */
const DEFAULT_UNDERSTAND_MODEL = "claude-sonnet-4-6";
const DEFAULT_QA_MODEL = DEFAULT_UNDERSTAND_MODEL;

/**
 * Resolves the Anthropic model for a given analysis flow.
 * `ANTHROPIC_MODEL_OVERRIDE` wins over everything when set.
 */
export function resolveModel(mode: AnalyzeMode): string {
  const override = process.env.ANTHROPIC_MODEL_OVERRIDE?.trim();
  if (override) return override;
  if (mode === "understand") return DEFAULT_UNDERSTAND_MODEL;
  if (mode === "qa_general") return DEFAULT_QA_MODEL;
  return DEFAULT_EXECUTE_MODEL;
}
