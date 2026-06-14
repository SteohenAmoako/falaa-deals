import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { reference, amount, secret } = payload;

    if (secret !== process.env.MOMO_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!reference || !amount) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // Find user by reference code
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('reference_code', reference)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const creditAmount = parseFloat(amount);
    if (isNaN(creditAmount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Use a transaction (simulated with individual calls as Supabase JS doesn't have direct transaction blocks like SQL)
    // In production, this should ideally be a stored procedure or edge function with Postgres transaction logic
    
    // 1. Update balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: profile.wallet_balance + creditAmount })
      .eq('id', profile.id);

    if (updateError) throw updateError;

    // 2. Record transaction
    const { error: transError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: profile.user_id,
        amount: creditAmount,
        type: 'credit',
        reference: `MOMO-${Date.now()}`,
        description: `MoMo Deposit via ${reference}`,
      });

    if (transError) throw transError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}