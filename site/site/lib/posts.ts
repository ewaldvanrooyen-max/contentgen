export async function getAllPosts() {
  return [
    { slug: "hello-world", title: "Hello World", content: "First post content" },
    { slug: "second-post", title: "Second Post", content: "Another placeholder" }
  ];
}

export async function getPost(slug: string) {
  const posts = await getAllPosts();
  return posts.find(post => post.slug === slug) || null;
}
