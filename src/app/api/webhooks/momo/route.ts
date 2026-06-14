
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Webhook for automated MoMo deposits.
 * Expected JSON payload from iPhone Shortcut:
 * {
 *   "reference": "FD-A3X9",
 *   "amount": 15.00,
 *   "transactionId": "83297704110"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { reference, amount, transactionId } = payload;

    if (!reference || !amount) {
      return NextResponse.json({ error: 'Missing reference or amount' }, { status: 400 });
    }

    // 1. Locate the user profile by reference code
    // We use uppercase to ensure matching is robust
    const cleanRef = reference.trim().toUpperCase();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('reference_code', cleanRef)
      .single();

    if (profileError || !profile) {
      console.error(`Webhook: Reference ${cleanRef} not found.`);
      return NextResponse.json({ error: 'User reference not found' }, { status: 404 });
    }

    const creditAmount = parseFloat(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // 2. Update wallet balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: profile.wallet_balance + creditAmount })
      .eq('id', profile.id);

    if (updateError) throw updateError;

    // 3. Record the transaction with explicit success status
    await supabase.from('wallet_transactions').insert({
      user_id: profile.user_id,
      amount: creditAmount,
      type: 'credit',
      status: 'success',
      reference: transactionId || `MOMO-${Date.now()}`,
      description: `Automated MoMo Deposit (${cleanRef})`,
    });

    console.log(`Successfully credited GHS ${creditAmount} to ${profile.full_name} (${cleanRef})`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Credited GHS ${creditAmount} to ${profile.full_name}` 
    });

  } catch (error: any) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
