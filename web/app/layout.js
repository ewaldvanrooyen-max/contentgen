"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const jsx_runtime_1 = require("react/jsx-runtime");
require("./../styles/globals.css");
const link_1 = __importDefault(require("next/link"));
exports.metadata = {
    title: "contentgen",
    description: "AI content creator"
};
function RootLayout({ children }) {
    return ((0, jsx_runtime_1.jsx)("html", { lang: "en", children: (0, jsx_runtime_1.jsx)("body", { children: (0, jsx_runtime_1.jsxs)("div", { className: "container", children: [(0, jsx_runtime_1.jsxs)("header", { children: [(0, jsx_runtime_1.jsx)("h1", { style: { marginBottom: 8 }, children: (0, jsx_runtime_1.jsx)(link_1.default, { href: "/", children: "contentgen" }) }), (0, jsx_runtime_1.jsx)("div", { className: "meta", children: "AI content creator" }), (0, jsx_runtime_1.jsx)("hr", {})] }), (0, jsx_runtime_1.jsx)("main", { children: children }), (0, jsx_runtime_1.jsx)("hr", {}), (0, jsx_runtime_1.jsxs)("footer", { className: "meta", children: ["\u00A9 ", new Date().getFullYear(), " contentgen"] })] }) }) }));
}
//# sourceMappingURL=layout.js.map