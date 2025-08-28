# contentgen

## Prerequisites

- Node.js 18 or higher
- npm 10 or higher

## Setup

From the repository root:

```bash
cd web
npm ci        # install dependencies (or `npm install` if no lockfile)
cp ../.env.example .env.local  # create your local environment file and fill the values
npm run dev   # start the development server
```

This will start the Next.js development server on port 3001 as defined in `package.json`.

## Scripts

Inside the `web` directory you can run the following npm scripts:

- `npm run dev` – Start the development server with hot reload.
- `npm run build` – Build the production application.
- `npm run start` – Run the built app in production mode.
- `npm run lint` – Run ESLint for code quality.
- `npm run type-check` – Run the TypeScript compiler to check types without emitting code.

## Environment Variables

Copy `.env.example` to `.env.local` and provide values for these keys:

- `NEXT_PUBLIC_APP_NAME` – Public name of the app.
- `OPENAI_API_KEY` – API key for OpenAI services.
- `YOUTUBE_API_KEY` – API key for YouTube (if used).
- `GITHUB_CLIENT_ID` – GitHub OAuth app client ID.
- `GITHUB_CLIENT_SECRET` – GitHub OAuth app client secret.

Never commit real secret values. Add the same keys in the Vercel project settings when deploying.

## Deployment

This project is configured to deploy on [Vercel](https://vercel.com/). The `web` directory contains the Next.js app and uses `output: 'standalone'` in `next.config.js` to generate a self‑contained build.

To deploy:

1. Connect the GitHub repository to Vercel.
2. Set the **Root Directory** to `web` in the Vercel project settings.
3. Set the build command to `npm run build` and output directory to `.next` (or leave default if using `Next.js` preset).
4. Add the required environment variables in the Vercel dashboard.
5. Ensure your Vercel project is using Node.js 18 or later.

On each push to `main`, Vercel will build and deploy a preview or production version depending on branch.
