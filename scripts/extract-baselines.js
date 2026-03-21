/**
 * Extracts baseline contracts from DB.md and writes them to public/baselines/
 * Run: node scripts/extract-baselines.js
 */
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "DB.md");
const BASELINES_ROOT = path.join(__dirname, "..", "public", "baselines");

function normalizeContent(raw) {
  let s = raw
    .replace(/^solidity\/\//, "//")
    .replace(/\\\*/g, "*")
    .trim();
  return s;
}

function extractInlineBlock(lines, startIdx) {
  const pathMatch = lines[startIdx].match(/^(#+\s*)?FILE:\s*(public\/baselines\/[^\s]+)/);
  if (!pathMatch) return null;
  const filePath = pathMatch[2].trim();
  let content = "";
  let i = startIdx + 1;
  while (i < lines.length) {
    const line = lines[i];
    if (line.match(/^(FILE:|## FILE:|\s*TOKEN STANDARDS|\s*## [A-Z#])/)) break;
    content += (content ? "\n" : "") + line;
    i++;
  }
  return { filePath, content: normalizeContent(content) };
}

function extractCodeBlock(lines, startIdx) {
  const pathMatch = lines[startIdx].match(/^(#+\s*)?FILE:\s*(public\/baselines\/[^\s]+)/);
  if (!pathMatch) return null;
  const filePath = pathMatch[2].trim();
  let i = startIdx + 1;
  while (i < lines.length && !lines[i].trim().startsWith("```")) i++;
  i++;
  const codeStart = i;
  while (i < lines.length && !lines[i].trim().startsWith("```")) i++;
  const content = lines.slice(codeStart, i).join("\n").trim();
  return { filePath, content: normalizeContent(content) };
}

function main() {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  const lines = raw.split("\n");

  const fileMarkers = [];
  lines.forEach((line, i) => {
    if (line.match(/^(#+\s*)?FILE:\s*public\/baselines\//)) {
      fileMarkers.push({ i, line });
    }
  });

  const results = [];
  for (const { i } of fileMarkers) {
    const nextMarker = fileMarkers.find((m) => m.i > i);
    const nextIdx = nextMarker ? nextMarker.i : lines.length;
    const between = lines.slice(i + 1, nextIdx).join("\n");
    const isCodeBlock = between.trim().startsWith("```");
    const extracted = isCodeBlock ? extractCodeBlock(lines, i) : extractInlineBlock(lines, i);
    if (extracted && extracted.content.length > 50) {
      results.push(extracted);
    }
  }

  for (const { filePath, content } of results) {
    const fullPath = path.join(__dirname, "..", filePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log("Wrote", filePath);
  }

  console.log("\nExtracted", results.length, "contracts.");
  return results.length;
}

main();
