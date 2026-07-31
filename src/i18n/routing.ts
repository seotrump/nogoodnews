import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['ko', 'en'],
 
  // Used when no locale matches
  defaultLocale: 'ko',
  
  // Hide the prefix for the default locale
  localePrefix: 'as-needed',

  // Enable automatic locale detection via cookie (NEXT_LOCALE)
  localeDetection: true
});
 
// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
