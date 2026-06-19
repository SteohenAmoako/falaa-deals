
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const key = authHeader.split(' ')[1];
  const { data } = await supabaseAdmin
    .from('api_keys')
    .select('user_id')
    .eq('api_key', key)
    .eq('is_active', true)
    .single();

  if (data) {
    // Basic rate limit logging
    await supabaseAdmin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('api_key', key);
    return data.user_id;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { recipient, network, gb_size } = await req.json();

    if (!recipient || !network || !gb_size) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Proxy the order to the internal SK Plug buy route for now
    // In a real app, you might have routing logic here
    const internalRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/skplug/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        recipient,
        network,
        gbSize: gb_size,
        sellPriceGHS: gb_size === '5' ? 14 : 8 // Dummy pricing mapping for demo
      })
    });

    const result = await internalRes.json();
    if (!result.success) return NextResponse.json(result, { status: 400 });

    return NextResponse.json({
      success: true,
      order_id: result.order_id,
      status: 'processing'
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
