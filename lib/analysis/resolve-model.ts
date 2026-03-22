export type AnalyzeMode = "execute" | "understand";

const DEFAULT_EXECUTE_MODEL = "claude-opus-4-6";
const DEFAULT_UNDERSTAND_MODEL = "claude-sonnet-4-5-20250514";

/**
 * Resolves the Anthropic model for a given analysis flow.
 * `ANTHROPIC_MODEL_OVERRIDE` wins over everything when set.
 */
export function resolveModel(mode: AnalyzeMode): string {
  const override = process.env.ANTHROPIC_MODEL_OVERRIDE?.trim();
  if (override) return override;
  if (mode === "execute") return DEFAULT_EXECUTE_MODEL;
  return DEFAULT_UNDERSTAND_MODEL;
}
