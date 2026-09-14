import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options: _options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isAuthRoute = pathname === '/login' || pathname === '/register'

  // If user is detected in session cookies, ALWAYS enforce inactivity security check
  if (user) {
    const lastActiveCookie = request.cookies.get('sms_last_active')?.value
    const timeoutDaysCookie = request.cookies.get('sms_session_timeout_days')?.value
    const timeoutDays = timeoutDaysCookie ? parseFloat(timeoutDaysCookie) : 1 // Default strict 24 hours
    const maxInactivityMs = (timeoutDays || 1) * 24 * 60 * 60 * 1000

    let isExpired = false
    const now = Date.now()

    if (lastActiveCookie) {
      const lastActiveTime = parseInt(lastActiveCookie)
      if (isNaN(lastActiveTime) || now - lastActiveTime > maxInactivityMs) {
        isExpired = true
      }
    } else {
      // User is logged in according to Supabase, but the last active cookie was deleted or expired (>30 days).
      // For account security, this prolonged inactivity MUST expire the session!
      isExpired = true
    }

    if (isExpired) {
      // Sign out from Supabase
      await supabase.auth.signOut()

      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('reason', 'inactivity_timeout')

      const response = NextResponse.redirect(url)

      // Purge all Supabase auth and session cookies from client response
      request.cookies.getAll().forEach((cookie) => {
        if (
          cookie.name.startsWith('sb-') ||
          cookie.name.includes('auth-token') ||
          cookie.name === 'sms_last_active'
        ) {
          response.cookies.delete(cookie.name)
          response.cookies.set(cookie.name, '', { path: '/', maxAge: 0 })
        }
      })

      return response
    }

    // User is active and within valid timeout window:
    // If attempting to visit /login or /register, redirect to /dashboard
    if (isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Continuously refresh last active timestamp with 1-year maxAge
    // (So the cookie NEVER disappears while user is away, preserving expiration math)
    supabaseResponse.cookies.set('sms_last_active', now.toString(), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60, // 1 year
    })
  } else {
    // Unauthenticated user attempting to access protected dashboard routes
    if (isDashboardRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
