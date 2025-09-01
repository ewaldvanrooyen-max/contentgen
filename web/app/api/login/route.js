"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const jose_1 = require("jose");
async function POST(req) {
    const adminPass = process.env.ADMIN_PASS;
    if (!adminPass) {
        return server_1.NextResponse.json({ error: 'ADMIN_PASS not set' }, { status: 500 });
    }
    const form = await req.formData();
    const password = String(form.get('password') ?? '');
    if (password !== adminPass) {
        return server_1.NextResponse.json({ ok: false }, { status: 401 });
    }
    const token = await new jose_1.SignJWT({ ok: true })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(new TextEncoder().encode(adminPass));
    const res = server_1.NextResponse.redirect(new URL('/', req.url));
    res.cookies.set('cg_token', token, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: true,
        maxAge: 60 * 60 * 24 * 7,
    });
    return res;
}
//# sourceMappingURL=route.js.map