
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buyBundle } from '@/app/actions/orders';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized. Use "Bearer YOUR_API_KEY"' }, { status: 401 });
    }

    const apiKey = authHeader.split(' ')[1];
    const { data: keyRecord } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .maybeSingle();

    if (!keyRecord) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await req.json();
    const { recipient, network, gb_size } = body;

    if (!recipient || !network || !gb_size) {
      return NextResponse.json({ error: 'Missing required fields: recipient, network, gb_size' }, { status: 400 });
    }

    // 1. Fetch matching bundle
    const { data: bundle } = await supabaseAdmin
      .from('bundles')
      .select('id')
      .eq('network', network)
      .eq('gb_size', parseFloat(gb_size))
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found for provided network and size' }, { status: 404 });
    }

    // 2. Execute purchase logic
    const result = await buyBundle(keyRecord.user_id, bundle.id, recipient);
    
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Order Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
