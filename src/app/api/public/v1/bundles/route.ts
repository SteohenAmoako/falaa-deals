
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized. Use "Bearer YOUR_API_KEY"' }, { status: 401 });
    }

    const apiKey = authHeader.split(' ')[1];
    const { data: keyRecord, error: keyErr } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (keyErr || !keyRecord) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', keyRecord.user_id)
      .single();

    const role = profile?.role || 'base';

    const { data: bundles, error: bundleErr } = await supabaseAdmin
      .from('bundles')
      .select(`
        *,
        bundle_role_prices!inner(sell_price_ghs, role)
      `)
      .eq('is_active', true)
      .eq('bundle_role_prices.role', role);

    if (bundleErr) throw bundleErr;

    const formatted = bundles.map(b => ({
      id: b.id,
      network: b.network,
      size: `${b.gb_size}GB`,
      price: b.bundle_role_prices[0]?.sell_price_ghs
    }));

    return NextResponse.json({ success: true, bundles: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
