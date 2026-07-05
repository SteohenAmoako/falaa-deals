import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * DiceConsult Webhook Handler
 * Processes real-time status updates from diceconsultgh.com
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📋 DiceConsult Webhook Payload:', JSON.stringify(body, null, 2));

    const { reference, status: rawStatus, phone, amount } = body;
    const secret = process.env.DICECONSULT_WEBHOOK_SECRET;

    // Optional: Verify signature if provided in headers
    // const signature = req.headers.get('X-Dice-Signature');

    if (!reference) {
      return NextResponse.json({ ok: false, message: "Missing reference" }, { status: 200 });
    }

    // DiceConsult statuses: "Success", "Failed", "Processing"
    let status = 'processing';
    const normalizedStatus = (rawStatus || '').toLowerCase();
    
    if (normalizedStatus === 'success') status = 'delivered';
    if (normalizedStatus === 'failed') status = 'failed';

    // 1. Reconcile Order (orders table)
    // We check both payment_reference and provider_order_id
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .or(`dakazina_order_id.eq.${reference},payment_reference.eq.${reference}`)
      .select()
      .maybeSingle();

    // 2. Reconcile Wallet Transaction
    const walletStatus = status === 'delivered' ? 'success' : (status === 'failed' ? 'failed' : 'pending');
    
    await supabaseAdmin
      .from('wallet_transactions')
      .update({ status: walletStatus })
      .eq('reference', reference);

    console.log(`✅ DiceConsult Webhook processed. Ref: ${reference}, Status: ${status}`);

    return NextResponse.json({
      ok: true,
      reference,
      status: status,
      updated: !!order
    });
  } catch (error: any) {
    console.error('❌ DiceConsult Webhook Fatal Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
}

/**
 * Diagnostic GET endpoint
 */
export async function GET() {
  return NextResponse.json({ ok: true, message: "DiceConsult Webhook endpoint is active" });
}
