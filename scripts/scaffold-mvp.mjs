#!/usr/bin/env node
// scripts/scaffold-mvp.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  const exists = fs.existsSync(filePath);
  const same = exists && fs.readFileSync(filePath, "utf8") === content;
  if (!same) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(same ? `kept ${filePath}` : `${exists ? "updated" : "created"} ${filePath}`);
  } else {
    console.log(`unchanged ${filePath}`);
  }
}

/* ---------- file contents (trimmed, but complete and runnable) ---------- */

const files = {
  ".env.example": `OPENAI_API_KEY=
AFFILIATE_BASE_URL=https://example.com/product
AFFILIATE_TAG=your-tag
YOUTUBE_API_KEY=
`,
  ".gitignore": `node_modules
.next
out
.env
.env.*
!.env.example
agent_reports
`,
  "package.json": `{
  "name": "contentgen",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "14.2.5",
    "openai": "^4.58.0",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^20.12.12",
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.23",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  }
}
`,
  "README.md": `# Content Generator (MVP)

Next.js app that:
1) Fetches trending topics
2) Generates short-form scripts (TikTok / Reels / Shorts) with tone toggles
3) Writes captions + 15–25 hashtags
4) Injects affiliate links from a keyword→URL map
5) Exports JSON/CSV

## Routes
- GET /api/trends
- POST /api/generate

## Setup
- Copy .env.example to .env.local and fill values
- npm i
- npm run dev
`,
  "vitest.config.ts": `import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] }
});
`,
  "src/lib/openai.ts": `import OpenAI from "openai";
const apiKey = process.env.OPENAI_API_KEY;
export const openai = new OpenAI({ apiKey });
export async function chatJSON<T>(prompt: string, system = "You are a helpful assistant."): Promise<T> {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt + "\\n\\nReturn only valid JSON. Do not wrap in code fences." }
    ],
    response_format: { type: "json_object" }
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  try { return JSON.parse(raw) as T; } catch { throw new Error("OpenAI returned non-JSON response."); }
}
`,
  "src/lib/prompts.ts": `export type Platform = "tiktok"|"reels"|"shorts";
export type Tone = "high-energy"|"educational"|"story";
export function buildScriptPrompt(topic: string, platform: Platform, tone: Tone) {
  const platformNote = platform==="tiktok" ? "TikTok: hook fast."
    : platform==="reels" ? "Instagram Reels: visual beats."
    : "YouTube Shorts: hook, punch, CTA.";
  const toneNote = tone==="high-energy" ? "High-energy."
    : tone==="educational" ? "Educational."
    : "Story-driven.";
  return \`Create a short-form script for \${platform.toUpperCase()} about "\${topic}".
\${platformNote} \${toneNote}
Requirements:
- 80–140 words in numbered beats (1–6).
- Beat 1 is hook. Final beat is CTA.
Also create: one 100–140 char caption and 15–25 hashtags (lowercase).
Return JSON: { "script": "...", "caption": "...", "hashtags": ["#.."] }\`;
}
`,
  "src/lib/affiliate.ts": `export function toAffiliateUrl(keyword: string, map?: Record<string,string>) {
  if (map && map[keyword]) return map[keyword];
  const base = process.env.AFFILIATE_BASE_URL || ""; const tag = process.env.AFFILIATE_TAG || "";
  if (!base) return "";
  const u = new URL(base); if (tag) u.searchParams.set("tag", tag); u.searchParams.set("q", keyword);
  return u.toString();
}
export function injectAffiliateLinks(text: string, keywordMap: Record<string,string>) {
  let out = text;
  for (const [kw, url] of Object.entries(keywordMap)) {
    if (!kw || !url) continue;
    const safe = kw.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
    const re = new RegExp(\`\\\\b(\${safe})\\\\b\`, "i");
    out = out.replace(re, \`[$1](\${url})\`);
  }
  return out;
}
`,
  "src/lib/trends.ts": `type Trend = { title: string; id?: string };
export async function fetchTrends(region="US"): Promise<Trend[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (key) {
    try {
      const url = \`https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=10&regionCode=\${region}&key=\${key}\`;
      const r = await fetch(url); if (!r.ok) throw 0;
      const d = await r.json(); return (d.items||[]).map((i:any)=>({ title: i.snippet?.title??"Untitled", id: i.id }));
    } catch {}
  }
  return [
    { title: "AI side hustles that actually work" },
    { title: "Morning routine hacks for focus" },
    { title: "Beginner crypto security mistakes" },
    { title: "How to edit Reels faster" },
    { title: "Passive income tools in 2025" }
  ];
}
`,
  "src/lib/logger.ts": `export const logInfo=(s:string,m:string,x?:unknown)=>console.log(\`[\${new Date().toISOString()}] [\${s}] \${m}\`,x??"");
export const logWarn=(s:string,m:string,x?:unknown)=>console.warn(\`[\${new Date().toISOString()}] [\${s}] \${m}\`,x??"");
export const logError=(s:string,m:string,x?:unknown)=>console.error(\`[\${new Date().toISOString()}] [\${s}] \${m}\`,x??"");
`,
  "src/lib/rateLimit.ts": `type Bucket={hits:number[]}; const W=60000,L=30; const buckets=new Map<string,Bucket>();
export function rateLimit(key:string){const n=Date.now();const b=buckets.get(key)||{hits:[]};b.hits=b.hits.filter(ts=>n-ts<W);
 if(b.hits.length>=L){const retry=W-(n-b.hits[0]);buckets.set(key,b);return{ok:false,retryAfter:retry} as const;}
 b.hits.push(n); buckets.set(key,b); return {ok:true} as const;}
export function keyFromRequest(req:Request){const ip=(req.headers.get("x-forwarded-for")||"").split(",")[0].trim();return ip||"anon";}
`,
  "src/app/api/trends/route.ts": `import { NextResponse } from "next/server";
import { fetchTrends } from "@/src/lib/trends";
import { keyFromRequest, rateLimit } from "@/src/lib/rateLimit";
export async function GET(req: Request) {
  const k = keyFromRequest(req); const rl = rateLimit("trends:"+k);
  if (!rl.ok) return NextResponse.json({ error:"rate_limited", retryAfter: rl.retryAfter }, { status:429 });
  const region = new URL(req.url).searchParams.get("region") ?? "US";
  const items = await fetchTrends(region);
  return NextResponse.json({ region, items });
}
`,
  "src/app/api/generate/route.ts": `import { NextResponse } from "next/server";
import { z } from "zod";
import { buildScriptPrompt, Platform, Tone } from "@/src/lib/prompts";
import { chatJSON } from "@/src/lib/openai";
import { injectAffiliateLinks, toAffiliateUrl } from "@/src/lib/affiliate";
import { keyFromRequest, rateLimit } from "@/src/lib/rateLimit";

const Body = z.object({
  topic: z.string().min(3),
  platform: z.enum(["tiktok","reels","shorts"]),
  tone: z.enum(["high-energy","educational","story"]),
  keywordUrlMap: z.record(z.string()).optional()
});
type Out = { script: string; caption: string; hashtags: string[]; };

export async function POST(req: Request) {
  const k = keyFromRequest(req); const rl = rateLimit("generate:"+k);
  if (!rl.ok) return NextResponse.json({ error:"rate_limited", retryAfter: rl.retryAfter }, { status:429 });

  const json = await req.json().catch(()=>({})); const body = Body.safeParse(json);
  if (!body.success) return NextResponse.json({ error:"bad_request", details: body.error.flatten() }, { status:400 });

  const { topic, platform, tone, keywordUrlMap } = body.data;
  const prompt = buildScriptPrompt(topic, platform as Platform, tone as Tone);
  const res = await chatJSON<Out>(prompt, "You are a short-form scriptwriter.");

  const map: Record<string,string> = { ...(keywordUrlMap||{}) };
  for (const tag of res.hashtags) {
    const kw = tag.replace(/^#/,"").replace(/_/g," ");
    const url = toAffiliateUrl(kw, keywordUrlMap);
    if (url) map[kw] = url;
  }
  const script = injectAffiliateLinks(res.script, map);
  const caption = injectAffiliateLinks(res.caption, map);

  return NextResponse.json({ topic, platform, tone, script, caption, hashtags: res.hashtags, affiliateLinks: map });
}
`,
  "src/app/page.tsx": `\"use client\";
import { useState } from "react";
export default function Page(){
  const [topic,setTopic]=useState(""); const [platform,setPlatform]=useState("tiktok"); const [tone,setTone]=useState("high-energy");
  const [busy,setBusy]=useState(false); const [data,setData]=useState<any>(null); const [err,setErr]=useState<string|null>(null);
  async function run(){ setBusy(true); setErr(null); setData(null);
    try{ const r=await fetch("/api/generate",{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({topic,platform,tone})}); const j=await r.json(); if(!r.ok) throw new Error(j?.error||"fail"); setData(j);
    } catch(e:any){ setErr(e.message||"error"); } finally{ setBusy(false); } }
  function dl(name:string,text:string,type:string){ const b=new Blob([text],{type}); const u=URL.createObjectURL(b);
    const a=document.createElement("a"); a.href=u; a.download=name; a.click(); URL.revokeObjectURL(u); }
  function exJSON(){ if(!data) return; dl("content.json", JSON.stringify(data,null,2), "application/json"); }
  function exCSV(){ if(!data) return; const rows=[["topic","platform","tone","caption","script","hashtags"],
    [data.topic,data.platform,data.tone, JSON.stringify(data.caption).replaceAll('\"','\"\"'),
     JSON.stringify(data.script).replaceAll('\"','\"\"'), data.hashtags.join(" ")]]; 
    const csv=rows.map(r=>r.map(v=>\`\"\${String(v)}\"\`).join(",")).join("\\n"); dl("content.csv", csv, "text/csv"); }
  return (<main className="max-w-3xl mx-auto p-6">
    <h1 className="text-2xl font-semibold mb-4">Content Generator</h1>
    <div className="space-y-3">
      <input className="w-full border rounded p-2" placeholder="Topic" value={topic} onChange={e=>setTopic(e.target.value)}/>
      <div className="flex gap-2">
        <select className="border rounded p-2" value={platform} onChange={e=>setPlatform(e.target.value)}>
          <option value="tiktok">TikTok</option><option value="reels">Reels</option><option value="shorts">Shorts</option>
        </select>
        <select className="border rounded p-2" value={tone} onChange={e=>setTone(e.target.value)}>
          <option value="high-energy">High-energy</option><option value="educational">Educational</option><option value="story">Story</option>
        </select>
        <button className="px-4 py-2 rounded bg-black text-white disabled:opacity-50" onClick={run} disabled={!topic||busy}>{busy?"Generating…":"Generate"}</button>
      </div>
    </div>
    {err && <p className="text-red-600 mt-4">{err}</p>}
    {data && (<section className="mt-6 space-y-4">
      <div className="flex gap-2"><button className="px-3 py-2 border rounded" onClick={()=>exJSON()}>Export JSON</button>
        <button className="px-3 py-2 border rounded" onClick={()=>exCSV()}>Export CSV</button></div>
      <div className="border rounded p-3"><h2 className="font-semibold mb-1">Caption</h2><p>{data.caption}</p></div>
      <div className="border rounded p-3"><h2 className="font-semibold mb-1">Script</h2><pre className="whitespace-pre-wrap">{data.script}</pre></div>
      <div className="border rounded p-3"><h2 className="font-semibold mb-1">Hashtags</h2><p>{data.hashtags.join(" ")}</p></div>
    </section>)}
  </main>); }
`,
  "tests/prompts.test.ts": `import { describe, it, expect } from "vitest";
import { buildScriptPrompt } from "../src/lib/prompts";
describe("prompts", ()=>{ it("mentions topic and JSON keys", ()=>{
  const p=buildScriptPrompt("test topic","tiktok","educational");
  expect(p).toContain("test topic"); expect(p.toLowerCase()).toContain("tiktok"); expect(p).toContain('"script"');
});});
`,
  "tests/affiliate.test.ts": `import { describe, it, expect } from "vitest";
import { injectAffiliateLinks } from "../src/lib/affiliate";
describe("affiliate", ()=>{ it("links first occurrence", ()=>{
  const t="coffee coffee"; const out=injectAffiliateLinks(t,{coffee:"https://e.com?q=coffee"}); 
  expect(out).toMatch(/\\[coffee\\]\\(https:\\/\\/e\\.com\\?q=coffee\\)/);
});});
`
};

/* ----------------- write files ----------------- */
export async function run() {
  const root = path.resolve(__dirname, "..");
  for (const [p, c] of Object.entries(files)) {
    writeFile(path.join(root, p), c);
  }
  console.log("Scaffold complete.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(e => { console.error(e); process.exit(1); });
}
