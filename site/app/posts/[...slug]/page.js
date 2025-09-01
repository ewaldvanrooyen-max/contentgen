"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PostPage;
exports.generateStaticParams = generateStaticParams;
const jsx_runtime_1 = require("react/jsx-runtime");
const posts_1 = require("@/lib/posts");
const navigation_1 = require("next/navigation");
async function PostPage({ params }) {
    const post = await (0, posts_1.getPost)(params.slug);
    if (!post)
        return (0, navigation_1.notFound)();
    return ((0, jsx_runtime_1.jsxs)("article", { className: "prose", children: [(0, jsx_runtime_1.jsx)("h1", { children: post.meta.title }), post.meta.date && (0, jsx_runtime_1.jsx)("p", { children: (0, jsx_runtime_1.jsx)("em", { children: new Date(post.meta.date).toDateString() }) }), (0, jsx_runtime_1.jsx)("div", { dangerouslySetInnerHTML: { __html: post.html } })] }));
}
// Pre-generate all dynamic routes at build time
async function generateStaticParams() {
    const posts = await (0, posts_1.getAllPosts)();
    return posts.map((p) => ({ slug: p.slug }));
}
//# sourceMappingURL=page.js.map