import path from "node:path";
import { promises as fs } from "node:fs";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import gfm from "remark-gfm";

const repoRoot = path.resolve(process.cwd(), ".."); // web/ -> repo root
const contentDir = path.join(repoRoot, "content");

export type Post = {
  slug: string;
  title: string;
  date?: string;
  description?: string;
  contentHtml?: string;
  path: string; // absolute .md path
};

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(p);
    } else if (e.isFile() && /\.md$/i.test(e.name)) {
      yield p;
    }
  }
}

// Pull H1 as a fallback title
function fallbackTitleFromMarkdown(md: string): string | undefined {
  const match = md.match(/^#\s+(.+)\s*$/m);
  return match?.[1]?.trim();
}

export async function getAllPosts(): Promise<Post[]> {
  try {
    await fs.access(contentDir);
  } catch {
    return [];
  }

  const out: Post[] = [];
  for await (const file of walk(contentDir)) {
    const raw = await fs.readFile(file, "utf8");
    const fm = matter(raw);
    const rel = path.relative(contentDir, file);
    const slug = rel.replace(/\.md$/i, "").replace(/\\/g, "/");
    const title = (fm.data.title as string) ?? fallbackTitleFromMarkdown(fm.content) ?? slug;
    const date = (fm.data.date as string) ?? undefined;
    const description = (fm.data.description as string) ?? undefined;

    out.push({ slug, title, date, description, path: file });
  }

  // newest first by date in filename or frontmatter
  out.sort((a, b) => {
    const ad = a.date ?? a.slug;
    const bd = b.date ?? b.slug;
    return bd.localeCompare(ad);
  });
  return out;
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const filePath = path.join(contentDir, slug + ".md");
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const fm = matter(raw);
    const title = (fm.data.title as string) ?? fallbackTitleFromMarkdown(fm.content) ?? slug;
    const processed = await remark().use(gfm).use(html).process(fm.content);
    const contentHtml = processed.toString();
    const date = (fm.data.date as string) ?? undefined;
    const description = (fm.data.description as string) ?? undefined;

    return { slug, title, date, description, contentHtml, path: filePath };
  } catch {
    return null;
  }
}
