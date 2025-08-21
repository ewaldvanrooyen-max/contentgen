# ContentGen Agent – Quick Guide

## What it does
- Generates Markdown posts into `content/` via `scripts/contentgen.mjs`.
- Can run locally or in GitHub Actions via `.github/workflows/contentgen.yml`.
- Commits + rebases + pushes safely.
- Produces a JSON report at `agent_reports/latest.json`.

## Requirements
- Node 20+ locally (CI uses Node 20).
- For live generations: set repo secret **OPENAI_API_KEY**.
- Optional repo variable **OPENAI_MODEL** (e.g. `gpt-4o-mini`).

## Local dry run
```bash
node scripts/contentgen.mjs --dry --max 1
