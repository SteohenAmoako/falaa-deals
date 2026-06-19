
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('X-SKPlug-Signature');
    const secret = process.env.SKPLUG_WEBHOOK_SECRET;

    // Simple signature verification (adjust based on SK Plug's actual signature logic if known)
    if (secret && signature !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { order_id, status } = payload;

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // Update the SK Plug order status
    const { error } = await supabaseAdmin
      .from('skplug_orders')
      .update({ 
        status: status || 'delivered',
        updated_at: new Date().toISOString()
      })
      .eq('order_id', order_id);

    if (error) {
      console.error('Webhook DB Error:', error);
      return NextResponse.json({ error: 'DB Update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('SK Plug Webhook Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
