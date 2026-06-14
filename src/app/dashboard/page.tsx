
'use client';

import { useState, useEffect } from 'react';
import WalletCard from '@/components/dashboard/WalletCard';
import PlanCard from '@/components/dashboard/PlanCard';
import ForecastTool from '@/components/dashboard/ForecastTool';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PLANS, type Profile, type RahitaluOrder, type WalletTransaction } from '@/lib/types';
import {
  LayoutDashboard, History, ShoppingBag, LogOut,
  BarChart3, User, Loader2, ArrowUpRight, ArrowDownLeft, Menu, X, CheckCircle2, CreditCard, TrendingUp, AlertTriangle
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { syncUserOrders } from '@/app/actions/orders';
import { getSystemStatus } from '@/app/actions/admin';

type DashboardTab = 'dashboard' | 'orders' | 'transactions' | 'usage';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders',    label: 'My Orders',    icon: ShoppingBag },
  { id: 'transactions', label: 'Transactions', icon: History },
  { id: 'usage',    label: 'Usage Stats',  icon: BarChart3 },
] as const;

export default function DashboardPage() {
  const [profile, setProfile]           = useState<Profile | null>(null);
  const [orders, setOrders]             = useState<RahitaluOrder[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [systemStatus, setSystemStatus] = useState<{ enabled: boolean, message: string }>({ enabled: true, message: '' });
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<DashboardTab>('dashboard');
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const { toast }  = useToast();
  const router     = useRouter();

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push('/');
          return;
        }

        // Fetch profile and system status
        const [profileRes, statusValue] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle(),
          getSystemStatus()
        ]);

        if (profileRes.data) {
          setProfile(profileRes.data);
        }

        // Ensure we only update if we actually got a valid response
        if (statusValue) {
          setSystemStatus(statusValue);
        }

        const [ordersRes, txRes] = await Promise.all([
          supabase
            .from('rahitalu_orders')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
        ]);

        setOrders(ordersRes.data || []);
        setTransactions(txRes.data || []);

        const hasActiveOrders = (ordersRes.data || []).some(o => 
          ['pending', 'processing'].includes(o.status?.toLowerCase())
        );
        if (hasActiveOrders) {
          syncUserOrders(session.user.id).catch(() => {});
        }

      } catch (error: any) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Establishing Session...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const firstName = profile.full_name.split(' ')[0];
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(o => ['delivered', 'success', 'delivered'].includes((o.upstream_status || o.status)?.toLowerCase())).length;
  const totalDeposits = transactions.filter(t => t.type === 'credit' && t.status === 'success').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalSalesVolume = orders.filter(o => !['failed'].includes(o.status?.toLowerCase())).reduce((sum, o) => sum + Number(o.sell_price_ghs), 0);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={cn(
        "fixed top-0 left-0 h-full w-72 bg-[#111118] border-r border-white/5 z-40 flex flex-col p-6 transition-transform duration-300",
        "lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center font-black text-sm tracking-tight italic">SB</div>
            <span className="text-lg font-black tracking-tight">SB Bundles</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-zinc-500 hover:text-white"><X size={18} /></button>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id as DashboardTab)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                activeTab === id ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-violet-600/20 border border-violet-600/30 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{profile.full_name}</p>
              <p className="text-xs text-zinc-500 truncate">{profile.phone}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-[#0a0a0f]/80 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center font-black text-xs italic">SB</div>
            <span className="font-black tracking-tight">SB Bundles</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="text-zinc-400 hover:text-white p-1"><Menu size={22} /></button>
        </header>

        <main className="flex-1 p-3 sm:p-6 lg:p-10 max-w-5xl w-full mx-auto space-y-6 sm:space-y-8">
          {!systemStatus.enabled && (
            <Alert className="bg-red-500/10 border-red-500/20 text-red-400 animate-in fade-in slide-in-from-top-4 duration-500">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertTitle className="font-black uppercase tracking-widest text-[10px]">System Restricted</AlertTitle>
              <AlertDescription className="text-xs font-medium">
                {systemStatus.message || "We are currently undergoing maintenance. Deposits and purchases are temporarily disabled."}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-0.5 pt-2 lg:pt-0">
            <h1 className="text-xl sm:text-3xl font-black tracking-tight">
              {activeTab === 'dashboard'    && `Hey, ${firstName} 👋`}
              {activeTab === 'orders'       && 'My Orders'}
              {activeTab === 'transactions' && 'Transactions'}
              {activeTab === 'usage'        && 'Usage Insights'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500">
              {activeTab === 'dashboard'    && 'Activate a new bundle instantly.'}
              {activeTab === 'orders'       && 'Track your connectivity history.'}
              {activeTab === 'transactions' && 'Wallet activity and funding logs.'}
              {activeTab === 'usage'        && 'Your data consumption analysis.'}
            </p>
          </div>

          {activeTab === 'dashboard' && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
              <WalletCard balance={profile.wallet_balance} referenceCode={profile.reference_code} disabled={!systemStatus.enabled} />
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-3.5 h-3.5 text-violet-400" />
                  <h2 className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-zinc-400">Available Bundles</h2>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-6">
                  {PLANS.map(plan => (
                    <PlanCard key={plan.id} plan={plan} userId={profile.user_id} walletBalance={profile.wallet_balance} disabled={!systemStatus.enabled} />
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="animate-in fade-in duration-300 rounded-2xl border border-white/5 bg-[#111118] overflow-hidden">
              {orders.length === 0 ? (
                <EmptyState icon={ShoppingBag} message="No orders yet. Buy your first bundle above." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="border-white/5"><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4">Date</TableHead><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4">Bundle</TableHead><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4">Phone</TableHead><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4">Status</TableHead><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4 text-right">Price</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {orders.map(order => (
                        <TableRow key={order.id} className="border-white/5 hover:bg-white/3">
                          <TableCell className="text-sm text-zinc-400 py-4">{new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</TableCell>
                          <TableCell className="font-bold text-white">{order.gig}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-400">{order.phone}</TableCell>
                          <TableCell><StatusBadge status={order.upstream_status || order.status} /></TableCell>
                          <TableCell className="font-bold text-white text-right">GHS {Number(order.sell_price_ghs).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="animate-in fade-in duration-300 rounded-2xl border border-white/5 bg-[#111118] overflow-hidden">
              {transactions.length === 0 ? (
                <EmptyState icon={History} message="No transactions yet. Top up your wallet to get started." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="border-white/5"><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4">Date</TableHead><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4">Type</TableHead><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4">Description</TableHead><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4 text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {transactions.map(tx => (
                        <TableRow key={tx.id} className="border-white/5 hover:bg-white/3">
                          <TableCell className="text-sm text-zinc-400 py-4">{new Date(tx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</TableCell>
                          <TableCell><div className="flex items-center gap-1.5">{tx.type === 'credit' ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />}<span className={cn("text-xs font-bold uppercase", tx.type === 'credit' ? 'text-emerald-400' : 'text-red-400')}>{tx.type}</span></div></TableCell>
                          <TableCell className="text-sm text-zinc-400 max-w-[160px] truncate">{tx.description}</TableCell>
                          <TableCell className={cn("font-black text-right", tx.type === 'credit' ? 'text-emerald-400' : 'text-white')}>{tx.type === 'credit' ? '+' : '-'} GHS {Number(tx.amount).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="animate-in fade-in duration-300 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-[#111118] border-white/5 shadow-xl"><CardContent className="p-4 pt-6 text-center space-y-1"><div className="w-8 h-8 rounded-full bg-violet-600/10 flex items-center justify-center mx-auto mb-2"><ShoppingBag className="w-4 h-4 text-violet-400" /></div><div className="text-xl font-black">{totalOrders}</div><div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total Orders</div></CardContent></Card>
                <Card className="bg-[#111118] border-white/5 shadow-xl"><CardContent className="p-4 pt-6 text-center space-y-1"><div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div><div className="text-xl font-black">{deliveredOrders}</div><div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Delivered</div></CardContent></Card>
                <Card className="bg-[#111118] border-white/5 shadow-xl"><CardContent className="p-4 pt-6 text-center space-y-1"><div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2"><CreditCard className="w-4 h-4 text-blue-400" /></div><div className="text-xl font-black">GHS {totalDeposits.toFixed(2)}</div><div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Deposits</div></CardContent></Card>
                <Card className="bg-violet-600 border-none shadow-xl shadow-violet-600/20"><CardContent className="p-4 pt-6 text-center space-y-1"><div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2"><TrendingUp className="w-4 h-4 text-white" /></div><div className="text-xl font-black text-white">GHS {totalSalesVolume.toFixed(2)}</div><div className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Sales Vol</div></CardContent></Card>
              </div>
              <div className="max-w-2xl"><ForecastTool currentBalance={profile.wallet_balance} orders={orders} /></div>
            </div>
          )}
        </main>

        <nav className="lg:hidden sticky bottom-0 bg-[#111118]/95 backdrop-blur border-t border-white/5 flex">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => handleTabChange(id as DashboardTab)} className={cn("flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors", activeTab === id ? "text-violet-400" : "text-zinc-600")}><Icon size={18} /><span className="hidden xs:block">{label.split(' ')[0]}</span></button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    delivered:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    success:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-violet-500/10  text-violet-400  border-violet-500/20',
    pending:    'bg-amber-500/10   text-amber-400   border-amber-500/20',
    failed:     'bg-red-500/10     text-red-400     border-red-500/20',
  };
  return <span className={cn("inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-bold uppercase border", map[status?.toLowerCase()] ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20')}>{status || 'pending'}</span>;
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6"><div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center"><Icon className="w-5 h-5 text-zinc-600" /></div><p className="text-sm text-zinc-500 max-w-xs">{message}</p></div>;
}
