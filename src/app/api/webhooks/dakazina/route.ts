
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Dakazina Webhook Handler
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📋 Dakazina webhook: Full payload:', JSON.stringify(body, null, 2));

    const dakazinaOrderCode = String(body.order_code || "").trim();
    const status = (body.status || 'delivered').toLowerCase();

    if (!dakazinaOrderCode) {
      return NextResponse.json({ ok: false, message: "Missing order_code" }, { status: 200 }); // Always 200 to stop retry
    }

    // 1. Match by dakazina_order_id in dakazina_orders
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('dakazina_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('dakazina_order_id', dakazinaOrderCode)
      .select()
      .maybeSingle();

    // 2. Also update corresponding wallet transaction if it exists
    await supabaseAdmin
      .from('wallet_transactions')
      .update({ status: status === 'delivered' ? 'success' : 'failed' })
      .eq('dakazina_order_id', dakazinaOrderCode);

    console.log(`✅ Webhook processed for ${dakazinaOrderCode}. New status: ${status}`);

    return NextResponse.json({
      ok: true,
      dakazina_order_code: dakazinaOrderCode,
      status: status,
      orders_updated: order ? 1 : 0
    });
  } catch (error: any) {
    console.error('❌ Dakazina Webhook Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Dakazina Webhook active" });
}
