
'use server';

import { createClient } from '@supabase/supabase-js';
import { placeDataOrder } from '@/lib/rahitalu';
import { PLANS } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      console.error('Profile Fetch Error:', profileError);
      throw new Error('User profile not found');
    }

    const currentBalance = parseFloat(profile.wallet_balance.toString());
    if (currentBalance < plan.price) {
      return { success: false, message: 'Insufficient balance. Please top up your wallet.' };
    }

    // 2. Initiate Rahitalu purchase
    const rahitaluResponse = await placeDataOrder(plan.id, phone, plan.price);
    
    // Use the reference returned from Rahitalu as the primary reference
    const orderRef = rahitaluResponse.reference || `FD-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // 3. If Rahitalu succeeds, debit the wallet
    const newBalance = currentBalance - plan.price;
    const { error: debitError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (debitError) throw new Error('Failed to update wallet balance');

    // 4. Record the wallet debit transaction
    // 'status' column is removed as per user schema instruction
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
    return { success: true, message: 'Bundle activated successfully! Your data is on the way.' };
  } catch (error: any) {
    console.error('Buy Bundle Error:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}
