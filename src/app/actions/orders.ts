'use server';

import { supabase } from '@/lib/supabase';
import { placeDataOrder } from '@/lib/rahitalu';
import { PLANS } from '@/lib/types';
import { revalidatePath } from 'next/cache';

/**
 * Handles the logic for purchasing a data bundle.
 * Credits Rahitalu API, debits user wallet, and records transactions.
 */
export async function buyBundle(userId: string, planId: string, phone: string) {
  try {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) throw new Error('Invalid plan selected');

    // 1. Get current profile and verify balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) throw new Error('User profile not found');

    if (profile.wallet_balance < plan.price) {
      return { success: false, message: 'Insufficient balance. Please top up your wallet.' };
    }

    // 2. Initiate Rahitalu purchase
    const orderRef = `FD-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const rahitaluResponse = await placeDataOrder(plan.id, phone, plan.price);

    // 3. If Rahitalu succeeds, debit the wallet
    const { error: debitError } = await supabase
      .from('profiles')
      .update({ wallet_balance: profile.wallet_balance - plan.price })
      .eq('id', profile.id);

    if (debitError) throw new Error('Failed to update wallet balance');

    // 4. Record the wallet debit transaction
    await supabase.from('wallet_transactions').insert({
      user_id: userId,
      amount: plan.price,
      type: 'debit',
      reference: orderRef,
      status: 'success',
      description: `Bought ${plan.size} Bundle for ${phone}`,
    });

    // 5. Record the data order details
    await supabase.from('rahitalu_orders').insert({
      user_id: userId,
      phone,
      plan_id: plan.id,
      gig: plan.size,
      sell_price_ghs: plan.price,
      reference: orderRef,
      status: 'processing',
      upstream_status: rahitaluResponse.status || 'pending',
      delivered_gb: 0,
    });

    revalidatePath('/dashboard');
    return { success: true, message: 'Bundle activated successfully! Your data is on the way.' };
  } catch (error: any) {
    console.error('Buy Bundle Error:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}
