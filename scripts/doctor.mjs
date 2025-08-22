// scripts/doctor.mjs
#!/usr/bin/env node
/**
 * ContentGen Doctor — proactive repo checks + gentle fixes.
 *
 * What it does:
 *  - Validates OPENAI_API_KEY shape
 *  - Ensures contentgen/config.yaml + contentgen/topics.yaml exist (creates safe defaults)
 *  - Ensures /content exists; creates a starter post if empty
 *  - Verifies /site app skeleton and that it can resolve ../content at build-time
 *  - Ensures .gitignore excludes agent_reports/ and site/.next
 *  - Warns about missing Vercel secrets in CI (optional deploy step)
 *  - Writes a JSON report to agent_reports/latest.json
 *
 * Never destructive. Exits 0 unless a truly fatal condition is found.
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as YAML from "yaml";
import fg from "fast-glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, ".."); // repo root
const REPORTS_DIR = path.join(ROOT, "agent_reports");
const REPORT_FILE = path.join(REPORTS_DIR, "latest.json");

const CONTENTGEN_DIR = path.join(ROOT, "contentgen");
const CONFIG_YAML = path.join(CONTENTGEN_DIR, "config.yaml");
const TOPICS_YAML = path.join(CONTENTGEN_DIR, "topics.yaml");

const CONTENT_DIR = path.join(ROOT, "content");
const SITE_DIR = path.join(ROOT, "site");

const isCI = !!process.env.GITHUB_ACTIONS;

const report = {
  ok: [],
  fixed: [],
  warn: [],
  error: [],
  meta: {
    node: process.version,
    ci: isCI,
    when: new Date().toISOString(),
  },
};

function log(type, msg) {
  const line = `[doctor] ${type.toUpperCase()}: ${msg}`;
  if (type === "error") console.error(line);
  else if (type === "warn") console.warn(line);
  else console.log(line);
  report[type].push(msg);
}

async function ensureDir(p) {
  if (!fs.existsSync(p)) {
    await fsp.mkdir(p, { recursive: true });
    log("fixed", `Created directory: ${rel(p)}`);
  } else {
    log("ok", `Directory present: ${rel(p)}`);
  }
}

function rel(p) {
  return path.relative(ROOT, p) || ".";
}

async function ensureGitignore() {
  const GI = path.join(ROOT, ".gitignore");
  const required = [
    "agent_reports/",
    "site/.next/",
    ".next/",
    "node_modules/",
  ];

  let before = "";
  if (fs.existsSync(GI)) before = await fsp.readFile(GI, "utf8");

  const add = required.filter((line) => !before.split(/\r?\n/).includes(line));
  if (add.length) {
    const next = (before ? before.replace(/\s*$/, "\n") : "") + add.join("\n") + "\n";
    await fsp.writeFile(GI, next, "utf8");
    log("fixed", `Patched .gitignore with: ${add.join(", ")}`);
  } else {
    log("ok", ".gitignore already has required entries");
  }
}

async function safeReadYaml(file, fallback = {}) {
  if (!fs.existsSync(file)) return fallback;
  try {
    const txt = await fsp.readFile(file, "utf8");
    return YAML.parse(txt) ?? fallback;
  } catch (e) {
    log("warn", `Failed parsing YAML ${rel(file)} — recreating default (${e.message})`);
    return fallback;
  }
}

async function safeWriteYaml(file, data) {
  const txt = YAML.stringify(data);
  await fsp.writeFile(file, txt, "utf8");
}

async function ensureConfigYamls() {
  await ensureDir(CONTENTGEN_DIR);

  // config.yaml
  const defaultConfig = {
    out: "content",
    model: "gpt-4o-mini",
    maxTokens: 2000,
  };
  let cfg = await safeReadYaml(CONFIG_YAML, null);
  if (!cfg) {
    await safeWriteYaml(CONFIG_YAML, defaultConfig);
    log("fixed", `Created ${rel(CONFIG_YAML)}`);
  } else {
    // Patch obvious path mistakes (e.g., duplicated 'contentgen/')
    if (typeof cfg.out === "string" && cfg.out.includes("contentgen/contentgen")) {
      cfg.out = "content";
      await safeWriteYaml(CONFIG_YAML, cfg);
      log("fixed", `Normalized 'out' in ${rel(CONFIG_YAML)} → "content"`);
    } else {
      log("ok", `${rel(CONFIG_YAML)} looks good`);
    }
  }

  // topics.yaml
  const defaultTopics = {
    topics: [
      "Why content agents accelerate projects",
      "Bootstrapping a content engine on GitHub Actions",
      "Automating rebase-and-push with a CI bot",
    ],
  };
  const topics = await safeReadYaml(TOPICS_YAML, null);
  if (!topics || !Array.isArray(topics.topics) || topics.topics.length === 0) {
    await safeWriteYaml(TOPICS_YAML, defaultTopics);
    log("fixed", `Created ${rel(TOPICS_YAML)} with starter topics`);
  } else {
    log("ok", `${rel(TOPICS_YAML)} has ${topics.topics.length} topics`);
  }
}

function looksLikeOpenAIKey(k) {
  return typeof k === "string" && k.startsWith("sk-") && k.length >= 40;
}

async function checkOpenAIKey() {
  const k = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!k) {
    log("warn", "OPENAI_API_KEY not set in environment. Actions will use repository secret if configured.");
    return;
  }
  if (!looksLikeOpenAIKey(k)) {
    log("warn", "OPENAI_API_KEY present but shape looks unusual. Double-check the secret value.");
  } else {
    log("ok", "OPENAI_API_KEY present and looks valid.");
  }
}

async function ensureContentAndStarter() {
  await ensureDir(CONTENT_DIR);

  const files = await fg("**/*.md", { cwd: CONTENT_DIR });
  if (files.length > 0) {
    log("ok", `Found ${files.length} markdown file(s) in ${rel(CONTENT_DIR)}`);
    return;
  }

  // Create starter post
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");

  const dir = path.join(CONTENT_DIR, yyyy, mm);
  await fsp.mkdir(dir, { recursive: true });

  const slug = `${yyyy}-${mm}-${dd}-hello-contentgen`;
  const file = path.join(dir, `${slug}.md`);
  const fm = [
    "---",
    `title: "Hello from ContentGen"`,
    `date: "${now.toISOString()}"`,
    `description: "Starter post created by the doctor script."`,
    "---",
    "",
    "This is your first auto-generated post placeholder.",
    "Your content generator will add real posts soon.",
    "",
  ].join("\n");

  await fsp.writeFile(file, fm, "utf8");
  log("fixed", `Created starter post: ${rel(file)}`);
}

