name: contentgen-agent

permissions:
  contents: write

on:
  workflow_dispatch:
    inputs:
      region:
        description: "Default trends region"
        required: false
        default: "US"

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    env:
      CI: "true"
      NEXT_TELEMETRY_DISABLED: "1"
      REGION: ${{ inputs.region }}
      # Deploy (only used if present)
      VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      # App secrets
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      AFFILIATE_BASE_URL: ${{ secrets.AFFILIATE_BASE_URL }}
      AFFILIATE_TAG: ${{ secrets.AFFILIATE_TAG }}
      YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Debug - initial tree
        run: pwd && ls -la || true

      - name: Ensure project scaffold (safe for non-empty repo)
        shell: bash
        run: |
          set -euo pipefail
          if [ ! -f package.json ]; then
            echo "Scaffolding Next.js into ./app then moving to repo root..."
            npx --yes create-next-app@latest app --ts --app --src-dir --eslint --use-npm
            shopt -s dotglob nullglob
            mv app/* .
            rmdir app
          else
            echo "package.json exists; skipping scaffold."
          fi

      - name: Debug - post-scaffold tree
        run: ls -la && node -e "try{console.log(require('./package.json').name||'no-name')}catch(e){console.log('no-package')}"

      - name: Bootstrap content generator files
        run: node scripts/bootstrap.mjs

      - name: Install deps
        run: npm ci || npm i

      - name: Build
        run: npm run build

      - name: Test
        run: npm run test --if-present

      - name: Commit and push changes
        run: |
          git config user.name "contentgen-agent"
          git config user.email "actions@users.noreply.github.com"
          git add -A
          if git diff --cached --quiet; then
            echo "No changes to commit."
          else
            git commit -m "chore(agent): scaffold/update content generator"
            git push || true
          fi

      - name: Deploy to Vercel (Production)
        if: ${{ env.VERCEL_TOKEN && env.VERCEL_ORG_ID && env.VERCEL_PROJECT_ID }}
        run: |
          npm i -g vercel@latest
          vercel pull --yes --environment=production --token="$VERCEL_TOKEN"
          DEPLOY_URL=$(vercel deploy --prod --token="$VERCEL_TOKEN")
          echo "DEPLOY_URL=$DEPLOY_URL" >> $GITHUB_ENV

      - name: Show Deployment URL
        if: ${{ env.DEPLOY_URL }}
        run: echo "Deployed: $DEPLOY_URL"
