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

/**
 * Syncs the provided static Dakazina bundle list into the database.
 */
export async function syncBundlesFromDakazina() {
  try {
    const DAKAZINA_CATALOG = [
      // MTN (network_id: 3)
      { network: 'MTN', id: '1', gb: 1, cost: 4.50, netId: 3 },
      { network: 'MTN', id: '2', gb: 2, cost: 8.80, netId: 3 },
      { network: 'MTN', id: '3', gb: 3, cost: 12.80, netId: 3 },
      { network: 'MTN', id: '4', gb: 4, cost: 16.50, netId: 3 },
      { network: 'MTN', id: '5', gb: 5, cost: 21.00, netId: 3 },
      { network: 'MTN', id: '6', gb: 6, cost: 25.00, netId: 3 },
      { network: 'MTN', id: '7', gb: 7, cost: 28.50, netId: 3 },
      { network: 'MTN', id: '8', gb: 8, cost: 34.00, netId: 3 },
      { network: 'MTN', id: '9', gb: 9, cost: 36.00, netId: 3 },
      { network: 'MTN', id: '10', gb: 10, cost: 40.00, netId: 3 },
      { network: 'MTN', id: '11', gb: 12, cost: 46.00, netId: 3 },
      { network: 'MTN', id: '12', gb: 15, cost: 58.00, netId: 3 },
      { network: 'MTN', id: '13', gb: 18, cost: 75.00, netId: 3 },
      { network: 'MTN', id: '14', gb: 20, cost: 80.00, netId: 3 },
      { network: 'MTN', id: '15', gb: 22, cost: 90.00, netId: 3 },
      { network: 'MTN', id: '16', gb: 25, cost: 98.00, netId: 3 },
      { network: 'MTN', id: '17', gb: 30, cost: 117.00, netId: 3 },
      { network: 'MTN', id: '18', gb: 40, cost: 155.00, netId: 3 },
      { network: 'MTN', id: '19', gb: 50, cost: 192.00, netId: 3 },
      { network: 'MTN', id: '20', gb: 92, cost: 340.00, netId: 3 },
      { network: 'MTN', id: '21', gb: 100, cost: 375.00, netId: 3 },
      { network: 'MTN', id: '22', gb: 200, cost: 620.00, netId: 3 },
      
      // TELECEL (network_id: 2)
      { network: 'TELECEL', id: '23', gb: 5, cost: 21.00, netId: 2 },
      { network: 'TELECEL', id: '24', gb: 10, cost: 41.00, netId: 2 },
      { network: 'TELECEL', id: '25', gb: 15, cost: 58.00, netId: 2 },
      { network: 'TELECEL', id: '26', gb: 20, cost: 78.00, netId: 2 },
      { network: 'TELECEL', id: '27', gb: 30, cost: 115.00, netId: 2 },
      { network: 'TELECEL', id: '28', gb: 40, cost: 152.00, netId: 2 },
      { network: 'TELECEL', id: '29', gb: 50, cost: 187.00, netId: 2 },

      // AT - BigTime (network_id: 4)
      { network: 'AT - BigTime', id: '30', gb: 15, cost: 60.00, netId: 4 },
      { network: 'AT - BigTime', id: '31', gb: 20, cost: 70.00, netId: 4 },
      { network: 'AT - BigTime', id: '32', gb: 30, cost: 80.00, netId: 4 },
      { network: 'AT - BigTime', id: '33', gb: 40, cost: 95.00, netId: 4 },
      { network: 'AT - BigTime', id: '34', gb: 50, cost: 120.00, netId: 4 },
      { network: 'AT - BigTime', id: '35', gb: 60, cost: 145.00, netId: 4 },
      { network: 'AT - BigTime', id: '36', gb: 80, cost: 180.00, netId: 4 },
      { network: 'AT - BigTime', id: '37', gb: 100, cost: 200.00, netId: 4 },
      { network: 'AT - BigTime', id: '38', gb: 200, cost: 380.00, netId: 4 },

      // AT - iSHare (network_id: 1)
      { network: 'AT - iSHare', id: '39', gb: 1, cost: 4.50, netId: 1 },
      { network: 'AT - iSHare', id: '40', gb: 2, cost: 8.50, netId: 1 },
      { network: 'AT - iSHare', id: '41', gb: 3, cost: 12.50, netId: 1 },
      { network: 'AT - iSHare', id: '42', gb: 4, cost: 17.00, netId: 1 },
      { network: 'AT - iSHare', id: '43', gb: 5, cost: 20.00, netId: 1 },
      { network: 'AT - iSHare', id: '44', gb: 6, cost: 24.50, netId: 1 },
      { network: 'AT - iSHare', id: '45', gb: 7, cost: 29.00, netId: 1 },
      { network: 'AT - iSHare', id: '46', gb: 8, cost: 32.50, netId: 1 },
      { network: 'AT - iSHare', id: '47', gb: 9, cost: 35.50, netId: 1 },
      { network: 'AT - iSHare', id: '48', gb: 10, cost: 41.00, netId: 1 },

      // MTN EXPRESS (network_id: 6)
      { network: 'MTN EXPRESS', id: '50', gb: 1, cost: 5.00, netId: 6 },
      { network: 'MTN EXPRESS', id: '51', gb: 2, cost: 9.50, netId: 6 },
      { network: 'MTN EXPRESS', id: '52', gb: 3, cost: 13.50, netId: 6 },
      { network: 'MTN EXPRESS', id: '53', gb: 4, cost: 17.50, netId: 6 },
      { network: 'MTN EXPRESS', id: '54', gb: 5, cost: 23.00, netId: 6 },
      { network: 'MTN EXPRESS', id: '55', gb: 6, cost: 26.50, netId: 6 },
      { network: 'MTN EXPRESS', id: '56', gb: 7, cost: 31.00, netId: 6 },
      { network: 'MTN EXPRESS', id: '57', gb: 8, cost: 35.00, netId: 6 },
      { network: 'MTN EXPRESS', id: '58', gb: 10, cost: 44.00, netId: 6 },
      { network: 'MTN EXPRESS', id: '59', gb: 15, cost: 61.00, netId: 6 },
      { network: 'MTN EXPRESS', id: '60', gb: 20, cost: 85.00, netId: 6 },
      { network: 'MTN EXPRESS', id: '61', gb: 25, cost: 103.00, netId: 6 },
      { network: 'MTN EXPRESS', id: '62', gb: 30, cost: 120.00, netId: 6 },
      { network: 'MTN EXPRESS', id: '63', gb: 40, cost: 160.00, netId: 6 },
      { network: 'MTN EXPRESS', id: '64', gb: 50, cost: 200.00, netId: 6 },
    ];

    let updatedCount = 0;

    for (const pkg of DAKAZINA_CATALOG) {
      // We store the network_id in a way that our buy action can use it.
      // We'll use provider_bundle_id for the 'shared_bundle' value (GB)
      // and maybe a custom metadata if needed, but the current schema uses provider_bundle_id
      // for unique identification. For Dakazina, let's store "netId:vol" as the provider_bundle_id.
      
      const bundleData = {
        provider: 'dakazina',
        provider_bundle_id: `${pkg.netId}:${pkg.gb}`,
        network: pkg.network,
        gb_size: pkg.gb,
        label: `${pkg.gb}GB`,
        cost_price_ghs: pkg.cost,
        is_active: true,
        updated_at: new Date().toISOString()
      };

      const { data: bundle, error: bErr } = await supabaseAdmin
        .from('bundles')
        .upsert(bundleData, { onConflict: 'provider,provider_bundle_id' })
        .select()
        .single();

      if (bErr || !bundle) continue;

      updatedCount++;

      // Default markups (same logic as SK Plug)
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
    console.error('Dakazina Sync Error:', error);
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
