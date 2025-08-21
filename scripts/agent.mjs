#!/usr/bin/env node
// Minimal repo agent with dry-run mode, YAML checks, smart push+rebase,
// and a PR task. Safe to overwrite your current agent.mjs.
// Node 18+ recommended.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import * as YAML from "yaml";

/* ----------------------- CLI PARSING ----------------------- */

const argv = process.argv.slice(2);
function all(flag) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === flag && argv[i + 1]) out.push(argv[++i]);
  }
  return out;
}
function get(flag, def = "") {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}
const HAS = (flag) => argv.includes(flag);

const DO_APPLY = HAS("--apply");
const TASK_NAMES = all("--task");

/* ----------------------- UTILITIES ------------------------- */

function log(msg) {
  console.log(msg);
}
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function sh(cmd, opts = {}) {
  const show = (DO_APPLY ? "›" : "• dryrun:") + " " + cmd;
  console.log(show);
  if (!DO_APPLY) return "";
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...opts }).trim();
}
function safe(cmd, opts = {}) {
  try {
    return sh(cmd, opts);
  } catch (err) {
    console.error(err?.stdout || err?.message || String(err));
    throw err;
  }
}
function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
function read(p) {
  return fs.readFileSync(p, "utf8");
}
function write(p, s) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
}
function nowISO() {
  return new Date().toISOString();
}
function currentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
    }).trim();
  } catch {
    return "main";
  }
}
function escapeMsg(s) {
  return s.replace(/"/g, '\\"');
}

/* ----------------------- TASKS ----------------------------- */

// 1) Diagnostics
async function taskDiagnose() {
  log("# diagnose");
  log(execSync("node -v", { encoding: "utf8" }).trim());
  try {
    const last = execSync("git --no-pager log -n1 --oneline", {
      encoding: "utf8",
    }).trim();
    log(last);
  } catch {}
  return true;
}

// 2) YAML check (.github/workflows/*.yml|yaml) + conflict markers
async function taskYamlCheck() {
  log("# yaml-check");
  const files = await fg([".github/workflows/*.yml", ".github/workflows/*.yaml"], {
    dot: true,
  });
  const errors = [];

  // conflict marker grep
  try {
    const grep = execSync('git grep -nE "^(<{7}|={7}|>{7})"', {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    if (grep) {
      errors.push(
        "Conflict markers found:\n" + grep + "\nResolve conflicts before continuing."
      );
    }
  } catch {
    // git grep returns non-zero when nothing found; ignore
  }

  for (const f of files) {
    const txt = read(f);
    try {
      YAML.parse(txt);
    } catch (e) {
      errors.push(`${f}: ${e.message}`);
    }
  }

  if (errors.length) {
    errors.forEach((e) => console.error(e));
    throw new Error(`YAML check failed (${errors.length} issue${errors.length > 1 ? "s" : ""}).`);
  }
  log(`YAML check passed (${files.length} file${files.length === 1 ? "" : "s"}).`);
  return true;
}

// 3) Write a tiny change (smoke)
async function taskWriteTestChange() {
  const p = "AGENT_TEST.txt";
  const line = `agent ping ${nowISO()}\n`;
  const prev = fileExists(p) ? read(p) : "";
  write(p, prev + line);
  log(`Appended test line to ${p}`);
  return true;
}

// 4) Commit & push with rebase-on-reject
async function taskCommitPush() {
  const msg = get("--commit", "chore(agent): automated change");
  const branch = currentBranch();

  safe("git add -A || true");
  try {
    safe(`git commit -m "${escapeMsg(msg)}"`);
  } catch {
    log("No changes to commit.");
  }

  let pushed = false;
  try {
    safe(`git push -u origin ${branch}`);
    pushed = true;
  } catch {
    log("Push rejected (non-fast-forward). Rebasing onto remote and retrying...");
  }

  if (!pushed) {
    try {
      safe("git fetch origin");
      safe(`git rebase origin/${branch}`);
      safe(`git push -u origin ${branch}`);
      pushed = true;
    } catch (e) {
      log(
        "Push still failed after rebase. Resolve conflicts, then:\n" +
          "  git status\n" +
          "  # fix files, git add -A, git rebase --continue\n"
      );
      throw e;
    }
  }

  return true;
}

// 5) Scaffold MVP (calls external script if present)
async function taskScaffoldMVP() {
  const entry = "scripts/scaffold-mvp.mjs";
  if (!fileExists(entry)) {
    log(`No ${entry} found. Skipping scaffold (nothing to do).`);
    return true;
  }
  safe(`node ${entry}`);
  return true;
}

// 6) Create PR: create branch, commit if needed, push, open PR
async function taskPR() {
  const BASE = get("--base", process.env.PR_BASE || "main");
  const rawCommit = get("--commit", "chore(agent): automated change");
  const BRANCH =
    get("--branch") ||
    `agent/${slugify(rawCommit).slice(0, 40)}-${Date.now().toString(36)}`;

  // Ensure base is up-to-date locally
  safe(`git fetch origin ${BASE}`);

  // Create or reuse branch
  try {
    safe(`git checkout -b ${BRANCH}`);
  } catch {
    safe(`git checkout ${BRANCH}`);
  }

  // Stage/commit if needed
  safe(`git add -A || true`);
  try {
    safe(`git commit -m "${escapeMsg(rawCommit)}"`);
  } catch {
    // no-op when there is nothing to commit
  }

  // Push
  safe(`git push -u origin ${BRANCH}`);

  // Try to create PR via gh; otherwise print compare URL
  try {
    safe(`gh pr create --fill --base ${BASE} --head ${BRANCH}`);
  } catch {
    let remote = "";
    try {
      remote = execSync("git config --get remote.origin.url", {
        encoding: "utf8",
      }).trim();
    } catch {}
    const m = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
    const repo = m ? m[1] : "<owner>/<repo>";
    log(`Open PR: https://github.com/${repo}/compare/${BASE}...${BRANCH}?expand=1`);
  }

  return true;
}

/* ----------------------- TASK REGISTRY --------------------- */

const TASKS = {
  diagnose: taskDiagnose,
  "yaml-check": taskYamlCheck,
  "write-test-change": taskWriteTestChange,
  "commit-push": taskCommitPush,
  "scaffold-mvp": taskScaffoldMVP,
  pr: taskPR,
};

/* ----------------------- MAIN ------------------------------ */

async function main() {
  if (TASK_NAMES.length === 0) {
    log(`Usage:
  node scripts/agent.mjs [--apply] --task <name> [--task <name> ...] [--commit "msg"]

Tasks:
  diagnose           Show Node/git info
  yaml-check         Lint .github/workflows YAML and conflict markers
  write-test-change  Append a line to AGENT_TEST.txt
  commit-push        Commit (if needed) and push with smart rebase
  scaffold-mvp       Call scripts/scaffold-mvp.mjs if present
  pr                 Create branch, commit if needed, push, open PR

Examples:
  node scripts/agent.mjs --task diagnose --task yaml-check
  node scripts/agent.mjs --apply --task write-test-change --task commit-push --commit "chore(agent): test push"
  node scripts/agent.mjs --apply --task pr --commit "chore(agent): test PR" --base main
`);
    return;
  }

  if (!DO_APPLY) {
    log("Dry run. Add --apply to make changes.\n");
  }

  for (const name of TASK_NAMES) {
    const fn = TASKS[name];
    if (!fn) throw new Error(`Unknown task: ${name}`);
    await fn();
  }

  // Optional JSON report (handy for future automation)
  const report = {
    node: process.version,
    lastCommits: tryRead(() =>
      execSync("git --no-pager log -n3 --oneline", { encoding: "utf8" }).trim()
    ),
    ran: TASK_NAMES,
    apply: DO_APPLY,
    ts: nowISO(),
  };
  fs.mkdirSync("agent_reports", { recursive: true });
  fs.writeFileSync("agent_reports/latest.json", JSON.stringify(report, null, 2));
  log("Wrote agent_reports/latest.json");
}
function tryRead(fn) {
  try {
    return fn();
  } catch {
    return "";
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exitCode = 1;
});
