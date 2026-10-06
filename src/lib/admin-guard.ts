import { User } from "@supabase/supabase-js";

/**
 * Strict server-side verification for admin users.
 * Blocks spoofable client user_metadata and loose email string matching.
 */
export function isUserAdmin(user: User | null | undefined): boolean {
  if (!user || !user.email) return false;

  // 1. Check server-set app_metadata (immutable by client)
  if (user.app_metadata?.role === 'admin') {
    return true;
  }

  // 2. Exact match against configured admin email(s)
  const configuredAdmin = (process.env.ADMIN_EMAIL || 'dannyhell96@gmail.com').toLowerCase().trim();
  const userEmail = user.email.toLowerCase().trim();

  const allowedEmails = configuredAdmin.split(',').map(e => e.trim());
  if (allowedEmails.includes(userEmail)) {
    return true;
  }

  return false;
}
