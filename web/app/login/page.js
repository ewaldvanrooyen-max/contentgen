"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.default = LoginPage;
const jsx_runtime_1 = require("react/jsx-runtime");
exports.dynamic = 'force-static';
function LoginPage() {
    return ((0, jsx_runtime_1.jsxs)("main", { className: "p-8 max-w-md mx-auto", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-semibold mb-4", children: "Sign in" }), (0, jsx_runtime_1.jsxs)("form", { method: "POST", action: "/api/login", className: "space-y-4", children: [(0, jsx_runtime_1.jsx)("input", { type: "password", name: "password", placeholder: "Password", className: "border p-2 w-full", required: true }), (0, jsx_runtime_1.jsx)("button", { type: "submit", className: "border px-4 py-2", children: "Enter" })] }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-6 text-sm opacity-70", children: ["Tip: set ", (0, jsx_runtime_1.jsx)("code", { children: "ADMIN_PASS" }), " in ", (0, jsx_runtime_1.jsx)("code", { children: "web/.env.local" }), " and GitHub/Vercel secrets."] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2", children: (0, jsx_runtime_1.jsx)("a", { className: "underline", href: "/api/logout", children: "Logout" }) })] }));
}
//# sourceMappingURL=page.js.map