import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

/**
 * Middleware to protect admin routes at the edge.
 * It primarily ensures a valid session exists. 
 * The fine-grained is_admin check is delegated to a Server Action 
 * inside the protected page for better reliability.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const path = req.nextUrl.pathname;
  const { data: { session } } = await supabase.auth.getSession();

  // Protect the admin route
  if (path.startsWith('/falaadealsadminurl$$')) {
    if (!session) {
      console.log('[Middleware] Unauthorized access attempt: No session found.');
      return NextResponse.redirect(new URL('/', req.url));
    }
    // We let the page handle the is_admin check via checkIsAdmin() action
    // because Server Actions have more stable access to service role keys.
  }

  return res;
}

export const config = {
  matcher: ['/falaadealsadminurl$$/:path*', '/falaadealsadminurl$$'],
};