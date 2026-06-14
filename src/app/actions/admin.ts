
'use server';

import { createClient } from '@supabase/supabase-js';
import { getUpstreamDashboard, getUpstreamOrderHistory } from '@/lib/rahitalu';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetches only the system status. 
 * Defaults to enabled if not found, but logs errors for debugging.
 */
export async function getSystemStatus() {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_configs')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle();

    if (error) {
      console.error('Error fetching system status:', error.message);
      return { enabled: true, message: '' };
    }

    // Return the stored value or the default
    return data?.value || { enabled: true, message: '' };
  } catch (error) {
    return { enabled: true, message: '' };
  }
}

export async function getAdminDashboardData() {
  try {
    // 1. Fetch system stats from Supabase
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const today = new Date().toISOString().split('T')[0];
    
    const { data: deposits } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'credit')
      .eq('status', 'success')
      .gte('created_at', today);

    const todayDeposits = (deposits || []).reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);

    const { count: todayOrders } = await supabaseAdmin
      .from('rahitalu_orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // 2. Fetch upstream stats from Rahitalu
    const upstreamDash = await getUpstreamDashboard();
    const upstreamOrders = await getUpstreamOrderHistory(20);

    // 3. Fetch user directory
    const { data: users } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, reference_code, wallet_balance, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    // 4. Fetch system status
    const systemStatus = await getSystemStatus();

    return {
      stats: {
        totalUsers: totalUsers || 0,
        todayDeposits,
        todayOrders: todayOrders || 0,
        rahitaluBalance: upstreamDash?.wallet?.balance || 0
      },
      systemStatus,
      users: users || [],
      liveStream: (upstreamOrders || []).map((order: any) => ({
        id: order._id || order.id || Math.random().toString(),
        reference: order.reference || 'N/A',
        phone: order.phone || order.customerPhone || 'Unknown',
        plan: order.gig
          ? `${order.gig}GB MTN`
          : 'Data Bundle',
        price: order.amount
          ? Number(order.amount).toFixed(2)
          : order.sellPriceGHS
          ? Number(order.sellPriceGHS).toFixed(2)
          : null,
        status: (order.upstreamStatus || order.status || 'pending').toLowerCase(),
        timestamp: order.upstreamUpdatedAt || order.createdAt || order.created_at || new Date().toISOString(),
      }))
    };
  } catch (error: any) {
    console.error('Admin Data Fetch Failed');
    throw new Error('Could not retrieve administrative data');
  }
}

/**
 * Updates the global system status in the system_configs table.
 */
export async function updateSystemStatus(enabled: boolean, message: string) {
  try {
    const { error } = await supabaseAdmin
      .from('system_configs')
      .upsert({ 
        key: 'maintenance_mode', 
        value: { enabled, message },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      console.error('Update System Status Failed:', error.message);
      return { success: false, message: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
