
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = authHeader.split(' ')[1];
    const { data: keyData } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .maybeSingle();

    if (!keyData) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });

    const orderId = params.id;

    const { data: order } = await supabaseAdmin
      .from('rahitalu_orders')
      .select('*')
      .eq('reference', orderId)
      .eq('user_id', keyData.user_id)
      .maybeSingle();

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      order_id: order.reference,
      status: order.status,
      recipient: order.phone,
      network: order.plan_id.split('_')[0],
      size: order.gig,
      created_at: order.created_at
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
