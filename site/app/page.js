"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Page;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const posts_1 = require("@/lib/posts");
async function Page() {
    const posts = await (0, posts_1.getAllPosts)();
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-bold", children: "Latest posts" }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-6 space-y-4", children: [posts.length === 0 && (0, jsx_runtime_1.jsx)("p", { children: "No posts yet. The agent will add some soon." }), posts.map((p) => {
                        const href = "/posts/" + p.slug.join("/");
                        return ((0, jsx_runtime_1.jsxs)("article", { className: "border rounded-lg p-4 bg-white", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold", children: (0, jsx_runtime_1.jsx)(link_1.default, { className: "hover:underline", href: href, children: p.title }) }), p.date && (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-neutral-600", children: new Date(p.date).toDateString() }), p.description && (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-neutral-700", children: p.description })] }, href));
                    })] })] }));
}
//# sourceMappingURL=page.js.map