async function checkSiteCanSeeContent() {
  if (!fs.existsSync(SITE_DIR)) {
    log("warn", "site/ directory not found. Add the Next.js app (see instructions) to view posts.");
    return;
  }

  // Minimal presence check
  const must = [
    path.join(SITE_DIR, "package.json"),
    path.join(SITE_DIR, "app", "page.tsx"),
    path.join(SITE_DIR, "lib", "posts.ts"),
  ];
  const missing = must.filter((p) => !fs.existsSync(p));
  if (missing.length) {
    log(
      "warn",
      `site/ is present but missing files: ${missing.map(rel).join(", ")}. Follow the site/ setup to complete the app.`
    );
  } else {
    log("ok", "site/ app skeleton detected.");
  }

  // Simulate what the site build expects: from site/, '../content' should exist
  const siteSeesContent = fs.existsSync(path.join(SITE_DIR, "..", "content"));
  if (!siteSeesContent) {
    log(
      "warn",
      "From site/ build perspective, ../content was not found. Ensure your content directory is 'content/' at repo root."
    );
  } else {
    log("ok", "site/ will resolve ../content correctly at build time.");
  }
}

async function warnMissingVercelSecrets() {
  if (!isCI) return;
  const has =
    !!process.env.VERCEL_TOKEN &&
    !!process.env.VERCEL_ORG_ID &&
    !!process.env.VERCEL_PROJECT_ID;

  if (has) {
    log("ok", "Vercel secrets detected in CI environment.");
  } else {
    log(
      "warn",
      "Vercel secrets not detected in CI. Deploy step will be skipped unless you add VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID."
    );
  }
}

async function writeReport() {
  await ensureDir(REPORTS_DIR);
  await fsp.writeFile(REPORT_FILE, JSON.stringify(report, null, 2) + "\n", "utf8");
  log("ok", `Wrote report → ${rel(REPORT_FILE)}`);
}

async function main() {
  log("ok", `Repo root: ${ROOT}`);
  await ensureGitignore();
  await ensureConfigYamls();
  await ensureContentAndStarter();
  await checkSiteCanSeeContent();
  await checkOpenAIKey();
  await warnMissingVercelSecrets();
  await writeReport();

  // If we truly cannot proceed, we could exit(1). For now, always 0.
  process.exit(0);
}

main().catch(async (e) => {
  log("error", String(e?.stack || e));
  await writeReport().catch(() => {});
  process.exit(1);
});
