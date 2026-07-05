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
    const { data: keyRecord } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .maybeSingle();

    if (!keyRecord) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', keyRecord.user_id)
      .single();

    const role = profile?.role || 'base';

    const { data: bundles, error } = await supabaseAdmin
      .from('bundles')
      .select(`
        id,
        network,
        gb_size,
        label,
        provider,
        bundle_role_prices!inner(sell_price_ghs)
      `)
      .eq('is_active', true)
      .eq('bundle_role_prices.role', role);

    if (error) throw error;

    const formatted = bundles.map(b => ({
      id: b.id,
      network: b.network,
      gb_size: b.gb_size,
      label: b.label,
      price: (b.bundle_role_prices as any)[0].sell_price_ghs
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}