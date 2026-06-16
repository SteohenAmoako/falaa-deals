import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Expected incoming text format (from MoMo SMS via iPhone Shortcut):
 *
 *   "Reference: FD-A3X9. Payment received for GHS 15.00 Transaction ID: 83297704110"
 * 
 * Note: The regex is now more flexible to handle variations in punctuation.
 */
function parseMomoMessage(rawText: string) {
  // Matches "Reference: FD-XXXX" (ignores trailing dots or spaces)
  const referenceMatch = rawText.match(/Reference:\s*([A-Za-z0-9\-]+)/i);
  // Matches "GHS 15.00" or similar
  const amountMatch = rawText.match(/GHS\s*([\d,]+\.?\d*)/i);
  // Matches "Transaction ID: 12345"
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
      console.warn('Unauthorized MoMo webhook attempt blocked.');
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let rawText: string;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      rawText = body.text || body.message || '';
    } else {
      rawText = await req.text();
    }

    if (!rawText) {
      return NextResponse.json({ success: false, message: 'No text received' }, { status: 400 });
    }

    const parsed = parseMomoMessage(rawText);
    if (!parsed) {
      return NextResponse.json(
        { success: false, message: 'Could not parse reference, amount, or transaction ID' },
        { status: 400 }
      );
    }

    const { reference, amount, transactionId } = parsed;

    // Check if transaction already exists
    const { data: existingTx } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id')
      .eq('reference', transactionId)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json({
        success: true,
        message: 'Transaction already processed',
        transactionId,
      });
    }

    // Find the profile by reference code
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, wallet_balance, full_name')
      .eq('reference_code', reference)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, message: `No account found for reference ${reference}` },
        { status: 404 }
      );
    }

    const currentBalance = parseFloat(profile.wallet_balance.toString());
    const newBalance = currentBalance + amount;

    // Credit the wallet
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) throw updateError;

    // Log the transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: profile.user_id,
      amount,
      type: 'credit',
      reference: transactionId,
      description: `MoMo deposit via ${reference}`,
      status: 'success'
    });

    return NextResponse.json({
      success: true,
      message: `Wallet credited successfully`,
      data: {
        customer: profile.full_name,
        reference,
        amount,
        newBalance,
        transactionId,
      },
    });
  } catch (error: any) {
    console.error('MoMo Webhook Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'MoMo webhook is live' });
}