"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
async function GET(req) {
    const res = server_1.NextResponse.redirect(new URL('/login', req.url));
    res.cookies.set('cg_token', '', { path: '/', maxAge: 0 });
    return res;
}
//# sourceMappingURL=route.js.map