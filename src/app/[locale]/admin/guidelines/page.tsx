import { redirect } from '@/i18n/routing';

export default async function GuidelinesAdminPage() {
  redirect('/admin?tab=guidelines');
}
