'use server';

import { createClient } from '@supabase/supabase-js';
import { placeDataOrder, getUpstreamOrderHistory } from '@/lib/rahitalu';
import { PLANS } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fulfills a direct order after Paystack verification.
 */
export async function fulfillDirectOrder(reference: string, planId: string, phone: string, userId: string) {
  try {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) throw new Error('Invalid plan selected');

    // 1. Verify Paystack Payment
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${paystackSecret}` },
    });
    const paystackData = await paystackResponse.json();

    if (!paystackData.status || paystackData.data.status !== 'success') {
      throw new Error('Payment verification failed');
    }

    // 2. Initiate Rahitalu purchase
    const rahitaluResponse = await placeDataOrder(plan.id, phone, plan.price);
    const orderRef = rahitaluResponse.reference || rahitaluResponse._id || reference;

    // 3. Record the transaction in Supabase
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: userId,
      amount: plan.price,
      type: 'credit', // Credit for the deposit
      status: 'success',
      reference: reference,
      description: `Payment for ${plan.size} Bundle (${phone})`,
    });

    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: userId,
      amount: plan.price,
      type: 'debit', // Debit for the bundle
      status: 'success',
      reference: orderRef,
      description: `Bought ${plan.size} Bundle for ${phone}`,
    });

    // 4. Record the data order details
    await supabaseAdmin.from('rahitalu_orders').insert({
      user_id: userId,
      phone,
      plan_id: plan.id,
      gig: plan.size,
      sell_price_ghs: plan.price,
      reference: orderRef,
      status: rahitaluResponse.upstreamStatus || rahitaluResponse.status || 'processing',
      upstream_status: rahitaluResponse.upstreamStatus || rahitaluResponse.status || 'pending',
      delivered_gb: 0,
    });

    revalidatePath('/dashboard');
    return { success: true, message: 'Bundle activated successfully!' };
  } catch (error: any) {
    console.error('Fulfillment Error:', error);
    return { success: false, message: error.message || 'Fulfillment failed' };
  }
}

/**
 * Synchronizes local order statuses with the upstream Rahitalu API.
 */
export async function syncUserOrders(userId: string) {
  try {
    const upstreamOrders = await getUpstreamOrderHistory(50);
    const { data: localOrders } = await supabaseAdmin
      .from('rahitalu_orders')
      .select('id, reference, status, phone')
      .eq('user_id', userId)
      .in('status', ['pending', 'processing']);

    if (!localOrders || localOrders.length === 0) return;

    for (const local of localOrders) {
      const match = upstreamOrders.find((u: any) => 
        u.reference === local.reference || 
        u._id === local.reference || 
        u.id === local.reference
      );

      if (match) {
        const upstreamStatus = match.upstreamStatus || match.status;
        if (upstreamStatus && upstreamStatus !== local.status) {
          await supabaseAdmin
            .from('rahitalu_orders')
            .update({ 
              status: upstreamStatus, 
              upstream_status: upstreamStatus 
            })
            .eq('id', local.id);
        }
      }
    }
  } catch (error) {
    console.error('Order Sync Error:', error);
  }
}

/**
 * Original buyBundle logic (for wallet usage)
 */
export async function buyBundle(userId: string, planId: string, phone: string) {
  try {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) throw new Error('Invalid plan selected');

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) throw new Error('User profile not found');

    const currentBalance = parseFloat(profile.wallet_balance.toString());
    if (currentBalance < plan.price) {
      return { success: false, message: 'Insufficient balance.' };
    }

    const rahitaluResponse = await placeDataOrder(plan.id, phone, plan.price);
    const orderRef = rahitaluResponse.reference || rahitaluResponse._id || `FD-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const newBalance = currentBalance - plan.price;
    await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: userId,
      amount: plan.price,
      type: 'debit',
      status: 'success',
      reference: orderRef,
      description: `Bought ${plan.size} Bundle for ${phone}`,
    });

    await supabaseAdmin.from('rahitalu_orders').insert({
      user_id: userId,
      phone,
      plan_id: plan.id,
      gig: plan.size,
      sell_price_ghs: plan.price,
      reference: orderRef,
      status: rahitaluResponse.upstreamStatus || rahitaluResponse.status || 'processing',
      upstream_status: rahitaluResponse.upstreamStatus || rahitaluResponse.status || 'pending',
      delivered_gb: 0,
    });

    revalidatePath('/dashboard');
    return { success: true, message: 'Bundle activated!' };
  } catch (error: any) {
    return { success: false, message: error.message || 'An error occurred.' };
  }
}
