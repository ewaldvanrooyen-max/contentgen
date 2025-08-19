#!/usr/bin/env node
// Minimal push agent with YAML checks.
import { execSync } from "node:child_process";
import fs from "node:fs";
import fg from "fast-glob";
import * as YAML from "yaml";

const args = new Set(process.argv.slice(2));
const get = (k, d) => { const a = process.argv.slice(2); const i = a.indexOf(k); return i >= 0 && a[i+1] ? a[i+1] : d; };

const APPLY = args.has("--apply");
const DO_CHECK = !args.has("--no-check");
const FIX_TABS = args.has("--fix");
const COMMIT = get("--commit", "chore(agent): automated push");
const REMOTE = get("--remote", process.env.AGENT_REMOTE || "origin");
let BRANCH = get("--branch", process.env.AGENT_BRANCH || "");

function sh(cmd){ return execSync(cmd,{stdio:["ignore","pipe","pipe"],encoding:"utf8"}).trim(); }
function safe(cmd){ console.log("›",cmd); return sh(cmd); }

function ensureGit(){ try{ sh("git rev-parse --is-inside-work-tree"); } catch{ console.error("Not a git repo. Run `git init && git remote add origin <url>`"); process.exit(1); } }
function currentBranch(){ try{ const b=sh("git rev-parse --abbrev-ref HEAD"); return b==="HEAD"?"":b; } catch{ return ""; } }
function hasChanges(){ try{ sh("git update-index -q --refresh"); } catch{} return sh("git status --porcelain").length>0; }

const isWorkflow = p => p.replace(/\\/g,"/").startsWith(".github/workflows/");
async function listYaml(){ return fg(["**/*.yml","**/*.yaml","!node_modules/**","!.git/**"],{dot:true}); }
const fixTabs = s => s.replace(/\t/g,"  ");

function validateWorkflow(doc){
  const errs=[]; const root=doc.toJS({maxAliasCount:100});
  const t=v=>Object.prototype.toString.call(v).slice(8,-1);
  if(!root || t(root)!=="Object"){ errs.push("Top-level YAML must be an object."); return errs; }
  if(!("on" in root)) errs.push('Missing top-level "on".');
  if(!("jobs" in root)) errs.push('Missing top-level "jobs".');
  const jobs=root.jobs;
  if(jobs && t(jobs)==="Object"){
    for(const [name,job] of Object.entries(jobs)){
      if(t(job)!=="Object"){ errs.push(`jobs.${name} must be an object.`); continue; }
      if(!("runs-on" in job)) errs.push(`jobs.${name} missing "runs-on".`);
      if(!("steps" in job)) errs.push(`jobs.${name} missing "steps".`);
      const steps=job.steps;
      if(Array.isArray(steps)){
        steps.forEach((st,i)=>{
          if(t(st)!=="Object") errs.push(`jobs.${name}.steps[${i}] must be an object.`);
          else if(!("run" in st) && !("uses" in st)) errs.push(`jobs.${name}.steps[${i}] needs "run" or "uses".`);
        });
      }
    }
  }
  return errs;
}

async function checkYaml({fixTabsFirst=false}={}){
  const files=await listYaml(); const problems=[];
  for(const file of files){
    let src=fs.readFileSync(file,"utf8");
    if(fixTabsFirst && /\t/.test(src)){ src=fixTabs(src); fs.writeFileSync(file,src,"utf8"); console.log(`fixed tabs → spaces: ${file}`); }
    const doc=YAML.parseDocument(src,{prettyErrors:true});
    if(doc.errors?.length){
      for(const e of doc.errors){ problems.push({file,msg:e.message,line:e.linePos?.[0]?.line,col:e.linePos?.[0]?.col}); }
    } else if(isWorkflow(file)){
      for(const msg of validateWorkflow(doc)) problems.push({file,msg});
    }
  }
  return {ok: problems.length===0, problems, files};
}

function commitAndPush(message){
  safe("git add -A");
  if(hasChanges()){ safe(`git commit -m "${message.replace(/"/g,'\\"')}"`); }
  else { console.log("No changes to commit."); }
  if(!BRANCH) BRANCH = currentBranch() || "main";
  try { sh(`git rev-parse --abbrev-ref --symbolic-full-name ${BRANCH}@{u}`); safe(`git push ${REMOTE} ${BRANCH}`); }
  catch { safe(`git push -u ${REMOTE} ${BRANCH}`); }
  console.log("✓ Push complete.");
}

(async function main(){
  ensureGit();
  if(DO_CHECK){
    const {ok,problems,files}=await checkYaml({fixTabsFirst:FIX_TABS});
    if(!ok){
      console.error("\nYAML check failed:");
      for(const p of problems){ const where=p.line?`:${p.line}${p.col?":"+p.col:""}`:""; console.error(`  - ${p.file}${where}  ${p.msg}`); }
      console.error("\nRefusing to push. Fix YAML or use --no-check if you enjoy chaos.");
      process.exit(2);
    }
    console.log(`YAML check passed (${files.length} file${files.length===1?"":"s"}).`);
  }
  if(APPLY) commitAndPush(COMMIT);
  else console.log("Dry run complete. Add --apply to commit/push.");
})().catch(e=>{ console.error(e?.stack||e); process.exit(1); });
