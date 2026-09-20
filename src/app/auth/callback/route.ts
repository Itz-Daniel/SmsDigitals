import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  const oauthError = requestUrl.searchParams.get('error_description') || requestUrl.searchParams.get('error');

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin).replace(/\/$/, '');

  if (oauthError) {
    console.error("OAuth Provider Error:", oauthError);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(oauthError)}`, origin));
  }

  if (code) {
    const response = NextResponse.redirect(new URL(next, origin));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Stamp activity timestamp so middleware knows session is active
      const now = Date.now().toString();
      response.cookies.set('sms_last_active', now, {
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });

      const { data: { user } } = await supabase.auth.getUser();

      // Process Affiliate Link immediately on auth success
      const refCode = request.cookies.get('ref_code')?.value;
      if (refCode && user) {
        try {
          const supabaseAdmin = createAdminClient();
          
          // Check if already referred
          const { data: currentUser } = await supabaseAdmin
            .from('profiles')
            .select('referred_by')
            .eq('id', user.id)
            .single();

          if (currentUser && !currentUser.referred_by) {
            // Find referrer
            const { data: referrer } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('referral_code', refCode)
              .single();
              
            if (referrer && referrer.id !== user.id) {
              await supabaseAdmin
                .from('profiles')
                .update({ referred_by: referrer.id })
                .eq('id', user.id);
            }
          }
        } catch (err) {
          console.error("Auth Callback Affiliate Link Error:", err);
        }
      }
      
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
        } else {
          // Existing user logging in via OAuth
          try {
            const { sendLoginAlertEmail } = await import('@/lib/resend');
            const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                       request.headers.get("x-real-ip") || undefined;
            const userAgent = request.headers.get("user-agent") || undefined;
            sendLoginAlertEmail({
              userEmail: user.email,
              ipAddress: ip,
              userAgent,
            }).catch(e => console.error("Login alert email error:", e));
          } catch (e) {
            console.error("Failed to load resend module for login alert:", e);
          }
        }
      }

      return response;
    }
    
    console.error("Auth callback error:", error.message);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, origin));
  }

  // If there's an error or no code, redirect to login with an error
  return NextResponse.redirect(new URL('/login?error=Auth%20failed%20-%20no%20code%20received', origin));
}
