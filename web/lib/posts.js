"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllPosts = getAllPosts;
exports.getPostBySlug = getPostBySlug;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function mdToHtml(md) {
    return md
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/\n$/gim, '<br/>');
}
function getAllPosts() {
    const root = node_path_1.default.join(process.cwd(), 'content');
    const posts = [];
    const walk = (dir) => {
        for (const name of node_fs_1.default.readdirSync(dir)) {
            const p = node_path_1.default.join(dir, name);
            const s = node_fs_1.default.statSync(p);
            if (s.isDirectory())
                walk(p);
            else if (name.endsWith('.md')) {
                const slug = p.replace(root + node_path_1.default.sep, '').replace(/\.md$/, '');
                const md = node_fs_1.default.readFileSync(p, 'utf8');
                const title = (md.match(/^# (.*)$/m)?.[1]) ?? slug.split('/').pop() ?? slug;
                posts.push({ slug, title, contentHtml: mdToHtml(md) });
            }
        }
    };
    if (node_fs_1.default.existsSync(root))
        walk(root);
    posts.sort((a, b) => (a.slug < b.slug ? 1 : -1));
    return posts;
}
function getPostBySlug(slug) {
    const p = node_path_1.default.join(process.cwd(), 'content', slug + '.md');
    if (!node_fs_1.default.existsSync(p))
        return null;
    const md = node_fs_1.default.readFileSync(p, 'utf8');
    const title = (md.match(/^# (.*)$/m)?.[1]) ?? slug.split('/').pop() ?? slug;
    return { slug, title, contentHtml: mdToHtml(md) };
}
//# sourceMappingURL=posts.js.map