
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest, { params }: { params: { order_id: string } }) {
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

    const orderId = params.order_id;

    // Check both order tables
    const [skOrder, rahOrder] = await Promise.all([
      supabaseAdmin.from('skplug_orders').select('*').eq('order_id', orderId).eq('user_id', keyData.user_id).maybeSingle(),
      supabaseAdmin.from('rahitalu_orders').select('*').eq('reference', orderId).eq('user_id', keyData.user_id).maybeSingle()
    ]);

    const order = skOrder.data || rahOrder.data;

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order_id: orderId,
      status: order.status,
      recipient: order.recipient || order.phone,
      amount: order.sell_price_ghs,
      timestamp: order.created_at
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
