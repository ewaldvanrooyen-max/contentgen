// scripts/bootstrap.mjs
import fs from "fs"; import path from "path";
const ex = p => fs.existsSync(p);
const rj = p => JSON.parse(fs.readFileSync(p,"utf8"));
const wj = (p,o) => { fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p, JSON.stringify(o,null,2)+"\n"); };
const wt = (p,c) => { fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,c); };

function ensurePkg(){
  if(!ex("package.json")) throw new Error("package.json missing.");
  const pkg = rj("package.json");
  pkg.name ||= "contentgen"; pkg.private ??= true; pkg.engines = { node: ">=18" };
  pkg.scripts ||= {};
  pkg.scripts.dev   = "cross-env HOSTNAME=0.0.0.0 PORT=${PORT:-8080} next dev -p $PORT -H 0.0.0.0";
  pkg.scripts.start = "cross-env HOSTNAME=0.0.0.0 PORT=${PORT:-8080} next start -p $PORT -H 0.0.0.0";
  pkg.scripts.build ||= "next build";
  pkg.scripts.test  = "vitest run";
  pkg.dependencies = { ...(pkg.dependencies||{}), openai:"^4.57.0", zod:"^3.23.8" };
  pkg.devDependencies = { ...(pkg.devDependencies||{}), vitest:"^2.0.5", "cross-env":"^7.0.3", "@types/node":"^20.12.12" };
  wj("package.json", pkg);
}

function ensureTS(){
  if(!ex("tsconfig.json")){
    wj("tsconfig.json", {
      compilerOptions:{ target:"ES2020", lib:["dom","dom.iterable","es2020"], allowJs:true, skipLibCheck:true, strict:true,
        noEmit:true, esModuleInterop:true, module:"esnext", moduleResolution:"bundler", resolveJsonModule:true, isolatedModules:true,
        jsx:"preserve", baseUrl:".", paths:{ "@/*":["*"], "@/lib/*":["lib/*"] } },
      include:["next-env.d.ts","**/*.ts","**/*.tsx"], exclude:["node_modules"]
    });
  } else {
    const ts = rj("tsconfig.json");
    ts.compilerOptions ||= {}; ts.compilerOptions.baseUrl = "."; ts.compilerOptions.paths = { "@/*":["*"], "@/lib/*":["lib/*"] };
    wj("tsconfig.json", ts);
  }
}

function hygiene(){
  if(!ex(".gitignore")) wt(".gitignore", `node_modules
.next
out
dist
.env
*.env
.DS_Store
.vscode/*
!.vscode/extensions.json
`);
  wt(".env.example", `OPENAI_API_KEY=
AFFILIATE_BASE_URL=
AFFILIATE_TAG=
YOUTUBE_API_KEY=
`);
  if(!ex("README.md")) wt("README.md", `# Auto Content Generator (MVP)
1) GET /api/trends
2) POST /api/generate
Exports JSON/CSV. Local: npm ci && npm run dev → /api/health -> {"ok":true}
`);
}

function writeApp(){
  wt("app/api/health/route.ts", `import { NextResponse } from "next/server"; export function GET(){ return NextResponse.json({ ok:true }); }`);
  wt("lib/rateLimit.ts", `type Entry={hits:number;resetAt:number}; const buckets=new Map<string,Entry>();
export function rateLimit(key:string,limit=30,windowMs=60_000){const now=Date.now(); const e=buckets.get(key); if(!e||now>e.resetAt){const resetAt=now+windowMs; buckets.set(key,{hits:1,resetAt}); return {allowed:true,remaining:limit-1,resetAt};}
if(e.hits>=limit) return {allowed:false,remaining:0,resetAt:e.resetAt}; e.hits++; return {allowed:true,remaining:limit-e.hits,resetAt:e.resetAt};}
export function logReq(route:string,ip:string,status:number,ms:number){console.log(JSON.stringify({t:new Date().toISOString(),route,ip,status,ms}));}`);
}

function main(){ try{ console.log("Bootstrap: start"); ensurePkg(); ensureTS(); hygiene(); writeApp(); console.log("Bootstrap: complete"); } catch(e){ console.error(String(e)); process.exit(1); } }
main();
