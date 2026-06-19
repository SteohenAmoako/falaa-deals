
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { skPlugClient } from '@/lib/skplug/client';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Fetch bundles from SK Plug and normalize for public API
    const bundles = await skPlugClient.getBundles();
    return NextResponse.json(bundles);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bundles' }, { status: 500 });
  }
}
