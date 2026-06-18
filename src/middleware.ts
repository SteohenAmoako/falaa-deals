
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to protect admin routes at the edge.
 * This prevents the browser from even downloading the admin page code
 * if the user is not authenticated and authorized.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // This will refresh the session if it's expired
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If trying to access the secret admin URL
  if (req.nextUrl.pathname.startsWith('/falaadealsadminurl$$')) {
    if (!session) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Check if user is actually an admin in the database
    // We fetch this directly from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', session.user.id)
      .maybeSingle();

    // If no profile found or user is not an admin, send to dashboard
    if (!profile || profile.is_admin !== true) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/falaadealsadminurl$$/:path*', '/falaadealsadminurl$$'],
};
