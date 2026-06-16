import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Parses MoMo message from raw text if provided.
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
    if (secret !== process.env.MOMO_WEBHOOK_SECRET) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let reference: string | null = null;
    let amount: number | null = null;
    let transactionId: string | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      
      // Support for the JSON format seen in the iPhone Shortcut photo
      if (body.reference && body.amount && (body.transactionId || body.transactionID)) {
        reference = body.reference;
        amount = typeof body.amount === 'string' ? parseFloat(body.amount.replace(/[^0-9.]/g, '')) : body.amount;
        transactionId = body.transactionId || body.transactionID;
      } 
      // Fallback for wrapped text
      else if (body.text || body.message) {
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

    if (!reference || !amount || !transactionId) {
      return NextResponse.json(
        { success: false, message: 'Data parsing failed. Ensure all fields (reference, amount, transactionId) are provided.' },
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
      return NextResponse.json({ success: true, message: 'Transaction already processed' });
    }

    // 2. Locate User Profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, wallet_balance, full_name')
      .eq('reference_code', reference)
      .maybeSingle();

    if (profileError || !profile) {
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

    if (updateError) throw updateError;

    // 4. Log Transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: profile.user_id,
      amount,
      type: 'credit',
      reference: transactionId,
      description: `MoMo deposit via reference ${reference}`,
      status: 'success'
    });

    return NextResponse.json({
      success: true,
      message: `Wallet for ${profile.full_name} credited with GHS ${amount}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'MoMo Webhook Active' });
}
