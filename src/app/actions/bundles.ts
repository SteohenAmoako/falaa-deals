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
    const activeProvider = await getActiveProvider();

    const { data, error } = await supabaseAdmin
      .from('bundles')
      .select(`
        *,
        bundle_role_prices!inner(sell_price_ghs, role)
      `)
      .eq('is_active', true)
      .eq('provider', activeProvider)
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

/**
 * Synchronize bundles from DiceConsult using the provided pricing table.
 */
export async function syncBundlesFromDiceConsult() {
  try {
    const DICE_CATALOG = [
      { gb: 1, cost: 4.70, sell: 5.03 },
      { gb: 2, cost: 9.80, sell: 10.49 },
      { gb: 3, cost: 14.00, sell: 14.98 },
      { gb: 4, cost: 18.50, sell: 19.80 },
      { gb: 5, cost: 23.00, sell: 24.61 },
      { gb: 6, cost: 28.00, sell: 29.96 },
      { gb: 8, cost: 36.00, sell: 38.52 },
      { gb: 10, cost: 43.00, sell: 46.01 },
      { gb: 15, cost: 61.00, sell: 65.27 },
      { gb: 20, cost: 81.00, sell: 86.67 },
      { gb: 25, cost: 99.00, sell: 105.93 },
      { gb: 30, cost: 121.00, sell: 129.47 },
      { gb: 40, cost: 159.00, sell: 170.13 },
      { gb: 50, cost: 197.00, sell: 210.79 },
      { gb: 100, cost: 390.00, sell: 417.30 },
    ];

    let updatedCount = 0;

    for (const pkg of DICE_CATALOG) {
      // Primary focus on MTN as per table, but logic can be replicated for other networks
      const networks = ['MTN', 'Telecel', 'iShare', 'BigTime'];
      
      for (const network of networks) {
        // Skip networks not applicable to certain sizes if necessary, 
        // but for now, we apply the table to the primary requested network.
        if (network !== 'MTN' && pkg.gb > 50) continue; 

        const bundleData = {
          provider: 'diceconsult',
          provider_bundle_id: `${network}_${pkg.gb}GB`,
          network: network,
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

        const roles: UserRole[] = ['api_user', 'falaa', 'base'];
        const markups = { api_user: 1.0, falaa: 1.10, base: 1.25 }; // Fallbacks

        for (const role of roles) {
          let sellPrice = bundle.cost_price_ghs * markups[role];
          
          // Use the EXACT selling price for API users provided in the table
          if (role === 'api_user') {
            sellPrice = pkg.sell;
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
    }

    revalidatePath('/dashboard');
    revalidatePath('/falaadealsadminurl$$/pricing');
    return { success: true, count: updatedCount };
  } catch (error: any) {
    console.error('DiceConsult Sync Error:', error);
    return { success: false, message: error.message };
  }
}

export async function syncBundlesFromSkPlug() {
  try {
    const skBundles = await skPlugClient.getBundles();
    if (!Array.isArray(skBundles)) throw new Error('Invalid response from SK Plug API');

    let updatedCount = 0;
    for (const skb of skBundles) {
      const bundleData = {
        provider: 'skplug',
        provider_bundle_id: skb.id.toString(),
        network: skb.network || 'MTN',
        gb_size: parseFloat(skb.gb_size),
        label: `${parseFloat(skb.gb_size)}GB`,
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
      updatedCount++;

      const cost = bundle.cost_price_ghs;
      const roles: UserRole[] = ['api_user', 'falaa', 'base'];
      const markups = { api_user: 1.05, falaa: 1.15, base: 1.30 };

      for (const role of roles) {
        await supabaseAdmin
          .from('bundle_role_prices')
          .upsert({ bundle_id: bundle.id, role, sell_price_ghs: cost * markups[role] }, { onConflict: 'bundle_id,role' });
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

export async function syncBundlesFromDakazina() {
  try {
    const DAKAZINA_CATALOG = [
      { network: 'MTN', id: '1', gb: 1, cost: 3.55, netId: 3 },
      { network: 'MTN', id: '2', gb: 2, cost: 7.10, netId: 3 },
      { network: 'MTN', id: '3', gb: 3, cost: 10.85, netId: 3 },
      { network: 'MTN', id: '4', gb: 4, cost: 14.20, netId: 3 },
      { network: 'MTN', id: '5', gb: 5, cost: 17.75, netId: 3 },
      { network: 'MTN', id: '6', gb: 6, cost: 21.50, netId: 3 },
      { network: 'MTN', id: '7', gb: 7, cost: 24.85, netId: 3 },
      { network: 'MTN', id: '10', gb: 10, cost: 35.50, netId: 3 },
      { network: 'TELECEL', id: '23', gb: 5, cost: 18.5, netId: 2 },
      { network: 'TELECEL', id: '24', gb: 10, cost: 37, netId: 2 },
      { network: 'AT - iSHare', id: '39', gb: 1, cost: 3.8, netId: 1 },
      { network: 'AT - iSHare', id: '43', gb: 5, cost: 19, netId: 1 },
      { network: 'MTN EXPRESS', id: '50', gb: 1, cost: 3.88, netId: 6 },
    ];

    const MTN_API_FIXED: Record<number, number> = { 1: 3.90, 2: 7.80, 3: 11.70, 4: 15.60, 5: 19.50, 6: 23.50, 7: 26.55, 10: 38.0 };
    const EXPRESS_API_FIXED: Record<number, number> = { 1: 4.10 };

    let updatedCount = 0;
    for (const pkg of DAKAZINA_CATALOG) {
      const bundleData = {
        provider: 'dakazina',
        provider_bundle_id: `${pkg.netId}:${pkg.gb}`,
        network: pkg.network,
        gb_size: Number(pkg.gb),
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

      const cost = bundle.cost_price_ghs;
      const roles: UserRole[] = ['api_user', 'falaa', 'base'];
      const markups = { api_user: 1.05, falaa: 1.15, base: 1.30 };

      for (const role of roles) {
        let sellPrice = cost * markups[role];
        if (role === 'api_user') {
          if (pkg.netId === 3 && MTN_API_FIXED[Number(pkg.gb)]) sellPrice = MTN_API_FIXED[Number(pkg.gb)];
          else if (pkg.netId === 6 && EXPRESS_API_FIXED[Number(pkg.gb)]) sellPrice = EXPRESS_API_FIXED[Number(pkg.gb)];
        }
        await supabaseAdmin.from('bundle_role_prices').upsert({ bundle_id: bundle.id, role, sell_price_ghs: sellPrice }, { onConflict: 'bundle_id,role' });
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
      await supabaseAdmin.from('bundle_role_prices').upsert({ bundle_id: b.id, role, sell_price_ghs: newPrice }, { onConflict: 'bundle_id,role' });
    }
    revalidatePath('/dashboard');
    revalidatePath('/falaadealsadminurl$$/pricing');
    return { success: true };
  } catch (error) { return { success: false }; }
}
