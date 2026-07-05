import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buyBundle } from '@/app/actions/orders';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const apiKey = authHeader.split(' ')[1];

    // Verify API Key
    const { data: keyRecord, error: keyErr } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .maybeSingle();

    if (keyErr || !keyRecord) {
      return NextResponse.json({ error: 'Unauthorized: Invalid API key' }, { status: 401 });
    }

    const body = await req.json();
    const { recipient, network, gb_size } = body;

    if (!recipient || !network || !gb_size) {
      return NextResponse.json({ error: 'Missing required fields: recipient, network, gb_size' }, { status: 400 });
    }

    // Find the bundle ID based on network and gb_size for this user's role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', keyRecord.user_id)
      .single();

    const role = profile?.role || 'base';

    const { data: bundles } = await supabaseAdmin
      .from('bundles')
      .select('id')
      .eq('network', network.toUpperCase())
      .eq('gb_size', parseFloat(gb_size))
      .eq('is_active', true)
      .limit(1);

    if (!bundles || bundles.length === 0) {
      return NextResponse.json({ error: `Bundle ${gb_size}GB not found for network ${network}` }, { status: 404 });
    }

    // Place Order
    const result = await buyBundle(keyRecord.user_id, bundles[0].id, recipient);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: result.message,
      recipient,
      network,
      gb_size
    });

  } catch (error: any) {
    console.error('API Public Order Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}