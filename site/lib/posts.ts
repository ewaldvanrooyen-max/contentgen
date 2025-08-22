import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const ROOT = path.join(process.cwd(), "..");            // repo root
const CONTENT_DIR = path.join(ROOT, "content");         // content/YYYY/MM/slug.md

export type PostMeta = {
  title: string;
  date?: string;
  description?: string;
  slug: string[]; // capture nested path: ["2025","08","some-post"]
};

export async function getAllPosts(): Promise<PostMeta[]> {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = await fg("**/*.md", { cwd: CONTENT_DIR, dot: false });

  return files.map((rel) => {
    const abs = path.join(CONTENT_DIR, rel);
    const raw = fs.readFileSync(abs, "utf8");
    const { data } = matter(raw);
    const slug = rel.replace(/\.md$/i, "").split(path.sep);

    return {
      title: data.title ?? slug[slug.length - 1].replace(/[-_]/g, " "),
      date: data.date,
      description: data.description,
      slug,
    } satisfies PostMeta;
  }).sort((a, b) => {
    // newest first if dates exist
    const da = Date.parse(a.date ?? "1970-01-01");
    const db = Date.parse(b.date ?? "1970-01-01");
    return db - da;
  });
}

export async function getPost(slug: string[]): Promise<{ meta: PostMeta; html: string } | null> {
  const file = path.join(CONTENT_DIR, ...slug) + ".md";
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  const { content, data } = matter(raw);

  const processed = await remark().use(html).process(content);
  const body = processed.toString();

  const meta: PostMeta = {
    title: data.title ?? slug[slug.length - 1].replace(/[-_]/g, " "),
    date: data.date,
    description: data.description,
    slug,
  };

  return { meta, html: body };
}
