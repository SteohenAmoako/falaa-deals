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

    // 1. Check if already processed to prevent double crediting
    const { data: existingTx } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (existingTx && existingTx.status === 'success') {
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

    // Handle unsuccessful or failed payments on Paystack side
    if (!data.status || data.data.status !== 'success') {
      if (data.data?.status === 'failed' || data.data?.status === 'reversed') {
        await supabaseAdmin
          .from('wallet_transactions')
          .update({ status: 'failed', description: `Payment ${data.data.status} on Paystack` })
          .eq('reference', reference);
      }
      return NextResponse.json({ error: 'Payment verification failed on Paystack' }, { status: 400 });
    }

    const actualAmount = data.data.amount / 100; // Convert pesewas to GHS
    const userId = data.data.metadata.user_id;

    // 3. Get current profile balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, wallet_balance, full_name, reference_code')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    const currentBalance = parseFloat(profile.wallet_balance.toString()) || 0;
    const newBalance = currentBalance + actualAmount;

    // 4. Atomic balance update
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      throw new Error('Failed to update wallet balance');
    }

    // 5. Update Transaction Status
    await supabaseAdmin
      .from('wallet_transactions')
      .update({ 
        status: 'success', 
        amount: actualAmount,
        description: `Wallet funding via Paystack (Confirmed)`
      })
      .eq('reference', reference);

    // 6. Notify ntfy
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
