import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { amount, email, userId } = await req.json();

    if (!amount || amount < 5) {
      return NextResponse.json({ error: 'Minimum deposit is GHS 5' }, { status: 400 });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    // Set callback to our verification page
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/payment/verify`;

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Pesewas
        currency: 'GHS',
        callback_url: callbackUrl,
        channels: ['mobile_money', 'card'],
        metadata: {
          user_id: userId,
        },
      }),
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Paystack initialization failed');
    }

    // Record pending transaction before redirecting
    await supabase.from('wallet_transactions').insert({
      user_id: userId,
      amount: amount,
      type: 'credit',
      reference: data.data.reference,
      status: 'pending',
      description: 'Wallet funding via Paystack (Pending Redirect)',
    });

    // Return the full data which includes authorization_url
    return NextResponse.json(data.data);
  } catch (error: any) {
    console.error('Paystack Initialize Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}