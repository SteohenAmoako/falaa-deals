import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Enhanced MoMo Message Parser
 * Specifically optimized for the format: "Payment received for GHS 1.00 from ... Reference: F3. Transaction ID: 83489530846."
 */
function parseMomoMessage(rawText: string) {
  // 1. Amount: Look specifically for "received for GHS [amount]" to avoid balance confusion
  const amountMatch = rawText.match(/received for GHS\s*([\d,]+\.?\d*)/i) || 
                      rawText.match(/GHS\s*([\d,]+\.?\d*)/i);
  
  // 2. Reference: Look for "Reference: F[number]" or just "Reference: [code]"
  const referenceMatch = rawText.match(/Reference:\s*([A-Z0-9]+)/i);
  
  // 3. Transaction ID: Look for digits after "Transaction ID:"
  const transactionIdMatch = rawText.match(/Transaction ID:\s*(\d+)/i) || 
                             rawText.match(/ID:\s*(\w+)/i);

  if (!referenceMatch || !amountMatch || !transactionIdMatch) {
    console.warn('[Webhook Parsing Failed]', {
      hasRef: !!referenceMatch,
      hasAmount: !!amountMatch,
      hasId: !!transactionIdMatch,
      text: rawText
    });
    return null;
  }

  return {
    reference: referenceMatch[1].trim(),
    amount: parseFloat(amountMatch[1].replace(/,/g, '')),
    transactionId: transactionIdMatch[1].trim(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.MOMO_WEBHOOK_SECRET;

    if (!expectedSecret) {
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    if (!secret || secret !== expectedSecret) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let reference: string | null = null;
    let amount: number | null = null;
    let transactionId: string | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      
      // Try direct values first (if user passed them manually)
      reference = body.reference;
      amount = typeof body.amount === 'string' ? parseFloat(body.amount.replace(/[^0-9.]/g, '')) : body.amount;
      transactionId = body.transactionId || body.transactionID;

      // If text is provided instead, parse it
      if (!reference && (body.text || body.message)) {
        const parsed = parseMomoMessage(body.text || body.message);
        if (parsed) {
          reference = parsed.reference;
          amount = parsed.amount;
          transactionId = parsed.transactionId;
        }
      }
    } else {
      const rawText = await req.text();
      const parsed = parseMomoMessage(rawText);
      if (parsed) {
        reference = parsed.reference;
        amount = parsed.amount;
        transactionId = parsed.transactionId;
      }
    }

    if (!reference || amount === null || isNaN(amount) || !transactionId) {
      return NextResponse.json({ success: false, message: 'Could not extract payment data' }, { status: 400 });
    }

    // Idempotency: Prevent duplicate credits
    const { data: existingTx } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id')
      .eq('reference', transactionId)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Locate User
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, wallet_balance')
      .eq('reference_code', reference)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, message: `No user with reference ${reference}` }, { status: 404 });
    }

    const newBalance = parseFloat(profile.wallet_balance.toString()) + amount;

    // Update Balance & Log
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) throw updateError;

    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: profile.user_id,
      amount,
      type: 'credit',
      reference: transactionId,
      description: `MoMo Deposit (Ref: ${reference})`,
      status: 'success'
    });

    return NextResponse.json({ success: true, newBalance });
  } catch (error: any) {
    console.error('MoMo Webhook Fatal Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  const isSecretSet = !!process.env.MOMO_WEBHOOK_SECRET;
  return NextResponse.json({ 
    success: true, 
    message: 'MoMo Webhook Active',
    diagnostics: {
      secretIsConfigured: isSecretSet,
      supportedFormat: "JSON with 'text' field OR raw SMS text"
    }
  });
}
