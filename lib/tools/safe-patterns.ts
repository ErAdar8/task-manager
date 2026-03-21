export interface SafePattern {
  id: string;
  name: string;
  description: string;
  pattern: RegExp;
  safe_variant?: RegExp;
  unsafe_variant?: RegExp;
  source: string;
}

export const SAFE_PATTERNS: SafePattern[] = [
  {
    id: "oz_reentrancy_guard",
    name: "OpenZeppelin ReentrancyGuard",
    description: "State updated before external call",
    pattern: /ReentrancyGuard|nonReentrant/,
    safe_variant: /balances?\[.*\]\s*[-+]=[\s\S]*?\.call\s*\{\s*value:/,
    unsafe_variant: /\.call\s*\{\s*value:[\s\S]*?balances?\[.*\]\s*[-+]=/,
    source: "@openzeppelin/contracts/security/ReentrancyGuard.sol",
  },
  {
    id: "oz_ownable",
    name: "OpenZeppelin Ownable Pattern",
    description: "Functions with onlyOwner modifier",
    pattern:
      /function\s+\w+\s*\([^)]*\)\s+[^{]*onlyOwner[^{]*\{/,
    source: "@openzeppelin/contracts/access/Ownable.sol",
  },
  {
    id: "oz_pausable",
    name: "OpenZeppelin Pausable Pattern",
    description: "whenNotPaused modifier present",
    pattern:
      /function\s+\w+\s*\([^)]*\)\s+[^{]*whenNotPaused[^{]*\{/,
    source: "@openzeppelin/contracts/security/Pausable.sol",
  },
  {
    id: "oz_safe_erc20",
    name: "OpenZeppelin SafeERC20",
    description: "Using SafeERC20 for IERC20",
    pattern: /using\s+SafeERC20\s+for\s+IERC20/,
    source: "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol",
  },
  {
    id: "anchor_pda_constraint",
    name: "Anchor PDA Constraint",
    description: "seeds and bump in account constraint",
    pattern: /seeds\s*=\s*\[.*\],\s*bump/,
    source: "Anchor Framework best practices",
  },
  {
    id: "anchor_has_one",
    name: "Anchor has_one Constraint",
    description: "Authority validation with has_one",
    pattern: /has_one\s*=\s*authority/,
    source: "Anchor Framework access control",
  },
];

export function matchSafePatterns(content: string): {
  matched: SafePattern[];
  coverage: number;
} {
  const matched: SafePattern[] = [];

  for (const pattern of SAFE_PATTERNS) {
    if (pattern.pattern.test(content)) {
      matched.push(pattern);
    }
    if (pattern.safe_variant && pattern.unsafe_variant) {
      const unsafe = pattern.unsafe_variant.test(content);
      const safe = pattern.safe_variant.test(content);
      if (unsafe && !safe) {
        continue;
      }
    }
  }

  const coverage =
    SAFE_PATTERNS.length > 0
      ? (matched.length / SAFE_PATTERNS.length) * 100
      : 0;

  return { matched, coverage };
}
