import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['ko', 'en'],
 
  // Used when no locale matches
  defaultLocale: 'ko',
  
  // Hide the prefix for the default locale (ko)
  localePrefix: 'as-needed',

  // Disable automatic locale detection via cookie to prevent switching admin's language involuntarily
  localeDetection: false
});
 
// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
