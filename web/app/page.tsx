import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const dynamic = "force-static";

export default async function Page() {
  const posts = await getAllPosts();

  return (
    <section>
      <h2>Latest posts</h2>
      {posts.length === 0 && <p className="meta">No posts yet. When your agent creates markdown under <code>content/</code>, they’ll appear here.</p>}
      <ul className="post-list">
        {posts.map(p => (
          <li key={p.slug} style={{margin:"1rem 0"}}>
            <div><Link href={`/posts/${encodeURIComponent(p.slug)}`}>{p.title}</Link></div>
            <div className="meta">{p.date ?? p.slug}</div>
            {p.description && <div className="meta">{p.description}</div>}
          </li>
        ))}
      </ul>
    </section>
  );
}
