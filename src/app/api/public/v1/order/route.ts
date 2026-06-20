
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
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Bearer token' }, { status: 401 });
    }

    const key = authHeader.split(' ')[1];
    const { data: keyData } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('api_key', key)
      .eq('is_active', true)
      .maybeSingle();

    if (!keyData) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
    }

    const body = await req.json();
    const { recipient, network, gb_size } = body;

    if (!recipient || !network || !gb_size) {
      return NextResponse.json({ error: 'Required fields: recipient, network, gb_size' }, { status: 400 });
    }

    // 1. Find the bundle matching the network and size
    const { data: bundle } = await supabaseAdmin
      .from('bundles')
      .select('id')
      .eq('network', network.toUpperCase())
      .eq('gb_size', parseFloat(gb_size))
      .eq('is_active', true)
      .maybeSingle();

    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found for this network/size' }, { status: 404 });
    }

    // 2. Execute buy logic (this action already handles balance checks and role-based pricing)
    const result = await buyBundle(keyData.user_id, bundle.id, recipient);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: result.message,
      recipient,
      network
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
