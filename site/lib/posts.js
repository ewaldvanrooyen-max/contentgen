"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllPosts = getAllPosts;
exports.getPost = getPost;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const fast_glob_1 = __importDefault(require("fast-glob"));
const gray_matter_1 = __importDefault(require("gray-matter"));
const remark_1 = require("remark");
const remark_html_1 = __importDefault(require("remark-html"));
const ROOT = node_path_1.default.join(process.cwd(), ".."); // repo root
const CONTENT_DIR = node_path_1.default.join(ROOT, "content"); // content/YYYY/MM/slug.md
async function getAllPosts() {
    if (!node_fs_1.default.existsSync(CONTENT_DIR))
        return [];
    const files = await (0, fast_glob_1.default)("**/*.md", { cwd: CONTENT_DIR, dot: false });
    return files.map((rel) => {
        const abs = node_path_1.default.join(CONTENT_DIR, rel);
        const raw = node_fs_1.default.readFileSync(abs, "utf8");
        const { data } = (0, gray_matter_1.default)(raw);
        const slug = rel.replace(/\.md$/i, "").split(node_path_1.default.sep);
        return {
            title: data.title ?? slug[slug.length - 1].replace(/[-_]/g, " "),
            date: data.date,
            description: data.description,
            slug,
        };
    }).sort((a, b) => {
        // newest first if dates exist
        const da = Date.parse(a.date ?? "1970-01-01");
        const db = Date.parse(b.date ?? "1970-01-01");
        return db - da;
    });
}
async function getPost(slug) {
    const file = node_path_1.default.join(CONTENT_DIR, ...slug) + ".md";
    if (!node_fs_1.default.existsSync(file))
        return null;
    const raw = node_fs_1.default.readFileSync(file, "utf8");
    const { content, data } = (0, gray_matter_1.default)(raw);
    const processed = await (0, remark_1.remark)().use(remark_html_1.default).process(content);
    const body = processed.toString();
    const meta = {
        title: data.title ?? slug[slug.length - 1].replace(/[-_]/g, " "),
        date: data.date,
        description: data.description,
        slug,
    };
    return { meta, html: body };
}
//# sourceMappingURL=posts.js.map