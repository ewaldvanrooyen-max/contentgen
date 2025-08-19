// scripts/bootstrap.mjs
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

const W = (p, c) => fsp.mkdir(path.dirname(p), { recursive: true }).then(() => fsp.writeFile(p, c));
const exists = p => fs.existsSync(p);
const readJSON = p => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJSON = (p, obj) => fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");

async function ensurePkg() {
  if (!exists("package.json")) throw new Error("package.json missing. Did scaffold step run?");
  const pkg = readJSON("package.json");
  pkg.engines = { node: ">=18" };
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.dev   = "cross-env HOSTNAME=0.0.0.0 PORT=${PORT:-8080} next dev -p $PORT -H 0.0.0.0";
  pkg.scripts.start = "cross-env HOSTNAME=0.0.0.0 PORT=${PORT:-8080} next start -p $PORT -H 0.0.0.0";
  pkg.scripts.test  = "vitest run";
  pkg.dependencies  = { ...(pkg.dependencies||{}), openai: "^4.57.0", zod: "^3.23.8" };
  pkg.devDependencies = { ...(pkg.devDependencies||{}), vitest: "^2.0.5", "cross-env": "^7.0.3", "@types/node": "^20.12.12" };
  writeJSON("package.json", pkg);
}

async function ensureTS() {
  if (!exists("tsconfig.json")) return;
  const ts = readJSON("tsconfig.json");
  ts.compilerOptions = ts.compilerOptions || {};
  ts.compilerOptions.baseUrl = ".";
  ts.compilerOptions.paths = { "@/*": ["*"], "@/lib/*": ["lib/*"] };
  writeJSON("tsconfig.json", ts);
}

async function hygiene() {
  if (!exists(".gitignore")) await W(".gitignore",
`node_modules
.next
out
dist
.env
*.env
.DS_Store
.vscode/*
!.vscode/extensions.json
`);
  await W(".env.example",
`OPENAI_API_KEY=
AFFILIATE_BASE_URL=
AFFILIATE_TAG=
YOUTUBE_API_KEY=
`);
  if (!exists("README.md")) await W("README.md",
`# Auto Content Generator (MVP)

Next.js app that:
1) GET /api/trends — trending topics
2) POST /api/generate — short-form scripts + captions + 15–25 hashtags, affiliate links
3) Exports JSON or CSV
Includes rate limiting, logging, and a minimal UI.

## Local
npm ci
npm run dev
GET /api/health -> { "ok": true }
`);
}

