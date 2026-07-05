'use server';

import { createClient } from '@supabase/supabase-js';
import { byteMeDealsClient } from '@/lib/bytemedeals/client';
import { revalidatePath } from 'next/cache';
import { UserRole } from '@/lib/types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(url, key);

export async function checkIsAdmin(userId: string) {
  if (!url || !key) return false;
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('user_id', userId)
      .maybeSingle();
    return profile?.is_admin === true;
  } catch (err) { return false; }
}

export async function getSystemStatus() {
  if (!url || !key) return { enabled: true, message: '' };
  try {
    const { data } = await supabaseAdmin
      .from('system_configs')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle();
    return data?.value || { enabled: true, message: '' };
  } catch (error) { return { enabled: true, message: '' }; }
}

export async function getActiveProvider(): Promise<'skplug' | 'dakazina' | 'bytemedeals' | 'diceconsult'> {
  if (!url || !key) return 'skplug';
  try {
    const { data } = await supabaseAdmin
      .from('system_configs')
      .select('value')
      .eq('key', 'active_provider')
      .maybeSingle();
    return data?.value?.provider || 'skplug';
  } catch { return 'skplug'; }
}

export async function updateActiveProvider(provider: 'skplug' | 'dakazina' | 'bytemedeals' | 'diceconsult') {
  if (!url || !key) return { success: false, message: 'DB not configured' };
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
  } catch (error: any) { return { success: false, message: error.message }; }
}

export async function getAdminDashboardData() {
  if (!url || !key) return null;
  try {
    const today = new Date().toISOString().split('T')[0];
    const { count: totalUsers } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true });
    
    // Stats: Deposits Today
    const { data: depositsToday } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'credit')
      .eq('status', 'success')
      .gte('created_at', today);

    const todayDepositsAmount = (depositsToday || []).reduce((sum, tx) => sum + parseFloat(tx.amount?.toString() || '0'), 0);
    const activeProvider = await getActiveProvider();
    
    let upstreamBalance = 0;
    try {
      if (activeProvider === 'bytemedeals') {
        const res = await byteMeDealsClient.getBalance();
        upstreamBalance = res.balance || 0;
      } else if (activeProvider === 'diceconsult') {
        // DiceConsult returns balance in success response of purchases, but no direct balance endpoint usually.
      }
    } catch (err) { console.warn('Provider balance fetch failed', err); }

    // Stats: Orders Today
    const { count: totalTodayOrders } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // Main Tables
    const [ordersRes, walletTxRes, usersRes] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select(`
          *,
          profiles:customer_id(reference_code, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(500),
      supabaseAdmin
        .from('wallet_transactions')
        .select('*, profiles(full_name, reference_code, phone)')
        .order('created_at', { ascending: false })
        .limit(500),
      supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)
    ]);

    const allOrders = (ordersRes.data || []).map(o => ({
      id: o.id,
      phone: o.phone_number,
      plan: `${o.package_id}GB`,
      status: o.status,
      timestamp: o.created_at,
      user_ref: (o.profiles as any)?.reference_code || 'N/A',
      user_name: (o.profiles as any)?.full_name || 'N/A',
      amount: Number(o.amount || 0)
    }));

    const allDeposits = (walletTxRes.data || [])
      .filter(tx => tx.type === 'credit' && tx.status === 'success')
      .map(tx => ({
        id: tx.id,
        phone: tx.profiles?.phone || 'N/A',
        name: tx.profiles?.full_name || 'N/A',
        user_ref: tx.profiles?.reference_code || 'N/A',
        amount: Number(tx.amount || 0),
        reference: tx.reference,
        timestamp: tx.created_at,
        description: tx.description
      }));

    return {
      stats: { 
        totalUsers: totalUsers || 0, 
        todayDeposits: Number(todayDepositsAmount), 
        todayOrders: totalTodayOrders || 0, 
        rahitaluBalance: Number(upstreamBalance), 
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
    return null;
  }
}

export async function assignUserRole(userId: string, role: UserRole) {
  if (!url || !key) return;
  const { error } = await supabaseAdmin.from('profiles').update({ role }).eq('user_id', userId);
  if (error) throw error;
  revalidatePath('/falaadealsadminurl$$');
  return { success: true };
}

export async function updateSystemStatus(enabled: boolean, message: string) {
  if (!url || !key) return { success: false, message: 'DB not configured' };
  try {
    await supabaseAdmin.from('system_configs').upsert({ key: 'maintenance_mode', value: { enabled, message }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    return { success: true };
  } catch (error: any) { return { success: false, message: error.message }; }
}

export async function adjustUserBalance(profileId: string, amount: number, type: 'credit' | 'debit', reason: string) {
  if (!url || !key) return { success: false, message: 'DB not configured' };
  try {
    const { data: profile } = await supabaseAdmin.from('profiles').select('id, user_id, wallet_balance').eq('id', profileId).single();
    if (!profile) throw new Error('User profile not found');

    const currentBalance = parseFloat(profile.wallet_balance.toString());
    const newBalance = type === 'credit' ? currentBalance + amount : currentBalance - amount;
    if (newBalance < 0 && type === 'debit') throw new Error('Insufficient funds');

    await supabaseAdmin.from('profiles').update({ wallet_balance: newBalance }).eq('id', profileId);
    await supabaseAdmin.from('wallet_transactions').insert({ 
      user_id: profile.user_id, 
      amount, 
      type, 
      status: 'success', 
      reference: `ADM-${Math.random().toString(36).substring(7).toUpperCase()}`, 
      description: `Admin ${type === 'credit' ? 'Credit' : 'Debit'}: ${reason}` 
    });

    revalidatePath('/dashboard');
    return { success: true, newBalance };
  } catch (error: any) { return { success: false, message: error.message }; }
}