"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStaticParams = generateStaticParams;
exports.default = PostPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const posts_1 = require("@/lib/posts");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
async function generateStaticParams() {
    const posts = await (0, posts_1.getAllPosts)();
    return posts.map(p => ({ slug: p.slug }));
}
async function PostPage({ params }) {
    const post = await (0, posts_1.getPostBySlug)(params.slug);
    if (!post)
        return (0, navigation_1.notFound)();
    return ((0, jsx_runtime_1.jsxs)("article", { children: [(0, jsx_runtime_1.jsx)("p", { className: "meta", children: (0, jsx_runtime_1.jsx)(link_1.default, { href: "/", children: "\u2190 Back" }) }), (0, jsx_runtime_1.jsx)("h2", { children: post.title }), post.date && (0, jsx_runtime_1.jsx)("div", { className: "meta", children: post.date }), (0, jsx_runtime_1.jsx)("div", { dangerouslySetInnerHTML: { __html: post.contentHtml ?? "" } })] }));
}
//# sourceMappingURL=page.js.map