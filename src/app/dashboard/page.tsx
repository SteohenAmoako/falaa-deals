
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PlanCard from '@/components/dashboard/PlanCard';
import ForecastTool from '@/components/dashboard/ForecastTool';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLANS, type Profile, type RahitaluOrder, type WalletTransaction } from '@/lib/types';
import {
  LayoutDashboard, History, ShoppingBag, LogOut, Code2,
  BarChart3, User, Loader2, ArrowUpRight, ArrowDownLeft, Menu, X, CheckCircle2, CreditCard, TrendingUp, AlertTriangle, ExternalLink, Copy, Wallet, Info, Plus, Search, ChevronLeft, ChevronRight, Zap
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { syncUserOrders } from '@/app/actions/orders';
import { getSystemStatus } from '@/app/actions/admin';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DashboardTab = 'dashboard' | 'orders' | 'transactions' | 'usage';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders',    label: 'My Orders',    icon: ShoppingBag },
  { id: 'transactions', label: 'Transactions', icon: History },
  { id: 'usage',    label: 'Usage Stats',  icon: BarChart3 },
] as const;

const PAGE_SIZE = 10;

export default function DashboardPage() {
  const [profile, setProfile]           = useState<Profile | null>(null);
  const [orders, setOrders]             = useState<any[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [systemStatus, setSystemStatus] = useState<{ enabled: boolean, message: string }>({ enabled: true, message: '' });
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<DashboardTab>('dashboard');
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  
  // Filtering and Pagination States
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersPage, setOrdersPage] = useState(1);
  const [txSearch, setTxSearch] = useState('');
  const [txPage, setTxPage] = useState(1);

  const { toast }  = useToast();
  const router     = useRouter();
  
  const isReconciling = useRef(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/');
        return;
      }

      const [profileRes, statusValue] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle(),
        getSystemStatus()
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
      }

      if (statusValue) {
        setSystemStatus(statusValue);
      }

      const [ordersRes, skOrdersRes, txRes] = await Promise.all([
        supabase.from('rahitalu_orders').select('*').eq('user_id', session.user.id),
        supabase.from('skplug_orders').select('*').eq('user_id', session.user.id),
        supabase.from('wallet_transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
      ]);

      const combinedOrders = [
        ...(ordersRes.data || []),
        ...(skOrdersRes.data || [])
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setOrders(combinedOrders);
      setTransactions(txRes.data || []);

      if (!isReconciling.current) {
        const pendingCredits = (txRes.data || []).filter(t => t.type === 'credit' && t.status === 'pending');
        if (pendingCredits.length > 0) {
          isReconciling.current = true;
          for (const tx of pendingCredits) {
            await fetch('/api/paystack/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference: tx.reference }),
            }).catch(() => {});
          }
          isReconciling.current = false;
        }
      }

      syncUserOrders(session.user.id).catch(() => {});

    } catch (error: any) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Real-time synchronization
  useEffect(() => {
    if (!profile?.user_id) return;

    const profileSubscription = supabase
      .channel('profile-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${profile.user_id}` },
        (payload) => {
          setProfile(payload.new as Profile);
          toast({ 
            variant: "success", 
            title: "🎉 Balance Updated", 
            description: `Your new balance is GHS ${Number((payload.new as Profile).wallet_balance).toFixed(2)}` 
          });
          loadDashboardData();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(profileSubscription); };
  }, [profile?.user_id, loadDashboardData, toast]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      (o.gig || o.gb_size || '').toLowerCase().includes(ordersSearch.toLowerCase()) || 
      o.phone?.includes(ordersSearch) || o.recipient?.includes(ordersSearch)
    );
  }, [orders, ordersSearch]);

  const paginatedOrders = useMemo(() => {
    const start = (ordersPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, ordersPage]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.description.toLowerCase().includes(txSearch.toLowerCase()) ||
      t.amount.toString().includes(txSearch)
    );
  }, [transactions, txSearch]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const copyRef = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Reference code copied to clipboard." });
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-violet-600 animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

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
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center font-black text-sm tracking-tight italic text-white">SB</div>
            <span className="text-lg font-black tracking-tight">Falaa Deals</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-zinc-500 hover:text-white"><X size={18} /></button>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id as DashboardTab); setSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                activeTab === id ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
          <button
            onClick={() => router.push('/dashboard/api-docs')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <Code2 size={17} />
            API Docs
          </button>
        </nav>

        <div className="pt-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-violet-600/20 border border-violet-600/30 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{profile.full_name}</p>
              <p className="text-xs text-zinc-500 truncate flex items-center gap-1.5">
                {profile.phone} 
                <span className="text-[10px] text-zinc-600 font-bold px-1.5 py-0.5 bg-white/5 rounded border border-white/5">{profile.reference_code}</span>
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-[#0a0a0f]/80 backdrop-blur border-b border-white/5 px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center font-black text-xs italic text-white">SB</div>
            <span className="font-black tracking-tight">Falaa Deals</span>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 gap-1.5 bg-violet-600/10 border-violet-600/20 text-violet-400 hover:bg-violet-600 hover:text-white text-xs font-bold px-3 rounded-xl">
                  <Plus className="w-3.5 h-3.5" />
                  Top Up
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111118] border-white/5 text-white max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    <Info className="w-5 h-5 text-violet-400" />
                    Manual Deposit
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Step 1: Send MoMo To</p>
                      <p className="text-2xl font-black text-white">0595919802</p>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-white/5">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Step 2: Use Reference</p>
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-black text-violet-400 font-mono">{profile.reference_code}</p>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyRef(profile.reference_code)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 text-center italic">Wallet will be credited automatically once payment is received.</p>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
              <Wallet className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs sm:text-sm font-black text-white">GHS {Number(profile.wallet_balance).toFixed(2)}</span>
            </div>

            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-zinc-400 hover:text-white p-1 ml-1"><Menu size={22} /></button>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-6 lg:p-10 max-w-5xl w-full mx-auto space-y-6 sm:space-y-8">
          {!systemStatus.enabled && (
            <Alert className="bg-red-500/10 border-red-500/20 text-red-400 animate-in fade-in slide-in-from-top-4 duration-500">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="font-black uppercase tracking-widest text-[10px]">System Restricted</AlertTitle>
              <AlertDescription className="text-xs font-medium">{systemStatus.message || "We are currently undergoing maintenance."}</AlertDescription>
            </Alert>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-12 animate-in fade-in duration-300">
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h2 className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-zinc-400">Main Bundles</h2>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-6">
                  {PLANS.map(plan => (
                    <PlanCard key={plan.id} plan={plan} userId={profile.user_id} walletBalance={profile.wallet_balance} disabled={!systemStatus.enabled} />
                  ))}
                </div>
              </section>

              <section className="space-y-4 border-t border-white/5 pt-10">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-violet-400" />
                  <h2 className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-zinc-400">SK Plug (Reseller Rates)</h2>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-6">
                  <PlanCard 
                    plan={{ id: 'sk_5gb', name: 'SK Plug', size: '5GB', price: 15, description: 'Direct Reseller Data' }} 
                    userId={profile.user_id} 
                    walletBalance={profile.wallet_balance} 
                    disabled={!systemStatus.enabled}
                    isSKPlug
                  />
                  <PlanCard 
                    plan={{ id: 'sk_10gb', name: 'SK Plug', size: '10GB', price: 29, description: 'Direct Reseller Data' }} 
                    userId={profile.user_id} 
                    walletBalance={profile.wallet_balance} 
                    disabled={!systemStatus.enabled}
                    isSKPlug
                  />
                </div>
              </section>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="animate-in fade-in duration-300 space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input placeholder="Search orders..." className="pl-10 bg-[#111118] border-white/5" value={ordersSearch} onChange={e => setOrdersSearch(e.target.value)} />
              </div>
              <div className="rounded-2xl border border-white/5 bg-[#111118] overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="border-white/5"><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4">Date</TableHead><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4">Bundle</TableHead><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4">Phone</TableHead><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4 text-right">Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {paginatedOrders.map(order => (
                      <TableRow key={order.id} className="border-white/5 hover:bg-white/3">
                        <TableCell className="text-sm text-zinc-400">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-bold">{order.gig || order.gb_size} {order.gb_size ? 'GB' : ''}</TableCell>
                        <TableCell className="font-mono text-xs">{order.phone || order.recipient}</TableCell>
                        <TableCell className="text-right"><StatusBadge status={order.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="animate-in fade-in duration-300 space-y-4">
              <div className="rounded-2xl border border-white/5 bg-[#111118] overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="border-white/5"><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4">Date</TableHead><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4">Description</TableHead><TableHead className="text-[11px] uppercase font-bold text-zinc-500 py-4 text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {transactions.map(tx => (
                      <TableRow key={tx.id} className="border-white/5 hover:bg-white/3">
                        <TableCell className="text-sm text-zinc-400">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm">{tx.description}</TableCell>
                        <TableCell className={cn("font-bold text-right", tx.type === 'credit' ? 'text-emerald-400' : 'text-white')}>
                          {tx.type === 'credit' ? '+' : '-'} GHS {Number(tx.amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {activeTab === 'usage' && <ForecastTool currentBalance={profile.wallet_balance} orders={orders} />}
        </main>
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
