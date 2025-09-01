"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.default = Page;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const posts_1 = require("@/lib/posts");
exports.dynamic = "force-static";
async function Page() {
    const posts = await (0, posts_1.getAllPosts)();
    return ((0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h2", { children: "Latest posts" }), posts.length === 0 && (0, jsx_runtime_1.jsxs)("p", { className: "meta", children: ["No posts yet. When your agent creates markdown under ", (0, jsx_runtime_1.jsx)("code", { children: "content/" }), ", they\u2019ll appear here."] }), (0, jsx_runtime_1.jsx)("ul", { className: "post-list", children: posts.map(p => ((0, jsx_runtime_1.jsxs)("li", { style: { margin: "1rem 0" }, children: [(0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)(link_1.default, { href: `/posts/${encodeURIComponent(p.slug)}`, children: p.title }) }), (0, jsx_runtime_1.jsx)("div", { className: "meta", children: p.date ?? p.slug }), p.description && (0, jsx_runtime_1.jsx)("div", { className: "meta", children: p.description })] }, p.slug))) })] }));
}
//# sourceMappingURL=page.js.map