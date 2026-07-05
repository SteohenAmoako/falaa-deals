'use server';

import { createClient } from '@supabase/supabase-js';
import { placeDataOrder } from '@/lib/rahitalu';
import { skPlugClient } from '@/lib/skplug/client';
import { dakazinaClient } from '@/lib/dakazina/client';
import { byteMeDealsClient } from '@/lib/bytemedeals/client';
import { diceConsultClient } from '@/lib/diceconsult/client';
import { revalidatePath } from 'next/cache';
import { sendNtfy } from '@/lib/notifications';
import { getActiveProvider } from '@/app/actions/admin';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Mapping for ByteMeDeals networks
 */
const BYTE_ME_NETWORK_MAP: Record<string, 'MTN' | 'VOD' | 'ATM'> = {
  'MTN': 'MTN',
  'MTN EXPRESS': 'MTN',
  'MTN AFA': 'MTN',
  'TELECEL': 'VOD',
  'AIRTELTIGO': 'ATM',
  'AT - BIGTIME': 'ATM',
  'AT - ISHARE': 'ATM'
};

/**
 * Mapping for DiceConsult networks
 */
const DICE_NETWORK_MAP: Record<string, string> = {
  'MTN': 'MTN',
  'MTN EXPRESS': 'MTN',
  'MTN AFA': 'MTN',
  'TELECEL': 'Telecel',
  'AIRTELTIGO': 'iShare',
  'AT - BIGTIME': 'BigTime',
  'AT - ISHARE': 'iShare'
};

/**
 * Common order logic for any bundle from any provider.
 */
export async function buyBundle(userId: string, bundleId: string, phone: string) {
  try {
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileErr || !profile) throw new Error('User profile not found');

    const { data: bundleData, error: bundleErr } = await supabaseAdmin
      .from('bundles')
      .select(`
        *,
        bundle_role_prices!inner(sell_price_ghs)
      `)
      .eq('id', bundleId)
      .eq('bundle_role_prices.role', profile.role)
      .single();

    if (bundleErr || !bundleData || !bundleData.bundle_role_prices?.length) {
      throw new Error('Bundle pricing not found for your role');
    }

    const actualPrice = parseFloat(bundleData.bundle_role_prices[0].sell_price_ghs);
    const costPrice = parseFloat(bundleData.cost_price_ghs || 0);
    const currentBalance = parseFloat(profile.wallet_balance.toString());

    if (currentBalance < actualPrice) {
      return { success: false, message: 'Insufficient wallet balance.' };
    }

    const providerToUse = bundleData.provider;
    const internalRef = `ORD-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    let upstreamResponse: any = null;

    try {
      if (providerToUse === 'rahitalu') {
        upstreamResponse = await placeDataOrder(bundleData.provider_bundle_id, phone, actualPrice);
      } else if (providerToUse === 'skplug') {
        upstreamResponse = await skPlugClient.placeOrder(phone, bundleData.network, bundleData.gb_size.toString());
      } else if (providerToUse === 'dakazina') {
        const [netIdStr, gbStr] = bundleData.provider_bundle_id.split(':');
        upstreamResponse = await dakazinaClient.buyDataPackage(phone, parseInt(netIdStr), parseInt(gbStr), internalRef);
      } else if (providerToUse === 'bytemedeals') {
        const network = BYTE_ME_NETWORK_MAP[bundleData.network.toUpperCase()] || 'MTN';
        upstreamResponse = await byteMeDealsClient.purchaseData(network, parseInt(bundleData.provider_bundle_id), phone, internalRef);
      } else if (providerToUse === 'diceconsult') {
        const network = DICE_NETWORK_MAP[bundleData.network.toUpperCase()] || 'MTN';
        upstreamResponse = await diceConsultClient.purchaseData(network, phone, bundleData.label);
      }
    } catch (apiError: any) {
      await supabaseAdmin.from('wallet_transactions').insert({
        user_id: userId,
        amount: actualPrice,
        type: 'debit',
        status: 'failed',
        reference: internalRef,
        description: `FAILED: ${bundleData.label} for ${phone} (${providerToUse}) - ${apiError.message}`,
      });
      throw apiError;
    }

    const providerOrderId = upstreamResponse?.reference || upstreamResponse?.order_code || upstreamResponse?.order_id || null;

    const newBalance = currentBalance - actualPrice;
    await supabaseAdmin.from('profiles').update({ wallet_balance: newBalance }).eq('id', profile.id);

    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: userId,
      amount: actualPrice,
      type: 'debit',
      status: 'success',
      reference: internalRef,
      description: `Bought ${bundleData.label} for ${phone} (${providerToUse})`,
    });

    // Record in consolidated 'orders' table
    const networkKey = bundleData.network.toUpperCase();
    const networkId = providerToUse === 'bytemedeals' 
      ? (BYTE_ME_NETWORK_MAP[networkKey] === 'VOD' ? 2 : (BYTE_ME_NETWORK_MAP[networkKey] === 'ATM' ? 4 : 3)) 
      : (providerToUse === 'dakazina' ? parseInt(bundleData.provider_bundle_id.split(':')[0]) : 3);
    
    const pkgId = (providerToUse === 'bytemedeals' || providerToUse === 'diceconsult')
      ? parseInt(bundleData.provider_bundle_id) 
      : (providerToUse === 'dakazina' ? parseInt(bundleData.provider_bundle_id.split(':')[1]) : 0);

    await supabaseAdmin.from('orders').insert({
      customer_id: profile.id,
      package_id: isNaN(pkgId) ? 0 : pkgId,
      network_id: networkId,
      phone_number: phone,
      amount: actualPrice,
      status: 'processing',
      actual_cost: costPrice,
      reseller_profit: actualPrice - costPrice,
      payment_reference: internalRef,
      customer_phone: phone,
      dakazina_order_id: providerOrderId || internalRef
    });

    await sendNtfy({
      title: "New Data Order",
      tags: ["order", providerToUse],
      data: { userId, bundle: bundleData.label, phone, price: actualPrice, role: profile.role, ref: internalRef }
    });

    revalidatePath('/dashboard');
    revalidatePath('/falaadealsadminurl$$');
    
    return { success: true, message: `🎉 ${bundleData.label} activated successfully!` };
  } catch (error: any) {
    console.error('Buy Bundle Error:', error);
    return { success: false, message: error.message || 'An error occurred during purchase.' };
  }
}
