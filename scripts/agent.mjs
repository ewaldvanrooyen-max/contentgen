#!/usr/bin/env node
/**
 * scripts/agent.mjs
 *
 * A tiny repo helper that can:
 *  - run diagnostics
 *  - lint/parse YAML workflows
 *  - make a trivial test change
 *  - commit & push (with non-fast-forward handling)
 *  - NEW: --task scaffold-mvp (delegates to scripts/scaffold-mvp.mjs)
 *
 * Flags (order doesn’t matter):
 *   --task <name>           diagnose | yaml-check | write-test-change | commit-push | scaffold-mvp
 *   --apply                 actually commit/push (otherwise dry-run)
 *   --commit "<message>"    commit message for commit-push
 *   --remote <name>         git remote (default: origin)
 *   --branch <name>         branch to push (default: main)
 *   --no-check              skip yaml-check
 *   --fix-tabs              replace hard tabs in YAML with spaces before parsing
 *
 * Examples:
 *   node scripts/agent.mjs --task diagnose --task yaml-check
 *   node scripts/agent.mjs --apply --task write-test-change --task yaml-check --task commit-push --commit "chore(agent): test push"
 *   node scripts/agent.mjs --task scaffold-mvp
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import fg from "fast-glob";
import * as YAML from "yaml";

const ROOT = path.resolve(process.cwd());

// ------------------------------- utils ---------------------------------

function sh(cmd, opts = {}) {
  const out = execSync(cmd, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    ...opts
  });
  return out.trim();
}
function safe(cmd, opts = {}) {
  try {
    return sh(cmd, opts);
  } catch (err) {
    throw new Error(`Command failed: ${cmd}\n${err?.stdout || ""}${err?.stderr || ""}`.trim());
  }
}
function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}
function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}
function nowISO() {
  return new Date().toISOString().replace("T", " ").replace("Z", " UTC");
}

// ----------------------------- arg parsing ------------------------------

const argv = process.argv.slice(2);
const argSet = new Set(argv);
const getArg = (flag, fallback = "") => {
  const i = argv.indexOf(flag);
  return i >= 0 ? (argv[i + 1] || fallback) : fallback;
};

const APPLY = argSet.has("--apply");
const NO_CHECK = argSet.has("--no-check");
const FIX_TABS = argSet.has("--fix-tabs");
const COMMIT_MSG = getArg("--commit", "chore(agent): automated change");
const REMOTE = getArg("--remote", process.env.AGENT_REMOTE || "origin");
const BRANCH = getArg("--branch", process.env.AGENT_BRANCH || "main");

// allow multiple --task occurrences
const TASKS = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--task" && argv[i + 1]) TASKS.push(argv[i + 1]);
}

// ------------------------ NEW: scaffold dispatcher ----------------------

async function maybeScaffoldMvp() {
  // if explicitly asked for this single task, run it and exit early
  if (TASKS.length === 1 && TASKS[0] === "scaffold-mvp") {
    const mod = await import("./scaffold-mvp.mjs");
    await mod.run();
    return true;
  }
  return false;
}

// ------------------------------- tasks ----------------------------------

async function diagnose() {
  const node = process.version;
  let lastCommits = "";
  try {
    lastCommits = safe(`git --no-pager log --oneline -n 3`);
  } catch {}
  const report = { node, lastCommits };
  console.log(JSON.stringify(report, null, 2));
}

function scanConflictMarkers(text, file) {
  if (text.includes("<<<<<<<") || text.includes("=======") || text.includes(">>>>>>>")) {
    throw new Error(`Conflict markers found in ${file}`);
  }
}

async function yamlCheck() {
  if (NO_CHECK) {
    console.log("yaml-check: skipped via --no-check");
    return;
  }

  const patterns = [".github/workflows/**/*.yml", ".github/workflows/**/*.yaml"];
  const files = await fg(patterns, { cwd: ROOT, dot: true });

  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    let text = read(abs);

    if (FIX_TABS && /\t/.test(text)) {
      text = text.replace(/\t/g, "  ");
      write(abs, text); // keep the fix
      console.log(`yaml-check: replaced tabs -> spaces in ${rel}`);
    }

    scanConflictMarkers(text, rel);

    try {
      YAML.parse(text);
    } catch (e) {
      // surface parser errors with file context
      throw new Error(`YAML parse failed for ${rel}:\n${String(e.message || e)}`);
    }
  }

  console.log(`yaml-check: OK (${files.length} file${files.length === 1 ? "" : "s"})`);
}

