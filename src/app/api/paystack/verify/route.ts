import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendNtfy } from '@/lib/notifications';

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

    const { data: existingTx } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (existingTx && existingTx.status === 'success') {
      return NextResponse.json({ success: true, amount: existingTx.amount, message: 'Already processed' });
    }

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

    const actualAmount = data.data.amount / 100;
    const userId = data.data.metadata.user_id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, wallet_balance, full_name, reference_code')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    const currentBalance = parseFloat(profile.wallet_balance.toString()) || 0;
    const newBalance = currentBalance + actualAmount;

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      throw new Error('Failed to update wallet balance');
    }

    await supabaseAdmin
      .from('wallet_transactions')
      .upsert({ 
        user_id: profile.user_id,
        amount: actualAmount,
        type: 'credit',
        reference: reference,
        description: `Wallet funding via Paystack (Confirmed)`
      }, { onConflict: 'reference' });

    await sendNtfy({
      title: `${profile.full_name} (${profile.reference_code}): Paystack Deposit GHS ${actualAmount}`,
      tags: ["paystack", "deposit", "wallet"],
      data: {
        user: `${profile.full_name} (${profile.reference_code})`,
        amount: actualAmount,
        reference,
        status: "success",
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({ success: true, amount: actualAmount });
  } catch (error: any) {
    console.error('Paystack Verify Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
