import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC = new Set(['/login','/api/login','/api/logout','/favicon.ico']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static and public routes
  if (
    PUBLIC.has(pathname) ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/images/')
  ) return NextResponse.next();

  // If no ADMIN_PASS, auth is disabled (helpful in early dev)
  const adminPass = process.env.ADMIN_PASS;
  if (!adminPass) return NextResponse.next();

  const token = req.cookies.get('cg_token')?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(adminPass));
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|assets/|images/).*)'],
};
