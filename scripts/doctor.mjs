#!/usr/bin/env node
/**
 * doctor.mjs
 * Self-diagnose and auto-fix common issues for the content engine.
 * - Ensures contentgen/config.yaml and contentgen/topics.yaml exist.
 * - Verifies OPENAI_API_KEY is present.
 * - Ensures content/ output folder exists.
 * - Writes a small JSON report to agent_reports/latest.json
 *
 * Flags:
 *   --apply     actually write files (otherwise dry-run)
 */

import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");

const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();
const paths = {
  cfg: path.join(repoRoot, "contentgen", "config.yaml"),
  topics: path.join(repoRoot, "contentgen", "topics.yaml"),
  outRoot: path.join(repoRoot, "content"),
  report: path.join(repoRoot, "agent_reports", "latest.json"),
};

const report = {
  ok: true,
  apply: APPLY,
  checks: [],
  errors: [],
  env: {
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
  },
  node: process.version,
  timestamp: new Date().toISOString(),
};

const exists = async (p) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

async function ensureDir(p) {
  if (!(await exists(p))) {
    if (APPLY) await fs.mkdir(p, { recursive: true });
    report.checks.push({ action: "mkdir", path: p, applied: APPLY });
  }
}

async function writeIfMissing(filePath, content, label) {
  if (await exists(filePath)) {
    report.checks.push({ action: "exists", path: filePath, label });
    return;
  }
  if (APPLY) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
  }
  report.checks.push({ action: "create", path: filePath, label, applied: APPLY });
}

function defaultConfig() {
  return YAML.stringify({
    model: "gpt-4o-mini",
    temperature: 0.7,
    style: "concise, friendly, practical",
    audience: "busy engineers and founders",
    system:
      "You are a helpful content generator. Write clear, useful, and accurate posts in Markdown.",
  });
}

function defaultTopics() {
  // Simple starter topics you can edit later
  return YAML.stringify({
    topics: [
      "Why content agents accelerate projects",
      "Bootstrapping a content engine on GitHub Actions",
      "Automating rebase-and-push with a CI bot",
    ],
  });
}

async function main() {
  console.log("# doctor: start");
  console.log(" apply:", APPLY);
  console.log(" repo:", repoRoot);

  // Validate OPENAI_API_KEY early (non-fatal if you want to only prep files)
  if (!process.env.OPENAI_API_KEY) {
    report.ok = false;
    report.errors.push("Missing OPENAI_API_KEY in environment.");
    console.error("! Missing OPENAI_API_KEY. Add it to repo secrets and/or Actions env.");
  }

  // Ensure output folder
  await ensureDir(paths.outRoot);

  // Ensure config/topics exist
  await writeIfMissing(paths.cfg, defaultConfig(), "contentgen/config.yaml");
  await writeIfMissing(paths.topics, defaultTopics(), "contentgen/topics.yaml");

  // Write agent report
  await fs.mkdir(path.dirname(paths.report), { recursive: true });
  if (APPLY) await fs.writeFile(paths.report, JSON.stringify(report, null, 2), "utf8");

  console.log("# doctor: done");
  if (!report.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  report.ok = false;
  report.errors.push(String(err && err.message ? err.message : err));
  process.exit(1);
});
