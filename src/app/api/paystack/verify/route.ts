
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We use the Service Role Key to bypass RLS and ensure the update happens
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    // 1. Check if already processed
    const { data: existingTx } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('reference', reference)
      .eq('status', 'success')
      .single();

    if (existingTx) {
      return NextResponse.json({ success: true, amount: existingTx.amount, message: 'Already processed' });
    }

    // 2. Call Paystack Verify API
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
      },
    });

    const data = await response.json();

    if (!data.status || data.data.status !== 'success') {
      return NextResponse.json({ error: 'Payment verification failed on Paystack' }, { status: 400 });
    }

    const actualAmount = data.data.amount / 100; // Convert pesewas to GHS
    const userId = data.data.metadata.user_id;

    // 3. Get current profile balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, wallet_balance')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Verify Error: Profile not found for userId', userId);
      throw new Error('User profile not found');
    }

    const currentBalance = parseFloat(profile.wallet_balance.toString()) || 0;
    const newBalance = currentBalance + actualAmount;

    // 4. Update Wallet Balance (Atomic update isn't possible here easily, so we use the calculated new balance)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Verify Error: Failed to update balance', updateError);
      throw new Error('Failed to update wallet balance');
    }

    // 5. Update Transaction Status to success
    const { error: txUpdateError } = await supabaseAdmin
      .from('wallet_transactions')
      .update({ 
        status: 'success', 
        amount: actualAmount,
        description: `Wallet funding via Paystack (Confirmed)`
      })
      .eq('reference', reference);

    if (txUpdateError) {
      console.error('Verify Error: Failed to update transaction status', txUpdateError);
      // We don't throw here because the balance is already updated
    }

    return NextResponse.json({ success: true, amount: actualAmount });
  } catch (error: any) {
    console.error('Paystack Verify Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
