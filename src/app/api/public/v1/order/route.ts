
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
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = authHeader.split(' ')[1];
    const { data: keyRecord, error: keyErr } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (keyErr || !keyRecord) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const { recipient, network, gb_size } = await req.json();

    if (!recipient || !network || !gb_size) {
      return NextResponse.json({ error: 'Missing required fields: recipient, network, gb_size' }, { status: 400 });
    }

    // Find the bundle ID matching the criteria
    const { data: bundle } = await supabaseAdmin
      .from('bundles')
      .select('id')
      .eq('network', network)
      .eq('gb_size', parseFloat(gb_size))
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found for specified network and size' }, { status: 404 });
    }

    const result = await buyBundle(keyRecord.user_id, bundle.id, recipient);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
