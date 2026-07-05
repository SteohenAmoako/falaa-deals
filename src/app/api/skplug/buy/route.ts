import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { skPlugClient } from '@/lib/skplug/client';
import { sendNtfy } from '@/lib/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, recipient, network, gbSize, sellPriceGHS } = await req.json();

    // 1. Check Wallet Balance
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, wallet_balance, full_name, reference_code')
      .eq('user_id', userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ success: false, message: 'Profile not found' }, { status: 404 });
    }

    const currentBalance = parseFloat(profile.wallet_balance.toString());
    if (currentBalance < sellPriceGHS) {
      return NextResponse.json({ success: false, message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // 2. Place Order with SK Plug
    const skResponse = await skPlugClient.placeOrder(recipient, network, gbSize);
    const orderId = skResponse.order_id || skResponse.id;

    // 3. Deduct Wallet Balance
    const newBalance = currentBalance - sellPriceGHS;
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateErr) throw new Error('Failed to update balance');

    // 4. Record Transaction & Order
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: userId,
      amount: sellPriceGHS,
      type: 'debit',
      status: 'success',
      reference: orderId,
      description: `SK Plug: ${gbSize}GB Bundle for ${recipient}`,
    });

    await supabaseAdmin.from('skplug_orders').insert({
      user_id: userId,
      recipient,
      network,
      gb_size: gbSize,
      sell_price_ghs: sellPriceGHS,
      order_id: orderId,
      status: 'processing',
    });

    // 5. Notify
    await sendNtfy({
      title: `${profile.full_name} (${profile.reference_code}): SK Plug ${gbSize}GB Order`,
      tags: ["skplug", "purchase", "data"],
      data: {
        user: `${profile.full_name} (${profile.reference_code})`,
        bundleSize: gbSize,
        recipient,
        orderId,
        newBalance
      }
    });

    return NextResponse.json({ success: true, order_id: orderId });
  } catch (error: any) {
    console.error('SK Plug Buy Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
