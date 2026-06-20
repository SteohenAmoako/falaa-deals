'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import PlanCard from '@/components/dashboard/PlanCard';
import ForecastTool from '@/components/dashboard/ForecastTool';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Profile, type WalletTransaction, type Bundle } from '@/lib/types';
import {
  LayoutDashboard, History, ShoppingBag, LogOut, Code2,
  BarChart3, User, Loader2, Menu, X, CreditCard, Wallet, Plus, Search, Zap, AlertTriangle, Smartphone
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getBundlesForRole } from '@/app/actions/bundles';
import { getSystemStatus } from '@/app/actions/admin';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

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
        const userRole = profileRes.data.role || 'base';
        const fetchedBundles = await getBundlesForRole(userRole);
        setBundles(fetchedBundles || []);
      }
      
      if (statusValue) {
        setSystemStatus(statusValue);
      }

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
      console.error('Dashboard Load Error:', e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  const groupedBundles = useMemo(() => {
    const groups: Record<string, Bundle[]> = {
      'MTN': [],
      'AirtelTigo': [],
      'Telecel': []
    };
    
    if (!bundles || !Array.isArray(bundles)) return groups;

    bundles.forEach(b => {
      const net = (b.network || '').toUpperCase();
      if (net === 'MTN') {
        groups['MTN'].push(b);
      } else if (net === 'TELECEL') {
        groups['Telecel'].push(b);
      } else if (net.startsWith('AT_')) {
        groups['AirtelTigo'].push(b);
      }
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.gb_size - b.gb_size);
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
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center font-black italic text-white shadow-lg shadow-violet-600/20">FD</div>
          <span className="text-lg font-black tracking-tight">Falaa Deals</span>
        </div>

        <nav className="flex-1 space-y-1">
          <button onClick={() => setActiveTab('dashboard')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all", activeTab === 'dashboard' ? "bg-violet-600 shadow-lg shadow-violet-600/20" : "text-zinc-400 hover:bg-white/5")}>
            <LayoutDashboard size={17} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('orders')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all", activeTab === 'orders' ? "bg-violet-600 shadow-lg shadow-violet-600/20" : "text-zinc-400 hover:bg-white/5")}>
            <ShoppingBag size={17} /> Orders
          </button>
          <button onClick={() => setActiveTab('transactions')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all", activeTab === 'transactions' ? "bg-violet-600 shadow-lg shadow-violet-600/20" : "text-zinc-400 hover:bg-white/5")}>
            <History size={17} /> History
          </button>
          <button onClick={() => setActiveTab('usage')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all", activeTab === 'usage' ? "bg-violet-600 shadow-lg shadow-violet-600/20" : "text-zinc-400 hover:bg-white/5")}>
            <BarChart3 size={17} /> Insights
          </button>
          <button onClick={() => router.push('/dashboard/api-docs')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-400 hover:bg-white/5">
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
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-400 hover:text-red-400 transition-colors">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-[#0a0a0f]/80 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-zinc-400"><Menu /></button>
          <div className="flex items-center gap-4 ml-auto">
            <Dialog>
              <DialogTrigger asChild><Button size="sm" className="bg-violet-600 hover:bg-violet-700 font-bold"><Plus size={16} className="mr-1" /> Top Up</Button></DialogTrigger>
              <DialogContent className="bg-[#111118] border-white/5 text-white">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black italic">MANUAL DEPOSIT</DialogTitle>
                  <DialogDescription className="text-zinc-500 text-xs">Follow these steps to fund your wallet manually.</DialogDescription>
                </DialogHeader>
                <div className="p-6 bg-black/40 rounded-2xl space-y-6 border border-white/5">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Send MoMo To</p>
                    <p className="text-3xl font-black text-white">0595919802</p>
                    <p className="text-[10px] text-violet-400 font-bold mt-1">Merchant: Falaa Deals</p>
                  </div>
                  <div className="pt-6 border-t border-white/5">
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Use Reference</p>
                    <p className="text-3xl font-black text-[#FFD700] font-mono tracking-tighter">{profile.reference_code}</p>
                    <p className="text-[10px] text-zinc-400 mt-2 font-medium">Wallet is credited automatically within seconds of payment.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
              <Wallet size={16} className="text-violet-400" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest leading-none mb-0.5">Wallet</span>
                <span className="font-black text-sm">GHS {profile.wallet_balance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 max-w-6xl w-full mx-auto space-y-8">
          {!systemStatus.enabled && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex gap-3 animate-pulse">
              <AlertTriangle className="shrink-0" />
              <div><p className="text-xs font-black uppercase tracking-widest">Maintenance Mode</p><p className="text-sm font-medium">{systemStatus.message}</p></div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  <Zap className="text-[#FFD700]" />
                  Buy Data Bundles
                </h2>
                <p className="text-zinc-500 text-sm">Select your network to view available packages.</p>
              </div>

              <Tabs defaultValue="MTN" className="space-y-8">
                <TabsList className="bg-[#111118] border border-white/5 p-1.5 h-auto grid grid-cols-3 gap-2 max-w-md">
                  <TabsTrigger 
                    value="MTN" 
                    className="py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all"
                  >
                    MTN
                  </TabsTrigger>
                  <TabsTrigger 
                    value="AirtelTigo" 
                    className="py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all"
                  >
                    AirtelTigo
                  </TabsTrigger>
                  <TabsTrigger 
                    value="Telecel" 
                    className="py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all"
                  >
                    Telecel
                  </TabsTrigger>
                </TabsList>

                {Object.entries(groupedBundles).map(([network, networkBundles]) => (
                  <TabsContent key={network} value={network} className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {networkBundles && networkBundles.length > 0 ? (
                        networkBundles.map(bundle => (
                          <PlanCard 
                            key={bundle.id} 
                            bundle={bundle} 
                            userId={profile.user_id} 
                            walletBalance={profile.wallet_balance} 
                            disabled={!systemStatus.enabled} 
                          />
                        ))
                      ) : (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-20 space-y-4">
                          <Smartphone size={48} />
                          <p className="font-bold">No bundles available for {network}</p>
                          {profile.is_admin && (
                            <Button variant="outline" size="sm" onClick={() => router.push('/falaadealsadminurl$$/pricing')}>
                              Go to Admin Pricing to Sync Bundles
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-black tracking-tight">Order History</h2>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input 
                    placeholder="Search phone or bundle size..." 
                    value={ordersSearch} 
                    onChange={e => setOrdersSearch(e.target.value)} 
                    className="bg-[#111118] border-white/5 pl-10 h-10" 
                  />
                </div>
              </div>
              
              <div className="rounded-2xl border border-white/5 bg-[#111118] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 bg-white/5 hover:bg-white/5">
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Bundle</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Phone</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders
                      .filter(o => 
                        (o.gig || o.gb_size || '').toLowerCase().includes(ordersSearch.toLowerCase()) || 
                        (o.phone || o.recipient || '').includes(ordersSearch)
                      )
                      .map(order => (
                      <TableRow key={order.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="text-zinc-400 text-xs font-medium">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-black text-sm">{order.gig || `${order.gb_size}GB`}</TableCell>
                        <TableCell className="font-mono text-zinc-300 font-bold">{order.phone || order.recipient}</TableCell>
                        <TableCell className="text-right"><StatusBadge status={order.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black tracking-tight">Wallet Transactions</h2>
              <div className="rounded-2xl border border-white/5 bg-[#111118] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 bg-white/5 hover:bg-white/5">
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Description</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(tx => (
                      <TableRow key={tx.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="text-zinc-400 text-xs font-medium">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm font-medium">{tx.description}</TableCell>
                        <TableCell className={cn("font-black text-right text-sm", tx.type === 'credit' ? 'text-emerald-400' : 'text-white')}>
                          {tx.type === 'credit' ? '+' : '-'} GHS {tx.amount.toFixed(2)}
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
  const styles: Record<string, string> = {
    delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-tighter", styles[status?.toLowerCase()] || 'bg-zinc-500/10 text-zinc-400')}>{status}</span>;
}
