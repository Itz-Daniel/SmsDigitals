import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Trigger welcome email for first-time users
      if (user && user.email && user.created_at) {
        const createdAt = new Date(user.created_at).getTime();
        const lastSignInAt = new Date(user.last_sign_in_at || user.created_at).getTime();
        
        // If created_at and last_sign_in_at are within 10 seconds of each other, it's a brand new signup
        if (Math.abs(lastSignInAt - createdAt) < 10000) {
          try {
            const { sendWelcomeEmail } = await import('@/lib/resend');
            // Fire and forget, don't await so we don't slow down the redirect
            sendWelcomeEmail(user.email).catch(e => console.error("Welcome email error:", e));
            console.log("Welcome email triggered for new user:", user.email);
          } catch (e) {
            console.error("Failed to load resend module:", e);
          }
        }
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
    
    console.error("Auth callback error:", error.message);
  }

  // If there's an error or no code, redirect to login with an error
  return NextResponse.redirect(new URL('/login?error=Auth%20failed', requestUrl.origin));
}
