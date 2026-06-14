'use server';

import { createClient } from '@supabase/supabase-js';
import { getUpstreamDashboard, getUpstreamOrderHistory } from '@/lib/rahitalu';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    return {
      stats: {
        totalUsers: totalUsers || 0,
        todayDeposits,
        todayOrders: todayOrders || 0,
        rahitaluBalance: upstreamDash?.wallet?.balance || 0
      },
      users: users || [],
      liveStream: (upstreamOrders || []).map((order: any) => ({
        id: order._id || order.id || Math.random().toString(),
        reference: order.reference || 'N/A',
        phone: order.customerPhone || order.phone || 'Unknown',
        plan: order.gig ? (order.gig.toString().includes('GB') ? order.gig : `${order.gig}GB`) : 'Data Bundle',
        status: order.upstreamStatus || order.status || 'processing',
        timestamp: order.upstreamUpdatedAt || order.createdAt || order.created_at || new Date().toISOString()
      }))
    };
  } catch (error: any) {
    // Log generic error internally, don't expose sensitive details to caller
    console.error('Admin Data Fetch Failed');
    throw new Error('Could not retrieve administrative data');
  }
}
