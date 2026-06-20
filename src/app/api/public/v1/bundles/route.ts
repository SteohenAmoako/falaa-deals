
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized. Use "Bearer YOUR_API_KEY"' }, { status: 401 });
    }

    const key = authHeader.split(' ')[1];
    const { data: keyData } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('api_key', key)
      .eq('is_active', true)
      .maybeSingle();

    if (!keyData) {
      return NextResponse.json({ error: 'Invalid or inactive API Key' }, { status: 401 });
    }

    // Always use 'api_user' role for API connections
    const { data: bundles, error: bErr } = await supabaseAdmin
      .from('bundles')
      .select(`
        *,
        bundle_role_prices!inner(sell_price_ghs)
      `)
      .eq('is_active', true)
      .eq('bundle_role_prices.role', 'api_user')
      .order('network')
      .order('gb_size');

    if (bErr) throw bErr;

    const formatted = bundles.map(b => ({
      id: b.id,
      network: b.network,
      size: b.label,
      gb_size: b.gb_size,
      price_ghs: b.bundle_role_prices[0]?.sell_price_ghs
    }));

    return NextResponse.json({ success: true, bundles: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
