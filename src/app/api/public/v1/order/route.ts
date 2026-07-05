
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
      return NextResponse.json({ error: 'Unauthorized. Use "Bearer YOUR_API_KEY"' }, { status: 401 });
    }

    const apiKey = authHeader.split(' ')[1];

    // 1. Verify API Key
    const { data: keyData, error: keyErr } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .maybeSingle();

    if (keyErr || !keyData) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 });
    }

    const body = await req.json();
    const { recipient, network, gb_size } = body;

    if (!recipient || !network || !gb_size) {
      return NextResponse.json({ error: 'Missing required fields: recipient, network, gb_size' }, { status: 400 });
    }

    // 2. Fetch Bundle for Reseller Role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', keyData.user_id)
      .single();

    const role = profile?.role || 'api_user';

    const { data: bundle } = await supabaseAdmin
      .from('bundles')
      .select('id')
      .eq('network', network.toUpperCase())
      .eq('gb_size', parseFloat(gb_size))
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!bundle) {
      return NextResponse.json({ error: `No active bundle found for ${network} ${gb_size}GB` }, { status: 404 });
    }

    // 3. Process Order
    const result = await buyBundle(keyData.user_id, bundle.id, recipient);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: result.message,
      recipient,
      network,
      gb_size
    });

  } catch (error: any) {
    console.error('API Order Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
