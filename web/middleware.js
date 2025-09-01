"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.middleware = middleware;
const server_1 = require("next/server");
const jose_1 = require("jose");
const PUBLIC = new Set(['/login', '/api/login', '/api/logout', '/favicon.ico']);
async function middleware(req) {
    const { pathname } = req.nextUrl;
    // Allow static and public routes
    if (PUBLIC.has(pathname) ||
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/assets/') ||
        pathname.startsWith('/images/'))
        return server_1.NextResponse.next();
    // If no ADMIN_PASS, auth is disabled (helpful in early dev)
    const adminPass = process.env.ADMIN_PASS;
    if (!adminPass)
        return server_1.NextResponse.next();
    const token = req.cookies.get('cg_token')?.value;
    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('next', pathname);
        return server_1.NextResponse.redirect(url);
    }
    try {
        await (0, jose_1.jwtVerify)(token, new TextEncoder().encode(adminPass));
        return server_1.NextResponse.next();
    }
    catch {
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('next', pathname);
        return server_1.NextResponse.redirect(url);
    }
}
exports.config = {
    matcher: ['/((?!_next/|favicon.ico|assets/|images/).*)'],
};
//# sourceMappingURL=middleware.js.map