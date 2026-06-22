
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

export async function getActiveProvider(): Promise<'skplug' | 'dakazina'> {
  try {
    const { data } = await supabaseAdmin
      .from('system_configs')
      .select('value')
      .eq('key', 'active_provider')
      .maybeSingle();
    return data?.value?.provider || 'skplug';
  } catch {
    return 'skplug';
  }
}

export async function updateActiveProvider(provider: 'skplug' | 'dakazina') {
  try {
    await supabaseAdmin
      .from('system_configs')
      .upsert({ 
        key: 'active_provider', 
        value: { provider },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    
    revalidatePath('/dashboard');
    revalidatePath('/falaadealsadminurl$$');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getAdminDashboardData() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { data: depositsToday } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'credit')
      .eq('status', 'success')
      .gte('created_at', today);

    const todayDepositsAmount = (depositsToday || []).reduce((sum, tx) => {
      const val = parseFloat(tx.amount?.toString() || '0');
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const [rahCount, skCount, dakCount] = await Promise.all([
      supabaseAdmin.from('rahitalu_orders').select('*', { count: 'exact', head: true }).gte('created_at', today),
      supabaseAdmin.from('skplug_orders').select('*', { count: 'exact', head: true }).gte('created_at', today),
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today),
    ]);
    const totalTodayOrders = (rahCount.count || 0) + (skCount.count || 0) + (dakCount.count || 0);

    const upstreamDash = await getUpstreamDashboard().catch(() => ({ wallet: { balance: 0 } }));

    const [rahitaluOrdersRes, skplugOrdersRes, dakazinaOrdersRes, walletTxRes, usersRes] = await Promise.all([
      supabaseAdmin.from('rahitalu_orders').select('*, profiles(reference_code)').order('created_at', { ascending: false }).limit(200),
      supabaseAdmin.from('skplug_orders').select('*, profiles(reference_code)').order('created_at', { ascending: false }).limit(200),
      supabaseAdmin.from('orders').select('*, profiles(reference_code)').order('created_at', { ascending: false }).limit(500),
      supabaseAdmin.from('wallet_transactions').select('*, profiles(full_name, reference_code, phone)').order('created_at', { ascending: false }).limit(500),
      supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }).limit(1000)
    ]);

    const activeProvider = await getActiveProvider();

    const allOrders = [
      ...(rahitaluOrdersRes.data || []).map(o => ({
        id: o.id,
        phone: o.phone,
        plan: o.gig,
        status: o.status,
        timestamp: o.created_at,
        user_ref: (o.profiles as any)?.reference_code || 'N/A',
        provider: 'rahitalu'
      })),
      ...(skplugOrdersRes.data || []).map(o => ({
        id: o.id,
        phone: o.recipient,
        plan: `${o.gb_size}GB`,
        status: o.status,
        timestamp: o.created_at,
        user_ref: (o.profiles as any)?.reference_code || 'N/A',
        provider: 'skplug'
      })),
      ...(dakazinaOrdersRes.data || []).map(o => ({
        id: o.id,
        phone: o.phone_number,
        plan: `${o.package_id}GB`,
        status: o.status,
        timestamp: o.created_at,
        user_ref: (o.profiles as any)?.reference_code || 'N/A',
        provider: 'dakazina'
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const allDeposits = (walletTxRes.data || [])
      .filter(tx => tx.type === 'credit' && tx.status === 'success')
      .map(tx => ({
        id: tx.id,
        phone: tx.profiles?.phone || 'N/A',
        name: tx.profiles?.full_name || 'N/A',
        user_ref: tx.profiles?.reference_code || 'N/A',
        amount: parseFloat(tx.amount || 0),
        reference: tx.reference,
        timestamp: tx.created_at,
        description: tx.description
      }));

    return {
      stats: {
        totalUsers: totalUsers || 0,
        todayDeposits: todayDepositsAmount,
        todayOrders: totalTodayOrders,
        rahitaluBalance: upstreamDash?.wallet?.balance || 0,
        todayProfit: 0 
      },
      systemStatus: await getSystemStatus(),
      activeProvider,
      users: usersRes.data || [],
      allOrders,
      allDeposits
    };
  } catch (error) {
    console.error('getAdminDashboardData Error:', error);
    return {
      stats: { totalUsers: 0, todayDeposits: 0, todayOrders: 0, rahitaluBalance: 0, todayProfit: 0 },
      systemStatus: { enabled: true, message: '' },
      activeProvider: 'skplug',
      users: [],
      allOrders: [],
      allDeposits: []
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
