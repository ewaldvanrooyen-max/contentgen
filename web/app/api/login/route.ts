import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

export async function POST(req: Request) {
  const adminPass = process.env.ADMIN_PASS;
  if (!adminPass) {
    return NextResponse.json({ error: 'ADMIN_PASS not set' }, { status: 500 });
  }
  const form = await req.formData();
  const password = String(form.get('password') ?? '');

  if (password !== adminPass) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = await new SignJWT({ ok: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(adminPass));

  const res = NextResponse.redirect(new URL('/', req.url));
  res.cookies.set('cg_token', token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
