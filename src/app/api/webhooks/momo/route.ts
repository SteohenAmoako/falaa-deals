// app/api/webhooks/momo/route.ts

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
 * This route extracts:
 *   1. reference        -> "FD-A3X9"   (matches profiles.reference_code)
 *   2. amount            -> 15.00       (actual GHS amount received)
 *   3. transactionId      -> "83297704110" (used as unique idempotency key)
 */

function parseMomoMessage(rawText: string) {
  // Reference: FD-A3X9.
  const referenceMatch = rawText.match(/Reference:\s*([A-Za-z0-9\-]+)\./i);

  // GHS 15.00
  const amountMatch = rawText.match(/GHS\s*([\d,]+\.?\d*)/i);

  // Transaction ID: 83297704110
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
    // 1. Verify secret key (security check)
    const secret = req.nextUrl.searchParams.get('secret');
    if (secret !== process.env.MOMO_WEBHOOK_SECRET) {
      console.warn('Unauthorized MoMo webhook attempt blocked.');
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get raw text from the request
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

    // 3. Parse the message
    const parsed = parseMomoMessage(rawText);
    if (!parsed) {
      console.error('Failed to parse MoMo message:', rawText);
      return NextResponse.json(
        { success: false, message: 'Could not parse reference, amount, or transaction ID' },
        { status: 400 }
      );
    }

    const { reference, amount, transactionId } = parsed;

    // 4. Idempotency check — has this transaction already been processed?
    const { data: existingTx } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id')
      .eq('reference', transactionId)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json({
        success: true,
        message: 'Transaction already processed (duplicate ignored)',
        transactionId,
      });
    }

    // 5. Find the user by reference_code
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, wallet_balance, full_name')
      .eq('reference_code', reference)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('No profile found for reference:', reference);
      return NextResponse.json(
        { success: false, message: `No account found for reference ${reference}` },
        { status: 404 }
      );
    }

    // 6. Credit the wallet
    const currentBalance = parseFloat(profile.wallet_balance.toString());
    const newBalance = currentBalance + amount;

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Failed to update wallet balance:', updateError.message);
      return NextResponse.json(
        { success: false, message: 'Failed to credit wallet' },
        { status: 500 }
      );
    }

    // 7. Record the transaction
    const { error: insertError } = await supabaseAdmin.from('wallet_transactions').insert({
      user_id: profile.user_id,
      amount,
      type: 'credit',
      reference: transactionId,
      description: `MoMo deposit via ${reference}`,
      status: 'success'
    });

    if (insertError) {
      console.error('Failed to record transaction:', insertError.message);
      return NextResponse.json(
        { success: false, message: 'Wallet credited but transaction log failed' },
        { status: 500 }
      );
    }

    console.log(`✅ Credited GHS ${amount} to ${profile.full_name} (${reference}). New balance: GHS ${newBalance}`);

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