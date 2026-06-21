'use server';

import { createClient } from '@supabase/supabase-js';
import { getUpstreamDashboard } from '@/lib/rahitalu';
import { skPlugClient } from '@/lib/skplug/client';
import { revalidatePath } from 'next/cache';
import { UserRole } from '@/lib/types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// We keep these for legacy profit calculation if needed
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
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Stats and Counts
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { data: depositsToday } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'credit')
      .eq('status', 'success')
      .gte('created_at', today);

    const todayDepositsAmount = (depositsToday || []).reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);

    const { count: todayOrdersCount } = await supabaseAdmin
      .from('rahitalu_orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    const upstreamDash = await getUpstreamDashboard().catch(() => ({ wallet: { balance: 0 } }));

    // 2. Fetch Rich Audit Data
    // Fetch orders from both tables joined with profiles for references
    const [rahitaluOrdersRes, skplugOrdersRes] = await Promise.all([
      supabaseAdmin
        .from('rahitalu_orders')
        .select('*, profiles(reference_code)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabaseAdmin
        .from('skplug_orders')
        .select('*, profiles(reference_code)')
        .order('created_at', { ascending: false })
        .limit(200)
    ]);

    // Fetch Credit Transactions (Deposits) for the audit tab
    const { data: recentTransactions } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*, profiles(full_name, reference_code)')
      .eq('type', 'credit')
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(300);

    // Fetch All Users for Customer Tier tab
    const { data: users } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone, reference_code, wallet_balance, created_at, user_id, role')
      .order('created_at', { ascending: false })
      .limit(1000);

    const systemStatus = await getSystemStatus();

    // 3. Process Live Feed (Orders)
    const combinedOrders = [
      ...(rahitaluOrdersRes.data || []).map(o => ({
        id: o.id,
        phone: o.phone,
        plan: o.gig,
        status: o.status,
        timestamp: o.created_at,
        user_ref: o.profiles?.reference_code || 'N/A'
      })),
      ...(skplugOrdersRes.data || []).map(o => ({
        id: o.id,
        phone: o.recipient,
        plan: `${o.gb_size}GB`,
        status: o.status,
        timestamp: o.created_at,
        user_ref: o.profiles?.reference_code || 'N/A'
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      stats: {
        totalUsers: totalUsers || 0,
        todayDeposits: todayDepositsAmount,
        todayOrders: todayOrdersCount || 0,
        rahitaluBalance: upstreamDash?.wallet?.balance || 0,
        totalProfit: 0, // Placeholder
        todayProfit: 0  // Placeholder
      },
      systemStatus,
      users: users || [],
      recentTransactions: recentTransactions || [],
      liveStream: combinedOrders.slice(0, 200)
    };
  } catch (error) {
    console.error('getAdminDashboardData Error:', error);
    return {
      stats: { totalUsers: 0, todayDeposits: 0, todayOrders: 0, rahitaluBalance: 0, totalProfit: 0, todayProfit: 0 },
      systemStatus: { enabled: true, message: '' },
      users: [],
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
