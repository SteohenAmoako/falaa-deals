'use server';

import { createClient } from '@supabase/supabase-js';
import { getUpstreamDashboard, getUpstreamOrderHistory } from '@/lib/rahitalu';
import { skPlugClient } from '@/lib/skplug/client';
import { revalidatePath } from 'next/cache';
import { UserRole } from '@/lib/types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const PLAN_COSTS: Record<string, number> = {
  '6a282f0167c07f8445745e7b': 6.5, // 3.4GB
  '6a282eb267c07f8445745dcc': 12.5, // 5.1GB
};

export async function checkIsAdmin(userId: string) {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return false;
    return profile?.is_admin === true;
  } catch (err) {
    return false;
  }
}

export async function getSystemStatus() {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_configs')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle();

    if (error) return { enabled: true, message: '' };
    return data?.value || { enabled: true, message: '' };
  } catch (error) {
    return { enabled: true, message: '' };
  }
}

export async function getAdminDashboardData() {
  try {
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const today = new Date().toISOString().split('T')[0];
    
    const { data: depositsToday } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'credit')
      .eq('status', 'success')
      .gte('created_at', today);

    const todayDepositsAmount = (depositsToday || []).reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);

    const { data: allSuccessfulOrders } = await supabaseAdmin
      .from('rahitalu_orders')
      .select('user_id, plan_id, sell_price_ghs, created_at, status')
      .not('status', 'eq', 'failed');

    let totalProfit = 0;
    let todayProfit = 0;

    (allSuccessfulOrders || []).forEach(order => {
      const cost = PLAN_COSTS[order.plan_id] || 0;
      const profit = parseFloat(order.sell_price_ghs.toString()) - cost;
      totalProfit += profit;
      if (order.created_at.startsWith(today)) todayProfit += profit;
    });

    const { count: todayOrdersCount } = await supabaseAdmin
      .from('rahitalu_orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    const upstreamDash = await getUpstreamDashboard().catch(() => ({ wallet: { balance: 0 } }));
    const upstreamOrders = await getUpstreamOrderHistory(100).catch(() => []);

    const { data: users } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone, reference_code, wallet_balance, created_at, user_id, role')
      .order('created_at', { ascending: false })
      .limit(500);

    const { data: recentTransactions } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*, profiles(full_name)')
      .eq('type', 'credit')
      .order('created_at', { ascending: false })
      .limit(200);

    const systemStatus = await getSystemStatus();

    const formatGbRaw = (gb: any) => {
      if (!gb) return '';
      const clean = gb.toString().replace('GB', '').trim();
      const value = parseFloat(clean);
      return (isNaN(value) ? clean : value.toString()) + 'GB';
    };

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
      orders: allSuccessfulOrders || [],
      recentTransactions: recentTransactions || [],
      liveStream: (upstreamOrders || []).map((order: any) => ({
        id: order._id || order.id || Math.random().toString(),
        reference: order.reference || 'N/A',
        phone: order.phone || order.customerPhone || 'Unknown',
        plan: order.gig ? `${formatGbRaw(order.gig)} MTN` : 'Data Bundle',
        price: order.amount ? Number(order.amount).toFixed(2) : order.sellPriceGHS ? Number(order.sellPriceGHS).toFixed(2) : null,
        status: (order.upstreamStatus || order.status || 'pending').toLowerCase(),
        timestamp: order.upstreamUpdatedAt || order.createdAt || order.created_at || new Date().toISOString(),
      }))
    };
  } catch (error) {
    console.error('getAdminDashboardData Error:', error);
    return {
      stats: { totalUsers: 0, todayDeposits: 0, todayOrders: 0, rahitaluBalance: 0, totalProfit: 0, todayProfit: 0 },
      systemStatus: { enabled: true, message: '' },
      users: [],
      orders: [],
      recentTransactions: [],
      liveStream: []
    };
  }
}

export async function assignUserRole(userId: string, role: UserRole) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role })
    .eq('user_id', userId);

  if (error) throw error;
  revalidatePath('/falaadealsadminurl$$');
  return { success: true };
}

export async function updateSystemStatus(enabled: boolean, message: string) {
  try {
    await supabaseAdmin
      .from('system_configs')
      .upsert({ 
        key: 'maintenance_mode', 
        value: { enabled, message },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function adjustUserBalance(profileId: string, amount: number, type: 'credit' | 'debit', reason: string) {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, wallet_balance')
      .eq('id', profileId)
      .single();

    if (!profile) throw new Error('User profile not found');

    const currentBalance = parseFloat(profile.wallet_balance.toString());
    const newBalance = type === 'credit' ? currentBalance + amount : currentBalance - amount;

    if (newBalance < 0 && type === 'debit') throw new Error('Insufficient funds');

    await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profileId);

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
    return { success: false, message: error.message };
  }
}

export async function registerSkPlugWebhook(appUrl: string) {
  try {
    const callbackUrl = `${appUrl.replace(/\/+$/, '')}/api/webhooks/skplug`;
    const res = await skPlugClient.registerCallbackUrl(callbackUrl);
    return { success: true, message: res.message };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
