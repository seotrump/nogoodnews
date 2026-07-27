import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// next-intl이 라우팅, 쿠키 설정, 언어 리다이렉트를 모두 자동 처리합니다.
export default createMiddleware(routing);

export const config = {
  // API, 정적 파일, 내부 시스템 경로를 제외한 모든 요청에 미들웨어 적용
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)']
};