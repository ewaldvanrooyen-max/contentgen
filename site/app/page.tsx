import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default async function Page() {
  const posts = await getAllPosts();

  return (
    <div>
      <h1 className="text-2xl font-bold">Latest posts</h1>
      <div className="mt-6 space-y-4">
        {posts.length === 0 && <p>No posts yet. The agent will add some soon.</p>}
        {posts.map((p) => {
          const href = "/posts/" + p.slug.join("/");
          return (
            <article key={href} className="border rounded-lg p-4 bg-white">
              <h2 className="text-lg font-semibold">
                <Link className="hover:underline" href={href}>{p.title}</Link>
              </h2>
              {p.date && <p className="text-sm text-neutral-600">{new Date(p.date).toDateString()}</p>}
              {p.description && <p className="mt-2 text-neutral-700">{p.description}</p>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
