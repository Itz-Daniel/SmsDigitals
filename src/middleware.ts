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

  // Protect all /dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Inactivity Security Check:
    const lastActiveCookie = request.cookies.get('sms_last_active')?.value
    const timeoutDaysCookie = request.cookies.get('sms_session_timeout_days')?.value
    const timeoutDays = timeoutDaysCookie ? parseInt(timeoutDaysCookie) : 7
    const maxInactivityMs = (timeoutDays || 7) * 24 * 60 * 60 * 1000

    if (lastActiveCookie) {
      const lastActiveTime = parseInt(lastActiveCookie)
      const now = Date.now()

      if (!isNaN(lastActiveTime) && (now - lastActiveTime > maxInactivityMs)) {
        // Session expired due to inactivity! Force sign-out for security.
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('reason', 'inactivity_timeout')

        const response = NextResponse.redirect(url)
        response.cookies.delete('sms_last_active')
        return response
      }
    }

    // Refresh last active timestamp on active request
    supabaseResponse.cookies.set('sms_last_active', Date.now().toString(), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    })
  }

  // Redirect logged-in users away from auth pages
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
