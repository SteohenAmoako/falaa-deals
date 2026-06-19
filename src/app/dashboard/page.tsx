
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import PlanCard from '@/components/dashboard/PlanCard';
import ForecastTool from '@/components/dashboard/ForecastTool';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { type Profile, type WalletTransaction, type Bundle } from '@/lib/types';
import {
  LayoutDashboard, History, ShoppingBag, LogOut, Code2,
  BarChart3, User, Loader2, Menu, X, CreditCard, Wallet, Info, Plus, Search, Zap, AlertTriangle
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getBundlesForRole } from '@/app/actions/bundles';
import { getSystemStatus } from '@/app/actions/admin';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type DashboardTab = 'dashboard' | 'orders' | 'transactions' | 'usage';

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [systemStatus, setSystemStatus] = useState({ enabled: true, message: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ordersSearch, setOrdersSearch] = useState('');
  
  const { toast } = useToast();
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/');

      const [profileRes, statusValue] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', session.user.id).single(),
        getSystemStatus()
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        const fetchedBundles = await getBundlesForRole(profileRes.data.role);
        setBundles(fetchedBundles);
      }
      if (statusValue) setSystemStatus(statusValue);

      const [rahitaluRes, skRes, txRes] = await Promise.all([
        supabase.from('rahitalu_orders').select('*').eq('user_id', session.user.id),
        supabase.from('skplug_orders').select('*').eq('user_id', session.user.id),
        supabase.from('wallet_transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
      ]);

      const combined = [...(rahitaluRes.data || []), ...(skRes.data || [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setOrders(combined);
      setTransactions(txRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  const bundlesByNetwork = useMemo(() => {
    const groups: Record<string, Bundle[]> = {};
    bundles.forEach(b => {
      if (!groups[b.network]) groups[b.network] = [];
      groups[b.network].push(b);
    });
    return groups;
  }, [bundles]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-violet-600 animate-spin" />
    </div>
  );

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      <aside className={cn(
        "fixed top-0 left-0 h-full w-72 bg-[#111118] border-r border-white/5 z-40 flex flex-col p-6 transition-transform duration-300",
        "lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center font-black italic text-white">FD</div>
          <span className="text-lg font-black tracking-tight">Falaa Deals</span>
        </div>

        <nav className="flex-1 space-y-1">
          <button onClick={() => setActiveTab('dashboard')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold", activeTab === 'dashboard' ? "bg-violet-600" : "text-zinc-400")}>
            <LayoutDashboard size={17} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('orders')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold", activeTab === 'orders' ? "bg-violet-600" : "text-zinc-400")}>
            <ShoppingBag size={17} /> Orders
          </button>
          <button onClick={() => setActiveTab('transactions')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold", activeTab === 'transactions' ? "bg-violet-600" : "text-zinc-400")}>
            <History size={17} /> History
          </button>
          <button onClick={() => setActiveTab('usage')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold", activeTab === 'usage' ? "bg-violet-600" : "text-zinc-400")}>
            <BarChart3 size={17} /> Insights
          </button>
          <button onClick={() => router.push('/dashboard/api-docs')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-400">
            <Code2 size={17} /> API Docs
          </button>
        </nav>

        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 mb-4">
            <User className="w-8 h-8 p-1.5 bg-violet-600/20 rounded-full text-violet-400" />
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{profile.full_name}</p>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{profile.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-400 hover:text-red-400">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-[#0a0a0f]/80 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden"><Menu /></button>
          <div className="flex items-center gap-4 ml-auto">
            <Dialog>
              <DialogTrigger asChild><Button size="sm" className="bg-violet-600"><Plus size={16} className="mr-1" /> Top Up</Button></DialogTrigger>
              <DialogContent className="bg-[#111118] border-white/5 text-white">
                <DialogHeader><DialogTitle>Manual Deposit</DialogTitle></DialogHeader>
                <div className="p-4 bg-black/40 rounded-xl space-y-4">
                  <div><p className="text-xs text-zinc-500 font-bold uppercase">Send MoMo To</p><p className="text-2xl font-black">0595919802</p></div>
                  <div><p className="text-xs text-zinc-500 font-bold uppercase">Use Reference</p><p className="text-2xl font-black text-violet-400 font-mono">{profile.reference_code}</p></div>
                </div>
              </DialogContent>
            </Dialog>
            <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-2">
              <Wallet size={16} className="text-violet-400" />
              <span className="font-black">GHS {profile.wallet_balance.toFixed(2)}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 max-w-5xl w-full mx-auto space-y-8">
          {!systemStatus.enabled && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex gap-3">
              <AlertTriangle className="shrink-0" />
              <div><p className="text-xs font-black uppercase">System Restricted</p><p className="text-sm">{systemStatus.message}</p></div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <Accordion type="multiple" defaultValue={Object.keys(bundlesByNetwork)} className="space-y-4">
                {Object.entries(bundlesByNetwork).map(([network, networkBundles]) => (
                  <AccordionItem key={network} value={network} className="border-none bg-[#111118] rounded-2xl overflow-hidden">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/5">
                      <div className="flex items-center gap-3">
                        <Zap className="text-violet-400" />
                        <span className="font-black uppercase tracking-tight">{network} Data Bundles</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {networkBundles.map(bundle => (
                          <PlanCard 
                            key={bundle.id} 
                            bundle={bundle} 
                            userId={profile.user_id} 
                            walletBalance={profile.wallet_balance} 
                            disabled={!systemStatus.enabled} 
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <Input placeholder="Search phone or bundle..." value={ordersSearch} onChange={e => setOrdersSearch(e.target.value)} className="bg-[#111118] border-white/5" />
              <div className="rounded-2xl border border-white/5 bg-[#111118] overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="border-white/5"><TableHead>Date</TableHead><TableHead>Bundle</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {orders.filter(o => (o.gig || o.gb_size || '').includes(ordersSearch) || (o.phone || o.recipient || '').includes(ordersSearch)).map(order => (
                      <TableRow key={order.id} className="border-white/5">
                        <TableCell className="text-zinc-500">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-bold">{order.gig || `${order.gb_size}GB`}</TableCell>
                        <TableCell className="font-mono">{order.phone || order.recipient}</TableCell>
                        <TableCell className="text-right"><StatusBadge status={order.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="rounded-2xl border border-white/5 bg-[#111118] overflow-hidden">
              <Table>
                <TableHeader><TableRow className="border-white/5"><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {transactions.map(tx => (
                    <TableRow key={tx.id} className="border-white/5">
                      <TableCell className="text-zinc-500">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell className={cn("font-bold text-right", tx.type === 'credit' ? 'text-emerald-400' : 'text-white')}>
                        {tx.type === 'credit' ? '+' : '-'} GHS {tx.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {activeTab === 'usage' && <ForecastTool currentBalance={profile.wallet_balance} orders={orders} />}
        </main>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase border", styles[status?.toLowerCase()] || 'bg-zinc-500/10')}>{status}</span>;
}
