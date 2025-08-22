#!/usr/bin/env node
/**
 * Minimal content generator that reads:
 *   - contentgen/config.yaml
 *   - contentgen/topics.yaml
 * and writes posts to:
 *   - content/YYYY/MM/DD/<slug>.md
 *
 * Works both locally and on GitHub Actions.
 */

import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import OpenAI from "openai";

// ---------- CLI ----------
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const get = (name, d = null) => {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d;
};
const MAX = Number(get("--max", "1")) || 1;
const DRY = has("--dry");

// ---------- Paths (anchor once at repo root) ----------
const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();
const cfgPath = path.join(repoRoot, "contentgen", "config.yaml");
const topicsPath = path.join(repoRoot, "contentgen", "topics.yaml");
const outRoot = path.join(repoRoot, "content");

const todayParts = () => {
  const d = new Date();
  return [
    String(d.getFullYear()),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ];
};

const exists = async (p) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ---------- Start ----------
console.log("# contentgen: start");
console.log(" dry:", DRY, " max:", MAX, " out:", outRoot);
console.log(" config:", cfgPath);
console.log(" topics:", topicsPath);

// Ensure inputs exist
if (!(await exists(cfgPath))) {
  throw Object.assign(new Error("Missing config.yaml"), { path: cfgPath });
}
if (!(await exists(topicsPath))) {
  throw Object.assign(new Error("Missing topics.yaml"), { path: topicsPath });
}

// Load config & topics
const cfg = YAML.parse(await fs.readFile(cfgPath, "utf8")) || {};
const topicsDoc = YAML.parse(await fs.readFile(topicsPath, "utf8")) || {};
const topics =
  Array.isArray(topicsDoc.topics) ? topicsDoc.topics : topicsDoc;

// Ensure output root
await fs.mkdir(outRoot, { recursive: true });

if (DRY) {
  const [Y, M, D] = todayParts();
  const sample = topics[0] || "sample-post";
  const file = path.join(outRoot, Y, M, D, `${slugify(sample)}.md`);
  console.log(`[contentgen] DRY RUN would write -> ${file}`);
  process.exit(0);
}

// ---------- OpenAI ----------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = cfg.model || "gpt-4o-mini";
const temperature = cfg.temperature ?? 0.7;

const systemPrompt =
  cfg.system ||
  "You are a helpful content generator. Write clear, useful, and accurate posts in Markdown.";

// ---------- Generate ----------
let written = 0;
for (const topic of topics) {
  if (written >= MAX) break;

  const md = await generatePost(topic, { client, model, temperature, systemPrompt, cfg });

  const [Y, M, D] = todayParts();
  const dir = path.join(outRoot, Y, M, D);
  await fs.mkdir(dir, { recursive: true });

  const file = path.join(dir, `${slugify(topic)}.md`);
  await fs.writeFile(file, md, "utf8");
  console.log(`[contentgen] wrote -> ${file}`);
  written++;
}

console.log("[contentgen] done.");

// ---------- Helpers ----------
async function generatePost(topic, { client, model, temperature, systemPrompt, cfg }) {
  const style = cfg.style || "concise, friendly, practical";
  const audience = cfg.audience || "busy engineers and founders";
  const outline =
    cfg.outline ||
    ["Hook", "Why it matters", "How it works", "Steps", "Pitfalls", "Conclusion"];

  const userPrompt = `
Write a Markdown blog post about **${topic}**.

- Audience: ${audience}
- Style: ${style}
- Sections: ${outline.join(", ")}
- Length: 800–1200 words
- Use Markdown headings, lists, and code blocks when helpful.
- Do not include YAML front matter.
  `.trim();

  const resp = await client.chat.completions.create({
    model,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return resp.choices?.[0]?.message?.content ?? "# (no content generated)\n";
}