async function writeLibs() {
  await W("lib/openai.ts",
`import OpenAI from "openai";
const key = process.env.OPENAI_API_KEY;

export async function generateScript(opts: {
  platform: "tiktok"|"reels"|"shorts";
  tone: "high-energy"|"educational"|"story";
  topic: string;
}) {
  const { platform, tone, topic } = opts;
  const system = \`You write concise short-form scripts. Return JSON: {"script":"","caption":"","hashtags":[],"cta":""}\`;
  const user = \`Platform: \${platform}\\nTone: \${tone}\\nTopic: \${topic}\\nRules:\\n- Hook first line\\n- 90–120 words\\n- 1–2 line caption\\n- 15–25 hashtags (no repeats)\\n- End with CTA\`;

  if (!key) {
    return {
      script: \`HOOK: \${topic} in 60s. 1) What it is. 2) Why it matters. 3) Quick tip. CTA: Follow for more.\`,
      caption: \`\${topic} breakdown. Save & share.\`,
      hashtags: Array.from({length:18},(_,i)=>\`#\${topic.toLowerCase().replace(/\\s+/g,'')}\${i+1}\`),
      cta: "Follow for daily shortcuts."
    };
  }
  const client = new OpenAI({ apiKey: key });
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });
  const raw = res.choices[0]?.message?.content || "{}";
  try { return JSON.parse(raw); } catch { return { script: raw, caption: "", hashtags: [], cta: "" }; }
}
`);
  await W("lib/prompts.ts",
`export type Tone = "high-energy"|"educational"|"story";
export type Platform = "tiktok"|"reels"|"shorts";
export const platformMarker = (p: Platform) => p==="tiktok"?"[TikTok]":p==="reels"?"[Reels]":"[Shorts]";
`);
  await W("lib/affiliate.ts",
`type MapEntry = { keyword: string; path: string; };
const DEFAULT_MAP: MapEntry[] = [
  { keyword: "camera", path: "/shop/camera" },
  { keyword: "headphones", path: "/shop/headphones" },
  { keyword: "ai", path: "/products/ai-tools" },
];
const BASE = process.env.AFFILIATE_BASE_URL || "";
const TAG  = process.env.AFFILIATE_TAG || "";
export function injectAffiliateLinks(text: string) {
  const found: string[] = [];
  for (const { keyword, path } of DEFAULT_MAP) {
    const rx = new RegExp(\`\\\\b\${keyword.replace(/[.*+?^${}()|[\\\\]\\\\]/g, "\\\\$&")}\\\\b\`, "i");
    if (rx.test(text)) {
      const url = joinUrl(BASE, path, TAG);
      if (url && !found.includes(url)) found.push(url);
    }
  }
  return found;
}
function joinUrl(base: string, path: string, tag: string) {
  if (!base) return "";
  const sep = base.endsWith("/") ? "" : "/";
  const url = \`\${base}\${sep}\${path.replace(/^\\//,'')}\`;
  return tag ? (url.includes("?") ? \`\${url}&\${tag}\` : \`\${url}?\${tag}\`) : url;
}
`);
  await W("lib/trends.ts",
`export type Trend = { keyword: string; score: number; source: string };
export async function fetchTrends(region="US", limit=10): Promise<Trend[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return Array.from({length:limit},(_,i)=>({ keyword:\`AI trend \${i+1}\`, score:100-i, source:"mock"}));
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part","snippet");
  url.searchParams.set("chart","mostPopular");
  url.searchParams.set("regionCode", region);
  url.searchParams.set("maxResults", String(Math.min(limit, 20)));
  url.searchParams.set("key", key);
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error(\`YouTube API \${r.status}\`);
  const j = await r.json();
  return (j.items||[]).map((it:any,i:number)=>({ keyword: it.snippet?.title || \`Video \${i+1}\`, score:100-i, source:"youtube" }));
}
`);
  await W("lib/rateLimit.ts",
`type Entry = { hits: number; resetAt: number };
const buckets = new Map<string, Entry>();
export function rateLimit(key: string, limit=30, windowMs=60_000) {
  const now = Date.now(); const e = buckets.get(key);
  if (!e || now > e.resetAt) { const resetAt = now + windowMs; buckets.set(key,{hits:1,resetAt}); return {allowed:true,remaining:limit-1,resetAt}; }
  if (e.hits >= limit) return { allowed:false, remaining:0, resetAt:e.resetAt };
  e.hits++; return { allowed:true, remaining:limit-e.hits, resetAt:e.resetAt };
}
export function logReq(route: string, ip: string, status: number, ms: number) {
  console.log(JSON.stringify({ t:new Date().toISOString(), route, ip, status, ms }));
}
`);
}

