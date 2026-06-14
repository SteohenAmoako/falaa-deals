
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // 2. Call Paystack Verify
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
      },
    });

    const data = await response.json();

    if (!data.status || data.data.status !== 'success') {
      return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
    }

    const actualAmount = data.data.amount / 100;
    const userId = data.data.metadata.user_id;

    // 3. Update Wallet Balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, wallet_balance')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) throw new Error('User profile not found');

    const newBalance = (profile.wallet_balance || 0) + actualAmount;

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) throw updateError;

    // 4. Update Transaction Status
    await supabaseAdmin
      .from('wallet_transactions')
      .update({ 
        status: 'success', 
        amount: actualAmount,
        description: `Wallet funding via Paystack (Success)`
      })
      .eq('reference', reference);

    return NextResponse.json({ success: true, amount: actualAmount });
  } catch (error: any) {
    console.error('Paystack Verify Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
