import { getAllPosts, getPostBySlug } from "@/lib/posts";
import Link from "next/link";
import { notFound } from "next/navigation";

type Params = { slug: string };

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map(p => ({ slug: p.slug }));
}

export default async function PostPage({ params }: { params: Params }) {
  const post = await getPostBySlug(params.slug);
  if (!post) return notFound();

  return (
    <article>
      <p className="meta"><Link href="/">← Back</Link></p>
      <h2>{post.title}</h2>
      {post.date && <div className="meta">{post.date}</div>}
      <div dangerouslySetInnerHTML={{ __html: post.contentHtml ?? "" }} />
    </article>
  );
}
