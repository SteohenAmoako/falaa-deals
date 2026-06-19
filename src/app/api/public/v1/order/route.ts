import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { skPlugClient } from '@/lib/skplug/client';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = authHeader.split(' ')[1];
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .maybeSingle();

    if (keyError || !keyData) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 });
    }

    const { recipient, network, gb_size } = await req.json();
    if (!recipient || !network || !gb_size) {
      return NextResponse.json({ error: 'Missing required fields: recipient, network, gb_size' }, { status: 400 });
    }

    // Update last used
    await supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('api_key', apiKey);

    // Call internal buy logic
    const buyRes = await fetch(`${req.nextUrl.origin}/api/skplug/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: keyData.user_id,
        recipient,
        network,
        gbSize: gb_size,
        sellPriceGHS: 15 // Standard reseller rate for API (or implement tiered pricing)
      }),
    });

    const result = await buyRes.json();
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      order_id: result.order_id,
      message: 'Order placed successfully'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
