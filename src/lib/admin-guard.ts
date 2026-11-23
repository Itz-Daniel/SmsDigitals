import { User } from "@supabase/supabase-js";

/**
 * Strict server-side verification for admin users.
 * Blocks spoofable client user_metadata, requires confirmed email,
 * and rejects unconfigured admin environments without hardcoded fallbacks.
 */
export function isUserAdmin(user: User | null | undefined): boolean {
  if (!user || !user.email) return false;

  // 1. Check server-set app_metadata (immutable by client)
  if (user.app_metadata?.role === 'admin') {
    return true;
  }

  // 2. Exact match against configured admin email(s) - require confirmed email
  const configuredAdmin = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (!configuredAdmin) return false;

  // Ensure email has been confirmed by Supabase Auth before granting admin access
  if (!user.email_confirmed_at) return false;

  const userEmail = user.email.toLowerCase().trim();
  const allowedEmails = configuredAdmin.split(',').map(e => e.trim());
  return allowedEmails.includes(userEmail);
}
