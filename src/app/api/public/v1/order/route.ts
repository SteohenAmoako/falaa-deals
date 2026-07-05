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
    const apiKey = authHeader?.replace('Bearer ', '');

    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'Authentication Required. Please include your API key.' }, { status: 401 });
    }

    // 1. Validate API Key
    const { data: keyRecord, error: keyErr } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (keyErr || !keyRecord) {
      return NextResponse.json({ success: false, message: 'Invalid or inactive API key.' }, { status: 403 });
    }

    const body = await req.json();
    const { recipient, network, gb_size } = body;

    if (!recipient || !network || !gb_size) {
      return NextResponse.json({ success: false, message: 'Missing required fields: recipient, network, gb_size' }, { status: 400 });
    }

    // 2. Find matching bundle
    const { data: bundle, error: bundleErr } = await supabaseAdmin
      .from('bundles')
      .select('id')
      .eq('network', network.toUpperCase())
      .eq('gb_size', parseFloat(gb_size))
      .eq('is_active', true)
      .maybeSingle();

    if (bundleErr || !bundle) {
      return NextResponse.json({ success: false, message: `Package ${gb_size}GB not found for ${network}.` }, { status: 404 });
    }

    // 3. Process Order
    const result = await buyBundle(keyRecord.user_id, bundle.id, recipient);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Public API Order Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
