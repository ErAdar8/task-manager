import type { NextConfig } from "next";

/** Root-level prompt markdown read at runtime via fs (lib/prompts/markdown-prompt.ts). */
const ANALYSIS_PROMPT_MARKDOWN = [
  "./understanding-execution.md",
  "./understanding-learning.md",
  "./understanding-testing.md",
  "./qa-general.md",
] as const;

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Include prompt .md files in serverless bundles (Vercel /var/task); otherwise ENOENT at runtime.
  outputFileTracingIncludes: {
    "/api/*": [...ANALYSIS_PROMPT_MARKDOWN],
    "/*": [...ANALYSIS_PROMPT_MARKDOWN],
  },
};

export default nextConfig;
