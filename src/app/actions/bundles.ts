'use server';

import { createClient } from '@supabase/supabase-js';
import { skPlugClient } from '@/lib/skplug/client';
import { revalidatePath } from 'next/cache';
import { UserRole, Bundle } from '@/lib/types';
import { getActiveProvider } from '@/app/actions/admin';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetches active bundles for a specific role, filtered by the CURRENT ACTIVE PROVIDER.
 */
export async function getBundlesForRole(role: UserRole): Promise<Bundle[]> {
  try {
    // 1. Determine which provider is currently active
    const activeProvider = await getActiveProvider();

    // 2. Fetch bundles ONLY for the active provider
    const { data, error } = await supabaseAdmin
      .from('bundles')
      .select(`
        *,
        bundle_role_prices!inner(sell_price_ghs, role)
      `)
      .eq('is_active', true)
      .eq('provider', activeProvider) // Crucial filter for total provider switch
      .eq('bundle_role_prices.role', role || 'base')
      .order('network')
      .order('gb_size');

    if (error) {
      console.error('Fetch Bundles Error:', error);
      return [];
    }

    if (!data) return [];

    // Map the specific role price to the bundle object
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
 * Syncs the provided static Dakazina bundle list into the database with fixed API user pricing.
 */
export async function syncBundlesFromDakazina() {
  try {
    const DAKAZINA_CATALOG = [
      // MTN (network_id: 3) - Costs updated to 0% markup table provided
      { network: 'MTN', id: '1', gb: 1, cost: 3.55, netId: 3 },
      { network: 'MTN', id: '2', gb: 2, cost: 7.10, netId: 3 },
      { network: 'MTN', id: '3', gb: 3, cost: 10.85, netId: 3 },
      { network: 'MTN', id: '4', gb: 4, cost: 14.20, netId: 3 },
      { network: 'MTN', id: '5', gb: 5, cost: 17.75, netId: 3 },
      { network: 'MTN', id: '6', gb: 6, cost: 21.50, netId: 3 },
      { network: 'MTN', id: '7', gb: 7, cost: 24.85, netId: 3 },
      { network: 'MTN', id: '8', gb: 8, cost: 28.80, netId: 3 },
      { network: 'MTN', id: '9', gb: 9, cost: 31.95, netId: 3 },
      { network: 'MTN', id: '10', gb: 10, cost: 35.50, netId: 3 },
      { network: 'MTN', id: '11', gb: 12, cost: 42.60, netId: 3 },
      { network: 'MTN', id: '12', gb: 15, cost: 53.00, netId: 3 },
      { network: 'MTN', id: '13', gb: 18, cost: 65.50, netId: 3 },
      { network: 'MTN', id: '14', gb: 20, cost: 71.50, netId: 3 },
      { network: 'MTN', id: '15', gb: 22, cost: 80.00, netId: 3 },
      { network: 'MTN', id: '16', gb: 25, cost: 88.95, netId: 3 },
      { network: 'MTN', id: '17', gb: 30, cost: 107.50, netId: 3 },
      { network: 'MTN', id: '18', gb: 40, cost: 144.00, netId: 3 },
      { network: 'MTN', id: '19', gb: 50, cost: 177.50, netId: 3 },
      { network: 'MTN', id: '20', gb: 92, cost: 325.00, netId: 3 },
      { network: 'MTN', id: '21', gb: 100, cost: 354.00, netId: 3 },
      { network: 'MTN', id: '22', gb: 200, cost: 580.00, netId: 3 },
      
      // TELECEL (network_id: 2)
      { network: 'TELECEL', id: '23', gb: 5, cost: 18.5, netId: 2 },
      { network: 'TELECEL', id: '24', gb: 10, cost: 37, netId: 2 },
      { network: 'TELECEL', id: '25', gb: 15, cost: 55, netId: 2 },
      { network: 'TELECEL', id: '26', gb: 20, cost: 73, netId: 2 },
      { network: 'TELECEL', id: '27', gb: 30, cost: 108, netId: 2 },
      { network: 'TELECEL', id: '28', gb: 40, cost: 143, netId: 2 },
      { network: 'TELECEL', id: '29', gb: 50, cost: 178, netId: 2 },

      // AT - BigTime (network_id: 4)
      { network: 'AT - BigTime', id: '30', gb: 15, cost: 55, netId: 4 },
      { network: 'AT - BigTime', id: '31', gb: 20, cost: 55, netId: 4 },
      { network: 'AT - BigTime', id: '32', gb: 30, cost: 65, netId: 4 },
      { network: 'AT - BigTime', id: '33', gb: 40, cost: 75, netId: 4 },
      { network: 'AT - BigTime', id: '34', gb: 50, cost: 85, netId: 4 },
      { network: 'AT - BigTime', id: '35', gb: 60, cost: 105, netId: 4 },
      { network: 'AT - BigTime', id: '36', gb: 80, cost: 125, netId: 4 },
      { network: 'AT - BigTime', id: '37', gb: 100, cost: 160, netId: 4 },
      { network: 'AT - BigTime', id: '38', gb: 200, cost: 290, netId: 4 },

      // AT - iSHare (network_id: 1)
      { network: 'AT - iSHare', id: '39', gb: 1, cost: 3.8, netId: 1 },
      { network: 'AT - iSHare', id: '40', gb: 2, cost: 7.6, netId: 1 },
      { network: 'AT - iSHare', id: '41', gb: 3, cost: 11.4, netId: 1 },
      { network: 'AT - iSHare', id: '42', gb: 4, cost: 15.2, netId: 1 },
      { network: 'AT - iSHare', id: '43', gb: 5, cost: 19, netId: 1 },
      { network: 'AT - iSHare', id: '44', gb: 6, cost: 22.8, netId: 1 },
      { network: 'AT - iSHare', id: '45', gb: 7, cost: 26.6, netId: 1 },
      { network: 'AT - iSHare', id: '46', gb: 8, cost: 30.4, netId: 1 },
      { network: 'AT - iSHare', id: '47', gb: 9, cost: 34, netId: 1 },
      { network: 'AT - iSHare', id: '48', gb: 10, cost: 37, netId: 1 },

      // MTN AFA (network_id: 5)
      { network: 'MTN AFA', id: '49', gb: 1, cost: 10.5, netId: 5 },

      // MTN EXPRESS (network_id: 6)
      { network: 'MTN EXPRESS', id: '50', gb: 1, cost: 3.88, netId: 6 },
      { network: 'MTN EXPRESS', id: '51', gb: 2, cost: 7.76, netId: 6 },
      { network: 'MTN EXPRESS', id: '52', gb: 3, cost: 11.64, netId: 6 },
      { network: 'MTN EXPRESS', id: '53', gb: 4, cost: 15.52, netId: 6 },
      { network: 'MTN EXPRESS', id: '54', gb: 5, cost: 19.4, netId: 6 },
      { network: 'MTN EXPRESS', id: '55', gb: 6, cost: 23.28, netId: 6 },
      { network: 'MTN EXPRESS', id: '56', gb: 7, cost: 27.16, netId: 6 },
      { network: 'MTN EXPRESS', id: '57', gb: 8, cost: 31.5, netId: 6 },
      { network: 'MTN EXPRESS', id: '58', gb: 10, cost: 38, netId: 6 },
      { network: 'MTN EXPRESS', id: '59', gb: 15, cost: 57, netId: 6 },
      { network: 'MTN EXPRESS', id: '60', gb: 20, cost: 76, netId: 6 },
      { network: 'MTN EXPRESS', id: '61', gb: 25, cost: 96, netId: 6 },
      { network: 'MTN EXPRESS', id: '62', gb: 30, cost: 115, netId: 6 },
      { network: 'MTN EXPRESS', id: '63', gb: 40, cost: 152, netId: 6 },
      { network: 'MTN EXPRESS', id: '64', gb: 50, cost: 191, netId: 6 },
    ];

    // API User fixed price mapping (MTN & EXPRESS)
    const MTN_API_FIXED: Record<number, number> = {
      1: 3.90, 2: 7.80, 3: 11.70, 4: 15.60, 5: 19.50, 6: 23.50, 7: 26.55, 8: 31.0, 
      9: 33.85, 10: 38.0, 12: 45.50, 15: 57.0, 18: 68.50, 20: 76.50, 22: 84.00, 
      25: 96.00, 30: 115.00, 40: 152.00, 50: 188.00, 92: 335.00, 100: 375.00, 200: 580.00
    };

    const EXPRESS_API_FIXED: Record<number, number> = {
      1: 4.10, 2: 8.20, 3: 12.30, 4: 16.40, 5: 20.60, 6: 24.70, 8: 32.80, 
      10: 39.50, 15: 58.00, 20: 78.60, 25: 97.50, 30: 119.00, 40: 158.50, 50: 196.00, 100: 370.00
    };

    let updatedCount = 0;

    for (const pkg of DAKAZINA_CATALOG) {
      const bundleData = {
        provider: 'dakazina',
        provider_bundle_id: `${pkg.netId}:${pkg.gb}`,
        network: pkg.network,
        gb_size: pkg.gb === 'REGISTRATION' ? 0 : Number(pkg.gb),
        label: pkg.gb === 'REGISTRATION' ? 'REGISTRATION' : `${pkg.gb}GB`,
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

      const cost = bundle.cost_price_ghs;
      const roles: UserRole[] = ['api_user', 'falaa', 'base'];
      const markups = { api_user: 1.05, falaa: 1.15, base: 1.30 };

      for (const role of roles) {
        let sellPrice = cost * markups[role];

        // Apply fixed prices for API User (MTN / EXPRESS)
        if (role === 'api_user') {
          if (pkg.netId === 3 && MTN_API_FIXED[Number(pkg.gb)]) {
            sellPrice = MTN_API_FIXED[Number(pkg.gb)];
          } else if (pkg.netId === 6 && EXPRESS_API_FIXED[Number(pkg.gb)]) {
            sellPrice = EXPRESS_API_FIXED[Number(pkg.gb)];
          }
        }

        await supabaseAdmin
          .from('bundle_role_prices')
          .upsert({
            bundle_id: bundle.id,
            role,
            sell_price_ghs: sellPrice
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
