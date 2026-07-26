import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;

  // 쿠키가 'ko'이고 /ko 경로가 아닌 경우 → /ko로 리다이렉트
  if (localeCookie === 'ko' && !pathname.startsWith('/ko')) {
    return NextResponse.redirect(new URL(`/ko${pathname === '/' ? '' : pathname}`, request.url));
  }

  // 쿠키가 없는 첫 방문자 → 한국어(/ko)로 리다이렉트 (단, 이미 /ko면 제외)
  if (!localeCookie && !pathname.startsWith('/ko') && !pathname.startsWith('/en')) {
    const response = NextResponse.redirect(new URL(`/ko${pathname === '/' ? '' : pathname}`, request.url));
    response.cookies.set('NEXT_LOCALE', 'ko', { path: '/', maxAge: 60 * 60 * 24 * 365 });
    return response;
  }

  return intlMiddleware(request);
}
 
export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)']
};
