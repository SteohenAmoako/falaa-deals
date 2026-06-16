import { NextResponse } from 'next/server';

/**
 * Redirecting legacy webhook path to the new consolidated path.
 */
export async function GET() {
  return NextResponse.redirect(new URL('/api/momo', process.env.NEXT_PUBLIC_APP_URL || 'https://falaadeals.vercel.app'));
}

export async function POST(req: Request) {
  return NextResponse.redirect(new URL('/api/momo', process.env.NEXT_PUBLIC_APP_URL || 'https://falaadeals.vercel.app'), { status: 307 });
}
