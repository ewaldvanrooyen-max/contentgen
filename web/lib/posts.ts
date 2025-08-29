import fs from 'node:fs';
import path from 'node:path';

export type Post = {
  slug: string;
  title: string;
  contentHtml: string;
    date?: string;
  description?: string;
};

function mdToHtml(md: string): string {
  return md
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\n$/gim, '<br/>');
}

export function getAllPosts(): Post[] {
  const root = path.join(process.cwd(), 'content');
  const posts: Post[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const s = fs.statSync(p);
      if (s.isDirectory()) walk(p);
      else if (name.endsWith('.md')) {
        const slug = p.replace(root + path.sep, '').replace(/\.md$/, '');
        const md = fs.readFileSync(p, 'utf8');
        const title = (md.match(/^# (.*)$/m)?.[1]) ?? slug.split('/').pop() ?? slug;
        posts.push({ slug, title, contentHtml: mdToHtml(md) });
      }
    }
  };
  if (fs.existsSync(root)) walk(root);
  posts.sort((a, b) => (a.slug < b.slug ? 1 : -1));
  return posts;
}

export function getPostBySlug(slug: string): Post | null {
  const p = path.join(process.cwd(), 'content', slug + '.md');
  if (!fs.existsSync(p)) return null;
  const md = fs.readFileSync(p, 'utf8');
  const title = (md.match(/^# (.*)$/m)?.[1]) ?? slug.split('/').pop() ?? slug;
  return { slug, title, contentHtml: mdToHtml(md) };
}
