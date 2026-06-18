'use server';

import { createClient } from '@supabase/supabase-js';
import { getUpstreamDashboard, getUpstreamOrderHistory } from '@/lib/rahitalu';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLAN_COSTS: Record<string, number> = {
  '6a282f0167c07f8445745e7b': 6.5, // 3.4GB
  '6a282eb267c07f8445745dcc': 12.5, // 5.1GB
};

/**
 * Fetches the maintenance mode status.
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

    return data?.value || { enabled: true, message: '' };
  } catch (error) {
    return { enabled: true, message: '' };
  }
}

/**
 * Aggregates data for the Admin Dashboard.
 */
export async function getAdminDashboardData() {
  try {
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const today = new Date().toISOString().split('T')[0];
    
    // Fetch successful deposits
    const { data: depositsToday } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'credit')
      .eq('status', 'success')
      .gte('created_at', today);

    const todayDepositsAmount = (depositsToday || []).reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);

    // Fetch orders to calculate profit
    const { data: allSuccessfulOrders } = await supabaseAdmin
      .from('rahitalu_orders')
      .select('plan_id, sell_price_ghs, created_at')
      .not('status', 'eq', 'failed');

    let totalProfit = 0;
    let todayProfit = 0;

    (allSuccessfulOrders || []).forEach(order => {
      const cost = PLAN_COSTS[order.plan_id] || 0;
      const profit = parseFloat(order.sell_price_ghs.toString()) - cost;
      
      totalProfit += profit;
      if (order.created_at.startsWith(today)) {
        todayProfit += profit;
      }
    });

    const { count: todayOrdersCount } = await supabaseAdmin
      .from('rahitalu_orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    const upstreamDash = await getUpstreamDashboard();
    const upstreamOrders = await getUpstreamOrderHistory(50);

    const { data: users } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone, reference_code, wallet_balance, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(100);

    const { data: recentTransactions } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*, profiles(full_name)')
      .eq('type', 'credit')
      .order('created_at', { ascending: false })
      .limit(50);

    const systemStatus = await getSystemStatus();

    return {
      stats: {
        totalUsers: totalUsers || 0,
        todayDeposits: todayDepositsAmount,
        todayOrders: todayOrdersCount || 0,
        rahitaluBalance: upstreamDash?.wallet?.balance || 0,
        totalProfit: totalProfit,
        todayProfit: todayProfit
      },
      systemStatus,
      users: users || [],
      recentTransactions: recentTransactions || [],
      liveStream: (upstreamOrders || []).map((order: any) => ({
        id: order._id || order.id || Math.random().toString(),
        reference: order.reference || 'N/A',
        phone: order.phone || order.customerPhone || 'Unknown',
        plan: order.gig ? `${order.gig}GB MTN` : 'Data Bundle',
        price: order.amount ? Number(order.amount).toFixed(2) : order.sellPriceGHS ? Number(order.sellPriceGHS).toFixed(2) : null,
        status: (order.upstreamStatus || order.status || 'pending').toLowerCase(),
        timestamp: order.upstreamUpdatedAt || order.createdAt || order.created_at || new Date().toISOString(),
      }))
    };
  } catch (error: any) {
    console.error('Admin Data Fetch Failed:', error);
    throw new Error('Could not retrieve administrative data');
  }
}

export async function updateSystemStatus(enabled: boolean, message: string) {
  try {
    const { error } = await supabaseAdmin
      .from('system_configs')
      .upsert({ 
        key: 'maintenance_mode', 
        value: { enabled, message },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Manually adjusts a user's wallet balance.
 */
export async function adjustUserBalance(profileId: string, amount: number, type: 'credit' | 'debit', reason: string) {
  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, wallet_balance')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) throw new Error('User profile not found');

    const currentBalance = parseFloat(profile.wallet_balance.toString());
    const newBalance = type === 'credit' ? currentBalance + amount : currentBalance - amount;

    if (newBalance < 0 && type === 'debit') {
      throw new Error('Insufficient funds for this debit operation');
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profileId);

    if (updateError) throw updateError;

    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: profile.user_id,
      amount,
      type,
      status: 'success',
      reference: `ADM-${Math.random().toString(36).substring(7).toUpperCase()}`,
      description: `Admin ${type === 'credit' ? 'Credit' : 'Debit'}: ${reason}`,
    });

    revalidatePath('/dashboard');
    return { success: true, newBalance };
  } catch (error: any) {
    console.error('Adjust Balance Error:', error);
    return { success: false, message: error.message };
  }
}
