#!/usr/bin/env node
// Content generator: reads YAML config + topics and produces Markdown files.
// No extra SDK required; uses fetch() to call OpenAI Chat Completions.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

// ---------- tiny helpers ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowISO = () => new Date().toISOString();

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function readIfExists(p, fallback = "") {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return fallback;
  }
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = new Set(argv);
  const get = (k, d = null) => {
    const i = argv.indexOf(k);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
  };
  return {
    dry: args.has("--dry"),
    max: Number(get("--max", "0")) || 0,
    configPath: get("--config", path.join(repoRoot, "contentgen", "config.yaml")),
    topicsPath: get("--topics", path.join(repoRoot, "contentgen", "topics.yaml")),
    outDir: get("--out", path.join(repoRoot, "content")),
    delayMs: Number(get("--delay", "500")) || 500,
  };
}

// Light .env loader (optional, only if file exists). No dependency on dotenv.
async function loadDotEnv() {
  const envPath = path.join(repoRoot, ".env");
  try {
    const raw = await fs.readFile(envPath, "utf8");
    raw
      .split(/\r?\n/)
      .filter((l) => l && !l.trim().startsWith("#"))
      .forEach((line) => {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) return;
        const [, k, vRaw] = m;
        if (process.env[k]) return; // don't override
        const v = vRaw.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
        process.env[k] = v;
      });
  } catch {
    // no-op if .env not present
  }
}

async function readYaml(p) {
  const txt = await fs.readFile(p, "utf8");
  return YAML.parse(txt);
}

function applyTemplate(tpl, ctx) {
  return String(tpl).replace(/\{(\w+)\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(ctx, k) ? String(ctx[k]) : `{${k}}`
  );
}

async function callOpenAI({ model, temperature, system, user, apiKey }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    let msg = `OpenAI error (${res.status})`;
    try {
      const j = JSON.parse(text);
      msg += `: ${j?.error?.message || text}`;
    } catch {
      msg += `: ${text}`;
    }
    throw new Error(msg);
  }

  const json = JSON.parse(text);
  const content = json?.choices?.[0]?.message?.content?.trim() || "";
  return content;
}

function stripFences(md) {
  // remove ```xxx fenced wrappers if LLM returns them
  const fence = md.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/);
  return fence ? fence[1].trim() : md;
}

// ---------- main ----------
async function main() {
  await loadDotEnv();
  const args = parseArgs();

  console.log("# contentgen: start");
  console.log(`  dry: ${args.dry}  max: ${args.max || "all"}  out: ${args.outDir}`);
  console.log(`  config: ${args.configPath}`);
  console.log(`  topics: ${args.topicsPath}`);

  const config = await readYaml(args.configPath);
  const topics = await readYaml(args.topicsPath);

  if (!Array.isArray(topics) || topics.length === 0) {
    throw new Error(`No topics found in ${args.topicsPath}`);
  }

  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!args.dry && !apiKey) {
    throw new Error(
      "OPENAI_API_KEY not set. Add it to your Codespace secrets or a local .env (OPENAI_API_KEY=sk-...)."
    );
  }

  const outDir = args.outDir || config.outDir || path.join(repoRoot, "content");
  await ensureDir(outDir);

  const limit = args.max > 0 ? Math.min(args.max, topics.length) : topics.length;
  const picked = topics.slice(0, limit);

  const report = {
    startedAt: nowISO(),
    model: config.model,
    outDir,
    dry: !!args.dry,
    generated: [],
    errors: [],
  };

  for (let i = 0; i < picked.length; i++) {
    const t = picked[i];
    const slug = slugify(t.slug || t.title || `item-${i + 1}`);
    const ctx = {
      ...t,
      slug,
      today: new Date().toISOString().split("T")[0],
    };

    const system = applyTemplate(
      config.system ||
        "You are a precise, helpful writing assistant. Always return clean Markdown with YAML frontmatter.",
      ctx
    );

    const user = applyTemplate(
      config.user ||
        [
          "Write a {type|blog post} titled \"{title}\" for {audience}.",
          "Use an engaging, helpful, non-hype tone.",
          "Return **Markdown** including YAML frontmatter with: title, description, date, tags (array), draft (boolean), and slug.",
          "Keep it concise but complete. Avoid placeholders.",
          "Description: {description}",
          "Suggested tags: {tags}",
        ].join("\n"),
      ctx
    );

    const filename = `${slug}.${config.ext || "mdx"}`;
    const outPath = path.join(outDir, filename);

    console.log(`\n[${i + 1}/${picked.length}] ${t.title} -> ${outPath}`);

    if (args.dry) {
      report.generated.push({ slug, outPath, dry: true });
      continue;
    }

    try {
      const markdown = stripFences(
        await callOpenAI({
          model: config.model || "gpt-4o-mini",
          temperature: typeof config.temperature === "number" ? config.temperature : 0.4,
          system,
          user,
          apiKey,
        })
      );

      // Ensure a minimal frontmatter exists (best effort)
      const hasFrontmatter = /^---\n[\s\S]+?\n---\n/.test(markdown);
      const content =
        hasFrontmatter
          ? markdown
          : `---\ntitle: "${t.title}"\ndescription: "${t.description || ""}"\ndate: "${ctx.today}"\ntags: ${JSON.stringify(t.tags || [])}\ndraft: true\nslug: "${slug}"\n---\n\n${markdown}`;

      await fs.writeFile(outPath, content, "utf8");
      report.generated.push({ slug, outPath, bytes: content.length });
      await sleep(args.delayMs);
    } catch (err) {
      console.error("  ! Error:", err.message);
      report.errors.push({ slug, message: err.message });
    }
  }

  report.finishedAt = nowISO();

  // Also emit a small agent report so the workflow can upload it.
  try {
    const repDir = path.join(repoRoot, "agent_reports");
    await ensureDir(repDir);
    await fs.writeFile(path.join(repDir, "latest.json"), JSON.stringify(report, null, 2));
  } catch {
    // ignore
  }

  console.log("\n# contentgen: done");
  console.log(
    `  ok: ${report.generated.length - report.errors.length
    }  errors: ${report.errors.length}  out: ${outDir}`
  );

  if (report.errors.length) {
    process.exitCode = 2;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
