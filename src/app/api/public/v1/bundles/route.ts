
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = authHeader.split(' ')[1];

    const { data: keyData } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .maybeSingle();

    if (!keyData) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', keyData.user_id)
      .single();

    const role = profile?.role || 'api_user';

    const { data: bundles } = await supabaseAdmin
      .from('bundles')
      .select(`
        network,
        gb_size,
        label,
        bundle_role_prices!inner(sell_price_ghs)
      `)
      .eq('is_active', true)
      .eq('bundle_role_prices.role', role);

    const formatted = (bundles || []).map(b => ({
      network: b.network,
      size: b.gb_size,
      label: b.label,
      price_ghs: b.bundle_role_prices[0]?.sell_price_ghs
    }));

    return NextResponse.json({ success: true, bundles: formatted });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
