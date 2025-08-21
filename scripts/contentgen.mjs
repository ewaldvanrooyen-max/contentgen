#!/usr/bin/env node
// scripts/contentgen.mjs
// Minimal content generator: writes Markdown with YAML front-matter.
// Dry-run safe: `--dry` avoids calling OpenAI.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const args = new Set(process.argv.slice(2));
const getArg = (flag, fallback = null) => {
  const a = process.argv.slice(2);
  const i = a.indexOf(flag);
  return i >= 0 && a[i + 1] ? a[i + 1] : fallback;
};

const DRY = args.has("--dry");
const MAX = Number(getArg("--max", "1"));
const INLINE_TOPIC = getArg("--topic", null);
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const API_KEY = process.env.OPENAI_API_KEY || "";

function log(...x) {
  console.log("[contentgen]", ...x);
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function readTopics() {
  if (INLINE_TOPIC) return [INLINE_TOPIC];
  const p = path.join(ROOT, "topics.json");
  if (!fs.existsSync(p)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(p, "utf8").trim();
    const data = JSON.parse(raw || "[]");
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.topics)) return data.topics;
    return [];
  } catch (e) {
    log("WARN: failed to parse topics.json:", e.message);
    return [];
  }
}

function buildFrontMatter({ title, tags = [], summary = "" }) {
  const clean = (v) => String(v ?? "").replace(/"/g, '\\"');
  const arr = (a) => (Array.isArray(a) ? a : []);
  return `---\ntitle: "${clean(title)}"\ndate: "${todayISO()}"\ntags: [${arr(tags).map(t => `"${clean(t)}"`).join(", ")}]\nsummary: "${clean(summary)}"\n---\n\n`;
}

function buildDryMarkdown(topic) {
  const fm = buildFrontMatter({
    title: topic,
    tags: ["draft", "placeholder"],
    summary: "Placeholder article (dry run).",
  });
  const body =
    `# ${topic}\n\n` +
    `This is a dry-run placeholder. Replace this by running the generator without \`--dry\`, or let the GitHub Action create a real article.\n\n` +
    `- why it matters\n- what you’ll learn\n- next steps\n\n` +
    `> Tip: add more topics in \`topics.json\`.\n`;
  return fm + body;
}

async function buildOpenAIMarkdown(topic) {
  // dynamic import so `--dry` users don’t need the package installed to test
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: API_KEY });

  const system =
    "You are a helpful writing assistant. Return ONLY valid Markdown with a YAML front-matter header. The header must be between '---' fences and contain title, date, tags (array), summary. Do not wrap the Markdown in code fences.";

  const user =
    `Write a concise, helpful article (600–900 words) about: "${topic}". ` +
    `Audience: developers & makers. Keep it practical. Include a short summary in the front-matter.`;

  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7,
  });

  const md = res.choices?.[0]?.message?.content?.trim() || "";
  if (!md.startsWith("---")) {
    // if model ignored the instruction, add a minimal front-matter
    const fm = buildFrontMatter({ title: topic, tags: ["ai", "writing"] });
    return fm + md;
  }
  return md;
}

function computeOutPath(topic) {
  const date = todayISO();
  const slug = slugify(topic || "untitled");
  const dir = path.join(ROOT, "content", date.slice(0, 4), date.slice(5, 7));
  ensureDir(dir);
  return path.join(dir, `${date}-${slug}.md`);
}

async function main() {
  log(`dry: ${DRY ? "yes" : "no"} | model: ${MODEL}`);

  let topics = readTopics();
  if (INLINE_TOPIC && !topics.includes(INLINE_TOPIC)) topics.unshift(INLINE_TOPIC);
  if (!topics.length) {
    // bootstrap a topics.json so the user sees the shape
    const bootstrap = {
      topics: [
        "Why content agents accelerate projects",
        "A practical guide to GitHub Actions for side projects",
        "Shipping faster with small daily commits",
      ],
    };
    const p = path.join(ROOT, "topics.json");
    fs.writeFileSync(p, JSON.stringify(bootstrap, null, 2) + "\n");
    topics = bootstrap.topics;
    log("Created topics.json with sample topics.");
  }

  const chosen = topics.slice(0, Math.max(1, MAX));
  log(`generating ${chosen.length} post(s)`);

  const results = [];
  for (const topic of chosen) {
    const out = computeOutPath(topic);
    if (fs.existsSync(out)) {
      log(`skip: already exists -> ${path.relative(ROOT, out)}`);
      continue;
    }

    const md = DRY ? buildDryMarkdown(topic) : await buildOpenAIMarkdown(topic);
    if (DRY) {
      log(`DRY RUN would write -> ${path.relative(ROOT, out)}`);
    } else {
      fs.writeFileSync(out, md, "utf8");
      log(`wrote -> ${path.relative(ROOT, out)}`);
      results.push(out);
    }
  }

  // Print a tiny machine-readable summary (useful for future workflows)
  const reportDir = path.join(ROOT, "agent_reports");
  ensureDir(reportDir);
  const latest = {
    ok: true,
    dry: DRY,
    written: results.map((p) => path.relative(ROOT, p)),
    at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(reportDir, "latest.json"), JSON.stringify(latest, null, 2));
  log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
