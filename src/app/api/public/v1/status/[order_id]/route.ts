import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { skPlugClient } from '@/lib/skplug/client';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(req: NextRequest, { params }: { params: { order_id: string } }) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orderId = params.order_id;
    const { data: order } = await supabaseAdmin
      .from('skplug_orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const statusRes = await skPlugClient.getOrderStatus(orderId);
    return NextResponse.json({
      success: true,
      order_id: orderId,
      status: statusRes.status,
      recipient: order.recipient,
      gb_size: order.gb_size
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
