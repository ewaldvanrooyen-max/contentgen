import { getAllPosts, getPost } from "@/lib/posts";
import { notFound } from "next/navigation";

export default async function PostPage({ params }: { params: { slug: string[] } }) {
  const post = await getPost(params.slug);
  if (!post) return notFound();

  return (
    <article className="prose">
      <h1>{post.meta.title}</h1>
      {post.meta.date && <p><em>{new Date(post.meta.date).toDateString()}</em></p>}
      <div dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}

// Pre-generate all dynamic routes at build time
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((p: { slug: string }) => ({ slug: p.slug }));
}
