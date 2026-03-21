/**
 * Rough estimate for Claude API cost based on content length.
 * Claude Sonnet: ~$3 per million input tokens, ~$15 per million output tokens.
 * 1 token ≈ 4 characters.
 */
export function estimateAnalysisCost(contentLength: number): number {
  const inputTokens = Math.ceil(contentLength / 4);
  const outputTokens = 1000;

  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;

  return inputCost + outputCost;
}
