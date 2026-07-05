import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('Authorization');
    const apiKey = authHeader?.replace('Bearer ', '');

    if (!apiKey) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { data: keyRecord } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (!keyRecord) return NextResponse.json({ success: false, message: 'Invalid API Key' }, { status: 403 });

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('status, phone_number, amount, created_at')
      .or(`dakazina_order_id.eq.${params.id},payment_reference.eq.${params.id}`)
      .single();

    if (!order) return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
