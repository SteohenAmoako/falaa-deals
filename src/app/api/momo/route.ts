import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Robust parser for MoMo transactions.
 */
function parseMomoMessage(rawText: string) {
  const referenceMatch = rawText.match(/Reference:\s*([A-Za-z0-9\-]+)/i);
  const amountMatch = rawText.match(/GHS\s*([\d,]+\.?\d*)/i);
  const transactionIdMatch = rawText.match(/Transaction ID:\s*(\w+)/i);

  if (!referenceMatch || !amountMatch || !transactionIdMatch) {
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

    // Security Check
    if (!expectedSecret) {
      console.error('CRITICAL: MOMO_WEBHOOK_SECRET is not set in environment variables.');
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    if (!secret || secret !== expectedSecret) {
      console.error('Unauthorized MoMo webhook attempt. Received:', secret);
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let reference: string | null = null;
    let amount: number | null = null;
    let transactionId: string | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      
      reference = body.reference;
      
      // Handle amount if passed as string "GHS 10.00" or number
      if (typeof body.amount === 'string') {
        amount = parseFloat(body.amount.replace(/[^0-9.]/g, ''));
      } else {
        amount = body.amount;
      }
      
      transactionId = body.transactionId || body.transactionID || body.transactionId;

      // Fallback for wrapped text inside JSON
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
      return NextResponse.json(
        { 
          success: false, 
          message: 'Data parsing failed. Ensure reference, amount, and transactionId are correctly sent.' 
        },
        { status: 400 }
      );
    }

    // 1. Idempotency Check
    const { data: existingTx } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id')
      .eq('reference', transactionId)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json({ success: true, message: 'Transaction already processed', transactionId });
    }

    // 2. Locate User Profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, wallet_balance, full_name')
      .eq('reference_code', reference)
      .maybeSingle();

    if (profileError || !profile) {
      console.warn(`Profile not found for reference: ${reference}`);
      return NextResponse.json(
        { success: false, message: `Account not found for reference: ${reference}` },
        { status: 404 }
      );
    }

    const currentBalance = parseFloat(profile.wallet_balance.toString());
    const newBalance = currentBalance + amount;

    // 3. Update Balance
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Failed to update balance:', updateError);
      throw updateError;
    }

    // 4. Log Transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: profile.user_id,
      amount,
      type: 'credit',
      reference: transactionId,
      description: `Automatic MoMo deposit (Ref: ${reference})`,
      status: 'success'
    });

    return NextResponse.json({
      success: true,
      message: `Wallet for ${profile.full_name} credited with GHS ${amount.toFixed(2)}`,
      data: {
        newBalance: newBalance.toFixed(2),
        transactionId
      }
    });
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
      environmentSecretConfigured: isSecretSet,
      endpoint: '/api/momo'
    }
  });
}
