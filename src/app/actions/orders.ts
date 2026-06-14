
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
 * Synchronizes local order statuses with the upstream Rahitalu API.
 */
export async function syncUserOrders(userId: string) {
  try {
    // 1. Fetch recent upstream orders
    const upstreamOrders = await getUpstreamOrderHistory(50);
    
    // 2. Fetch local orders that are still in a non-final state
    const { data: localOrders } = await supabaseAdmin
      .from('rahitalu_orders')
      .select('id, reference, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'processing']);

    if (!localOrders || localOrders.length === 0) return;

    // 3. Compare and update
    for (const local of localOrders) {
      const match = upstreamOrders.find((u: any) => 
        u.reference === local.reference || 
        u._id === local.reference || 
        u.id === local.reference
      );

      if (match && match.status !== local.status) {
        await supabaseAdmin
          .from('rahitalu_orders')
          .update({ 
            status: match.status, 
            upstream_status: match.status 
          })
          .eq('id', local.id);
      }
    }
  } catch (error) {
    console.error('Order Sync Error:', error);
  }
}

/**
 * Handles the logic for purchasing a data bundle.
 */
export async function buyBundle(userId: string, planId: string, phone: string) {
  try {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) throw new Error('Invalid plan selected');

    // 1. Get current profile and verify balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    const currentBalance = parseFloat(profile.wallet_balance.toString());
    if (currentBalance < plan.price) {
      return { success: false, message: 'Insufficient balance. Please top up your wallet.' };
    }

    // 2. Initiate Rahitalu purchase
    const rahitaluResponse = await placeDataOrder(plan.id, phone, plan.price);
    
    // Use the reference returned from Rahitalu
    const orderRef = rahitaluResponse.reference || rahitaluResponse._id || `FD-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // 3. Debit the wallet
    const newBalance = currentBalance - plan.price;
    await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    // 4. Record the wallet debit transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: userId,
      amount: plan.price,
      type: 'debit',
      reference: orderRef,
      description: `Bought ${plan.size} Bundle for ${phone}`,
    });

    // 5. Record the data order details
    await supabaseAdmin.from('rahitalu_orders').insert({
      user_id: userId,
      phone,
      plan_id: plan.id,
      gig: plan.size,
      sell_price_ghs: plan.price,
      reference: orderRef,
      status: rahitaluResponse.status || 'processing',
      upstream_status: rahitaluResponse.status || 'pending',
      delivered_gb: 0,
    });

    revalidatePath('/dashboard');
    return { success: true, message: 'Bundle activated! Status: ' + (rahitaluResponse.status || 'processing') };
  } catch (error: any) {
    console.error('Buy Bundle Error:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}
