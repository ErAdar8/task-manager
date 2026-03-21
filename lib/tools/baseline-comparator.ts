import fs from "fs/promises";
import path from "path";

export type BaselineType =
  | "reentrancy"
  | "access-control"
  | "erc20"
  | "anchor-withdraw";

export interface BaselineComparisonResult {
  matches_safe_pattern: boolean;
  similarity_score: number;
  deviations: string[];
}

type KeyPattern = { type: string; description: string; pattern: string };

const BASELINE_MAP: Record<BaselineType, string> = {
  reentrancy: "safe-reentrancy.sol",
  "access-control": "safe-access-control.sol",
  erc20: "safe-erc20-transfer.sol",
  "anchor-withdraw": "anchor-safe-withdraw.rs",
};

function extractKeyPatterns(code: string): KeyPattern[] {
  const patterns: KeyPattern[] = [];

  if (/balances?\[.*\]\s*[-+]=[\s\S]*?\.call\s*\{\s*value:/.test(code)) {
    patterns.push({
      type: "reentrancy-safe",
      description: "State updated before external call",
      pattern: "state-before-call",
    });
  }

  if (/modifier\s+onlyOwner/.test(code) && /onlyOwner/.test(code)) {
    patterns.push({
      type: "access-control",
      description: "onlyOwner modifier present and used",
      pattern: "ownable",
    });
  }

  if (/using\s+SafeERC20/.test(code)) {
    patterns.push({
      type: "erc20-safe",
      description: "SafeERC20 library used",
      pattern: "safe-erc20",
    });
  }

  if (/has_one\s*=\s*authority/.test(code)) {
    patterns.push({
      type: "anchor-access",
      description: "has_one authority constraint",
      pattern: "anchor-has-one",
    });
  }

  return patterns;
}

function patternSimilarity(a: KeyPattern, b: KeyPattern): number {
  return a.pattern === b.pattern ? 1.0 : 0.0;
}

export async function compareToBaseline(
  content: string,
  _filename: string,
  baselineType: BaselineType
): Promise<BaselineComparisonResult> {
  const fileName = BASELINE_MAP[baselineType];
  const baselinePath = path.join(process.cwd(), "public", "baselines", fileName);

  let baselineContent: string;
  try {
    baselineContent = await fs.readFile(baselinePath, "utf-8");
  } catch {
    return {
      matches_safe_pattern: false,
      similarity_score: 0,
      deviations: ["Baseline comparison unavailable"],
    };
  }

  const baselinePatterns = extractKeyPatterns(baselineContent);
  const userPatterns = extractKeyPatterns(content);

  const deviations: string[] = [];
  let matchCount = 0;

  for (const bp of baselinePatterns) {
    const hasMatch = userPatterns.some(
      (up) => patternSimilarity(up, bp) > 0.7
    );
    if (hasMatch) {
      matchCount++;
    } else {
      deviations.push(`Missing safe pattern: ${bp.description}`);
    }
  }

  const similarity =
    baselinePatterns.length > 0
      ? (matchCount / baselinePatterns.length) * 100
      : 0;

  return {
    matches_safe_pattern: similarity > 60,
    similarity_score: Math.round(similarity),
    deviations,
  };
}
