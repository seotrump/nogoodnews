import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Custom logic to respect NEXT_LOCALE cookie even when localeDetection is false
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie === 'ko' && !pathname.startsWith('/ko')) {
    return NextResponse.redirect(new URL(`/ko${pathname === '/' ? '' : pathname}`, request.url));
  }

  return intlMiddleware(request);
}
 
export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)']
};
