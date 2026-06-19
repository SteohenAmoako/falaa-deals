
'use server';

import { createClient } from '@supabase/supabase-js';
import { skPlugClient } from '@/lib/skplug/client';
import { revalidatePath } from 'next/cache';
import { UserRole, Bundle } from '@/lib/types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetches all active bundles with the price specifically for the user's role.
 */
export async function getBundlesForRole(role: UserRole): Promise<Bundle[]> {
  const { data, error } = await supabaseAdmin
    .from('bundles')
    .select(`
      *,
      bundle_role_prices!inner(sell_price_ghs)
    `)
    .eq('is_active', true)
    .eq('bundle_role_prices.role', role)
    .order('network')
    .order('gb_size');

  if (error) {
    console.error('Fetch Bundles Error:', error);
    return [];
  }

  return data.map(b => ({
    ...b,
    sell_price_ghs: b.bundle_role_prices[0].sell_price_ghs
  }));
}

/**
 * Admin action to sync bundles from SK Plug and set default role prices.
 */
export async function syncBundlesFromSkPlug() {
  try {
    const skBundles = await skPlugClient.getBundles();
    let newCount = 0;

    for (const skb of skBundles) {
      const { data: existing } = await supabaseAdmin
        .from('bundles')
        .select('id')
        .eq('provider', 'skplug')
        .eq('provider_bundle_id', skb.id.toString())
        .maybeSingle();

      const bundleData = {
        provider: 'skplug',
        provider_bundle_id: skb.id.toString(),
        network: skb.network || 'MTN',
        gb_size: parseFloat(skb.gb_size),
        label: `${skb.gb_size}GB`,
        cost_price_ghs: parseFloat(skb.your_price),
        is_active: true,
        updated_at: new Date().toISOString()
      };

      const { data: bundle, error: bErr } = await supabaseAdmin
        .from('bundles')
        .upsert(bundleData, { onConflict: 'provider,provider_bundle_id' })
        .select()
        .single();

      if (bErr || !bundle) continue;

      if (!existing) {
        newCount++;
        // Create default pricing for new bundles
        const cost = bundle.cost_price_ghs;
        const prices = [
          { bundle_id: bundle.id, role: 'api_user', sell_price_ghs: cost * 1.05 },
          { bundle_id: bundle.id, role: 'falaa', sell_price_ghs: cost * 1.15 },
          { bundle_id: bundle.id, role: 'base', sell_price_ghs: cost * 1.30 }
        ];
        await supabaseAdmin.from('bundle_role_prices').insert(prices);
      }
    }

    revalidatePath('/dashboard');
    return { success: true, newCount };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Update pricing for a specific role and bundle.
 */
export async function updateBundleRolePrice(bundleId: string, role: UserRole, price: number) {
  const { error } = await supabaseAdmin
    .from('bundle_role_prices')
    .upsert({ bundle_id: bundleId, role, sell_price_ghs: price }, { onConflict: 'bundle_id,role' });

  if (error) return { success: false, message: error.message };
  return { success: true };
}

/**
 * Apply bulk markup to all bundles for a role.
 */
export async function applyBulkMarkup(role: UserRole, percentage: number) {
  const { data: bundles } = await supabaseAdmin.from('bundles').select('id, cost_price_ghs');
  if (!bundles) return { success: false };

  for (const b of bundles) {
    const newPrice = b.cost_price_ghs * (1 + (percentage / 100));
    await supabaseAdmin
      .from('bundle_role_prices')
      .upsert({ bundle_id: b.id, role, sell_price_ghs: newPrice }, { onConflict: 'bundle_id,role' });
  }

  return { success: true };
}
