
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Dakazina Webhook Handler
 * Updated to support the new 'orders' table schema.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📋 Dakazina Webhook Payload:', JSON.stringify(body, null, 2));

    const dakazinaOrderCode = String(body.order_code || "").trim();
    const incomingApiRef = String(body.incoming_api_ref || "").trim();
    const rawStatus = (body.status || 'delivered').toLowerCase();

    // Mapping Dakazina statuses to our internal statuses
    let status = 'processing';
    if (rawStatus === 'delivered' || rawStatus === 'success') status = 'delivered';
    if (rawStatus === 'failed' || rawStatus === 'cancelled') status = 'failed';

    if (!dakazinaOrderCode && !incomingApiRef) {
      return NextResponse.json({ ok: false, message: "Missing identifiers" }, { status: 200 });
    }

    // 1. Reconcile Order (New Schema: 'orders' table)
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .or(`dakazina_order_id.eq.${dakazinaOrderCode},payment_reference.eq.${incomingApiRef}`)
      .select()
      .maybeSingle();

    // 2. Reconcile Wallet Transaction
    const walletStatus = status === 'delivered' ? 'success' : (status === 'failed' ? 'failed' : 'pending');
    
    await supabaseAdmin
      .from('wallet_transactions')
      .update({ status: walletStatus })
      .or(`reference.eq.${dakazinaOrderCode},reference.eq.${incomingApiRef}`);

    console.log(`✅ Dakazina Webhook processed. Code: ${dakazinaOrderCode}, Ref: ${incomingApiRef}, Status: ${status}`);

    return NextResponse.json({
      ok: true,
      dakazina_order_code: dakazinaOrderCode,
      incoming_api_ref: incomingApiRef,
      status: status,
      updated: !!order
    });
  } catch (error: any) {
    console.error('❌ Dakazina Webhook Fatal Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Dakazina Webhook active" });
}
