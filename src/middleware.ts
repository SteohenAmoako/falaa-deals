
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

  // Refresh session if it exists
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = req.nextUrl.pathname;

  // If trying to access the secret admin URL
  if (path.startsWith('/falaadealsadminurl$$')) {
    if (!session) {
      return NextResponse.redirect(new URL('/', req.url));
    }

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

      // If no profile found or user is not an admin, send to dashboard
      if (error || !profile || profile.is_admin !== true) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    } catch (e) {
      // If error during check, fallback to dashboard for safety
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/falaadealsadminurl$$/:path*', '/falaadealsadminurl$$'],
};