async function writeTestChange() {
  const file = path.join(ROOT, "AGENT_TEST.txt");
  const line = `agent ping ${nowISO()}\n`;
  const before = read(file);
  write(file, before + line);
  console.log(`write-test-change: appended to ${path.relative(ROOT, file)}`);
}

function hasStagedChanges() {
  try {
    sh("git diff --cached --quiet");
    return false; // quiet exit means no staged changes
  } catch {
    return true;
  }
}

function hasAnyChanges() {
  try {
    sh("git diff --quiet");
    sh("git diff --cached --quiet");
    return false;
  } catch {
    return true;
  }
}

async function commitAndPush() {
  console.log(`commit-push: remote=${REMOTE} branch=${BRANCH}`);

  // add everything
  safe("git add -A");

  if (!hasStagedChanges() && !hasAnyChanges()) {
    console.log("commit-push: no changes to commit.");
    return;
  }

  if (!APPLY) {
    console.log("commit-push: dry-run (use --apply to commit & push).");
    return;
  }

  // commit
  try {
    safe(`git commit -m "${COMMIT_MSG.replace(/"/g, '\\"')}"`);
  } catch (e) {
    // nothing to commit is fine
    if (!/nothing to commit/i.test(String(e))) throw e;
  }

  // first push attempt
  try {
    console.log(`> git push -u ${REMOTE} ${BRANCH}`);
    safe(`git push -u ${REMOTE} ${BRANCH}`);
    console.log("commit-push: pushed successfully.");
    return;
  } catch (e) {
    // fallthrough
  }

  // handle non-fast-forward: fetch, rebase, retry
  console.log("Push rejected (non-fast-forward). Rebasing onto remote and retrying...");
  safe(`git fetch ${REMOTE} ${BRANCH}`);
  try {
    // try rebase with fewer prompts and no advice noise
    safe(`git -c advice.mergeConflict=false rebase --rebase-merges ${REMOTE}/${BRANCH}`);
  } catch (e) {
    console.error("Rebase failed. Resolve conflicts then re-run with --apply.");
    console.error(String(e?.message || e));
    const status = safe("git status --porcelain=1 || true");
    console.log(status);
    process.exitCode = 2;
    return;
  }

  try {
    console.log(`> git push -u ${REMOTE} ${BRANCH}`);
    safe(`git push -u ${REMOTE} ${BRANCH}`);
    console.log("commit-push: pushed after rebase.");
  } catch (e) {
    throw new Error(`Final push failed:\n${String(e?.message || e)}`);
  }
}

// ------------------------------ main ------------------------------------

async function main() {
  // one-shot early exit for scaffold
  if (await maybeScaffoldMvp()) return;

  // default behavior if no tasks were specified
  if (TASKS.length === 0) {
    console.log("# sanity: show Node version (should be >= 18)");
    console.log(process.version);
    console.log("\n# smoke test: diagnostics + YAML check (no commits, no push)");
    await diagnose();
    await yamlCheck();
    return;
  }

  for (const task of TASKS) {
    switch (task) {
      case "diagnose":
        await diagnose();
        break;
      case "yaml-check":
        await yamlCheck();
        break;
      case "write-test-change":
        await writeTestChange();
        break;
      case "commit-push":
        await commitAndPush();
        break;
      case "scaffold-mvp": {
        // If you combined scaffold with other tasks, run it inline here too.
        const mod = await import("./scaffold-mvp.mjs");
        await mod.run();
        break;
      }
      default:
        console.log(`Unknown task: ${task}`);
        process.exitCode = 1;
        return;
    }
  }
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exitCode = 1;
});
