
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Middleware to protect admin routes at the edge.
 * Uses the Service Role key for the authorization check to bypass potential RLS issues 
 * during the edge request, ensuring admins are never locked out.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const path = req.nextUrl.pathname;
  
  // Refresh session if it exists
  const { data: { session } } = await supabase.auth.getSession();

  // If trying to access the secret admin URL
  if (path.startsWith('/falaadealsadminurl$$')) {
    console.log('[Middleware] Admin Route Access Attempt:', path);

    if (!session) {
      console.log('[Middleware] No session found. Redirecting to home.');
      return NextResponse.redirect(new URL('/', req.url));
    }

    console.log('[Middleware] Session found for user:', session.user.id);

    try {
      // Use Service Role client to check admin status (bypasses RLS)
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            persistSession: false,
          }
        }
      );

      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('[Middleware] Database error checking admin status:', error.message);
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      if (!profile) {
        console.warn('[Middleware] No profile found for user:', session.user.id);
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      if (profile.is_admin !== true) {
        console.warn('[Middleware] User is not an admin. is_admin:', profile.is_admin);
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      console.log('[Middleware] Admin status verified. Access granted.');
    } catch (e: any) {
      console.error('[Middleware] Unexpected error during admin check:', e.message);
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/falaadealsadminurl$$/:path*', '/falaadealsadminurl$$'],
};
