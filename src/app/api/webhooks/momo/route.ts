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
 */
function parseMomoMessage(rawText: string) {
  // Matches "Reference: FD-XXXX" (case insensitive, alphanumeric with hyphen)
  const referenceMatch = rawText.match(/Reference:\s*([A-Za-z0-9\-]+)/i);
  // Matches "GHS 15.00" or similar amounts with optional commas
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

    // Handle both raw text (default from Shortcut) or JSON wrapped text
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
        { success: false, message: 'Could not parse reference, amount, or transaction ID. Ensure the SMS format matches.' },
        { status: 400 }
      );
    }

    const { reference, amount, transactionId } = parsed;

    // 1. Idempotency Check: Don't process the same MoMo Transaction ID twice
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

    // 2. Locate User Profile by Reference Code
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, wallet_balance, full_name')
      .eq('reference_code', reference)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, message: `No account found for reference code: ${reference}` },
        { status: 404 }
      );
    }

    const currentBalance = parseFloat(profile.wallet_balance.toString());
    const newBalance = currentBalance + amount;

    // 3. Update Wallet Balance Atomically
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) throw updateError;

    // 4. Log the Successful Transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: profile.user_id,
      amount,
      type: 'credit',
      reference: transactionId,
      description: `Automatic MoMo deposit via reference ${reference}`,
      status: 'success'
    });

    return NextResponse.json({
      success: true,
      message: `Wallet for ${profile.full_name} credited with GHS ${amount}`,
      data: {
        customer: profile.full_name,
        reference,
        amount,
        newBalance,
        transactionId,
      },
    });
  } catch (error: any) {
    console.error('MoMo Webhook Fatal Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'MoMo Webhook Endpoint is active' });
}