async function writeAPIsAndUI() {
  await W("app/api/health/route.ts", `import { NextResponse } from "next/server"; export function GET(){ return NextResponse.json({ ok:true }); }`);
  await W("app/api/trends/route.ts",
`import { NextRequest, NextResponse } from "next/server";
import { fetchTrends } from "@/lib/trends";
import { rateLimit, logReq } from "@/lib/rateLimit";
export async function GET(req: NextRequest) {
  const t0 = Date.now(); const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") || process.env.DEFAULT_REGION || "US";
  const limit = Number(searchParams.get("limit") || 10);
  const ip = req.headers.get("x-forwarded-for") || "local";
  const rl = rateLimit(ip, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error:"Too Many Requests" }, { status:429, headers:{ "Retry-After": String(Math.ceil((rl.resetAt-Date.now())/1000)) }});
  try { const items = await fetchTrends(region, limit); logReq("/api/trends", ip, 200, Date.now()-t0); return NextResponse.json({ region, limit, items }); }
  catch(e:any){ logReq("/api/trends", ip, 500, Date.now()-t0); return NextResponse.json({ error: e?.message || "failed" }, { status:500 }); }
}
`);
  await W("app/api/generate/route.ts",
`import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateScript } from "@/lib/openai";
import { injectAffiliateLinks } from "@/lib/affiliate";
import { rateLimit, logReq } from "@/lib/rateLimit";

const Body = z.object({
  topic: z.string().min(2),
  platforms: z.array(z.enum(["tiktok","reels","shorts"])).default(["tiktok","reels","shorts"]),
  tone: z.enum(["high-energy","educational","story"]).default("high-energy"),
  export: z.enum(["json","csv"]).optional()
});

function toCSV(rows: Record<string, any>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v:any)=>\`"\${String(v??"").replace(/"/g,'""')}"\`;
  return [headers.join(","), ...rows.map(r=>headers.map(h=>escape(Array.isArray(r[h])?r[h].join(" "):r[h])).join(","))].join("\\n");
}

export async function POST(req: NextRequest) {
  const t0 = Date.now(); const ip = req.headers.get("x-forwarded-for") || "local";
  const rl = rateLimit(ip, 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error:"Too Many Requests" }, { status:429, headers:{ "Retry-After": String(Math.ceil((rl.resetAt-Date.now())/1000)) }});

  const body = Body.safeParse(await req.json().catch(()=> ({})));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status:400 });

  const { topic, platforms, tone, export: exportAs } = body.data;
  const items = [];
  for (const platform of platforms) {
    const gen = await generateScript({ platform, tone, topic });
    const links = injectAffiliateLinks(\`\${gen.script}\\n\${gen.caption}\\n\${topic}\`).filter(Boolean);
    items.push({ topic, platform, tone, script: gen.script, caption: gen.caption, hashtags: gen.hashtags, cta: gen.cta, links });
  }
  logReq("/api/generate", ip, 200, Date.now()-t0);
  if (exportAs === "csv") return new Response(toCSV(items), { headers: { "content-type": "text/csv" }});
  return NextResponse.json({ items });
}
`);
  await W("app/page.tsx",
`"use client";
import { useState } from "react";
export default function Home() {
  const [topic, setTopic] = useState("AI pets");
  const [tone, setTone] = useState("high-energy");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  async function run(){
    setLoading(true); setData(null);
    const r = await fetch("/api/generate", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ topic, tone, platforms:["tiktok","reels","shorts"] }) });
    const j = await r.json().catch(()=> ({})); setData(j); setLoading(false);
  }
  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 20 }}>
      <h1>Auto Content Generator</h1>
      <div style={{ display:"flex", gap:12, marginTop:10 }}>
        <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Topic" style={{ flex:1, padding:8 }} />
        <select value={tone} onChange={e=>setTone(e.target.value)} style={{ padding:8 }}>
          <option value="high-energy">High-energy</option>
          <option value="educational">Educational</option>
          <option value="story">Story</option>
        </select>
        <button disabled={loading} onClick={run} style={{ padding:"8px 16px" }}>{loading?"Generating...":"Generate"}</button>
      </div>
      <pre style={{ background:"#111", color:"#eee", padding:16, marginTop:20, whiteSpace:"pre-wrap" }}>
        {data ? JSON.stringify(data, null, 2) : "Results will appear here."}
      </pre>
    </main>
  );
}
`);
}

async function writeTests() {
  await W("tests/prompts.test.ts",
`import { platformMarker } from "../lib/prompts";
import { describe, it, expect } from "vitest";
describe("prompts", () => {
  it("markers differ", () => {
    expect(platformMarker("tiktok")).not.toEqual(platformMarker("reels"));
  });
});
`);
  await W("tests/affiliate.test.ts",
`import { injectAffiliateLinks } from "../lib/affiliate";
import { describe, it, expect } from "vitest";
describe("affiliate", () => {
  it("finds links", () => {
    const links = injectAffiliateLinks("Best AI camera and headphones");
    expect(links.length).toBeGreaterThan(0);
  });
  it("no duplicates", () => {
    const links = injectAffiliateLinks("camera camera camera");
    const set = new Set(links);
    expect(links.length).toBe(set.size);
  });
});
`);
}

await ensurePkg();
await ensureTS();
await hygiene();
await writeLibs();
await writeAPIsAndUI();
await writeTests();
console.log("Bootstrap complete.");
