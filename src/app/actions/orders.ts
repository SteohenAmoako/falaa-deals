
'use server';

import { createClient } from '@supabase/supabase-js';
import { placeDataOrder } from '@/lib/rahitalu';
import { skPlugClient } from '@/lib/skplug/client';
import { revalidatePath } from 'next/cache';
import { sendNtfy } from '@/lib/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Common order logic for any bundle from any provider.
 * Price is ALWAYS re-calculated server-side based on user role.
 */
export async function buyBundle(userId: string, bundleId: string, phone: string) {
  try {
    // 1. Fetch user profile for role and balance
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileErr || !profile) throw new Error('User profile not found');

    // 2. Fetch bundle and re-verify price for user's specific role
    const { data: bundleData, error: bundleErr } = await supabaseAdmin
      .from('bundles')
      .select(`
        *,
        bundle_role_prices!inner(sell_price_ghs)
      `)
      .eq('id', bundleId)
      .eq('bundle_role_prices.role', profile.role)
      .single();

    if (bundleErr || !bundleData) throw new Error('Bundle pricing not found for your role');

    const actualPrice = parseFloat(bundleData.bundle_role_prices[0].sell_price_ghs);
    const currentBalance = parseFloat(profile.wallet_balance.toString());

    if (currentBalance < actualPrice) {
      return { success: false, message: 'Insufficient wallet balance.' };
    }

    // 3. Dispatch to Upstream Provider
    let upstreamResponse;
    if (bundleData.provider === 'rahitalu') {
      upstreamResponse = await placeDataOrder(bundleData.provider_bundle_id, phone, actualPrice);
    } else {
      upstreamResponse = await skPlugClient.placeOrder(phone, bundleData.network, bundleData.gb_size.toString());
    }

    const orderRef = upstreamResponse.reference || upstreamResponse.order_id || upstreamResponse._id || `ORD-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // 4. Update Balance & Record Transaction
    const newBalance = currentBalance - actualPrice;
    await supabaseAdmin.from('profiles').update({ wallet_balance: newBalance }).eq('id', profile.id);

    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: userId,
      amount: actualPrice,
      type: 'debit',
      status: 'success',
      reference: orderRef,
      description: `Bought ${bundleData.label} for ${phone} (${bundleData.provider})`,
    });

    // 5. Record Order
    const orderTable = bundleData.provider === 'rahitalu' ? 'rahitalu_orders' : 'skplug_orders';
    const orderData = bundleData.provider === 'rahitalu' ? {
      user_id: userId,
      phone,
      plan_id: bundleData.provider_bundle_id,
      gig: bundleData.label,
      sell_price_ghs: actualPrice,
      reference: orderRef,
      status: 'processing'
    } : {
      user_id: userId,
      recipient: phone,
      network: bundleData.network,
      gb_size: bundleData.gb_size.toString(),
      sell_price_ghs: actualPrice,
      order_id: orderRef,
      status: 'processing'
    };

    await supabaseAdmin.from(orderTable).insert(orderData);

    // 6. Notify
    await sendNtfy({
      title: "New Data Order",
      tags: ["order", bundleData.provider],
      data: { userId, bundle: bundleData.label, phone, price: actualPrice, role: profile.role }
    });

    revalidatePath('/dashboard');
    return { success: true, message: `🎉 ${bundleData.label} activated successfully!` };
  } catch (error: any) {
    console.error('Buy Bundle Error:', error);
    return { success: false, message: error.message || 'An error occurred during purchase.' };
  }
}
