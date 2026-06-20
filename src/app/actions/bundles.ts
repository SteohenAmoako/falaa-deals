'use server';

import { createClient } from '@supabase/supabase-js';
import { skPlugClient } from '@/lib/skplug/client';
import { revalidatePath } from 'next/cache';
import { UserRole, Bundle } from '@/lib/types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getBundlesForRole(role: UserRole): Promise<Bundle[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('bundles')
      .select(`
        *,
        bundle_role_prices!inner(sell_price_ghs, role)
      `)
      .eq('is_active', true)
      .eq('bundle_role_prices.role', role || 'base')
      .order('network')
      .order('gb_size');

    if (error) {
      console.error('Fetch Bundles Error:', error);
      return [];
    }

    if (!data) return [];

    return data.map(b => ({
      ...b,
      sell_price_ghs: b.bundle_role_prices[0]?.sell_price_ghs || b.cost_price_ghs * 1.3
    }));
  } catch (error) {
    console.error('getBundlesForRole Critical Error:', error);
    return [];
  }
}

export async function syncBundlesFromSkPlug() {
  try {
    const skBundles = await skPlugClient.getBundles();
    if (!Array.isArray(skBundles)) {
      throw new Error('Invalid response from SK Plug API');
    }

    let updatedCount = 0;

    for (const skb of skBundles) {
      const cleanGb = parseFloat(skb.gb_size).toString();
      const bundleData = {
        provider: 'skplug',
        provider_bundle_id: skb.id.toString(),
        network: skb.network || 'MTN',
        gb_size: parseFloat(skb.gb_size),
        label: `${cleanGb}GB`,
        cost_price_ghs: parseFloat(skb.your_price),
        is_active: true,
        updated_at: new Date().toISOString()
      };

      const { data: bundle, error: bErr } = await supabaseAdmin
        .from('bundles')
        .upsert(bundleData, { onConflict: 'provider,provider_bundle_id' })
        .select()
        .single();

      if (bErr || !bundle) {
        console.error('Bundle Upsert Error:', bErr);
        continue;
      }

      updatedCount++;

      const cost = bundle.cost_price_ghs;
      const roles: UserRole[] = ['api_user', 'falaa', 'base'];
      const markups = { api_user: 1.05, falaa: 1.15, base: 1.30 };

      for (const role of roles) {
        await supabaseAdmin
          .from('bundle_role_prices')
          .upsert({
            bundle_id: bundle.id,
            role,
            sell_price_ghs: cost * markups[role]
          }, { onConflict: 'bundle_id,role' });
      }
    }

    revalidatePath('/dashboard');
    revalidatePath('/falaadealsadminurl$$/pricing');
    return { success: true, count: updatedCount };
  } catch (error: any) {
    console.error('Sync Error:', error);
    return { success: false, message: error.message };
  }
}

export async function updateBundleRolePrice(bundleId: string, role: UserRole, price: number) {
  const { error } = await supabaseAdmin
    .from('bundle_role_prices')
    .upsert({ bundle_id: bundleId, role, sell_price_ghs: price }, { onConflict: 'bundle_id,role' });

  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function applyBulkMarkup(role: UserRole, percentage: number) {
  try {
    const { data: bundles } = await supabaseAdmin.from('bundles').select('id, cost_price_ghs');
    if (!bundles) return { success: false };

    for (const b of bundles) {
      const newPrice = b.cost_price_ghs * (1 + (percentage / 100));
      await supabaseAdmin
        .from('bundle_role_prices')
        .upsert({ bundle_id: b.id, role, sell_price_ghs: newPrice }, { onConflict: 'bundle_id,role' });
    }

    revalidatePath('/dashboard');
    revalidatePath('/falaadealsadminurl$$/pricing');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
