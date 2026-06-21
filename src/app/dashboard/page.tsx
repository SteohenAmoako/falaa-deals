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
  BarChart3, User, Loader2, Menu, Wallet, Plus, Search, Zap, AlertTriangle, Smartphone, ArrowRightLeft
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn, formatGb, formatLongDate } from '@/lib/utils';
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
        "fixed top-0 left-0 h-full w-64 bg-[#111118] border-r border-white/5 z-40 flex flex-col transition-transform duration-300",
        "lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center font-black italic text-white text-sm">FD</div>
          <span className="font-black tracking-tight">Falaa Deals</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }} />
          <NavItem icon={ShoppingBag} label="Orders" active={activeTab === 'orders'} onClick={() => { setActiveTab('orders'); setSidebarOpen(false); }} />
          <NavItem icon={ArrowRightLeft} label="Transactions" active={activeTab === 'transactions'} onClick={() => { setActiveTab('transactions'); setSidebarOpen(false); }} />
          <NavItem icon={BarChart3} label="Usage Insights" active={activeTab === 'usage'} onClick={() => { setActiveTab('usage'); setSidebarOpen(false); }} />
          <NavItem icon={Code2} label="API Docs" active={false} onClick={() => router.push('/dashboard/api-docs')} />
        </nav>

        <div className="p-4 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-3 px-2 mb-4">
            <User className="w-8 h-8 p-1.5 bg-violet-600/20 rounded-full text-violet-400" />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{profile.full_name}</p>
              <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">{profile.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-zinc-500 hover:text-red-400 transition-colors">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="flex-none bg-[#0a0a0f]/80 backdrop-blur border-b border-white/5 px-4 h-16 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-zinc-400"><Menu size={20} /></button>
          
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 font-bold h-9 px-3 text-xs">
                  <Plus size={14} className="mr-1" /> Top Up
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111118] border-white/5 text-white p-6 max-w-sm rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black italic">MANUAL DEPOSIT</DialogTitle>
                  <DialogDescription className="text-[11px] text-zinc-500 font-medium">
                    Send funds to the merchant account below using your unique reference.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-4 bg-black/40 rounded-2xl space-y-4 border border-white/5">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Send MoMo To</p>
                    <p className="text-2xl font-black text-white">0595919802</p>
                    <p className="text-[10px] text-violet-400 font-bold mt-0.5">Merchant: Falaa Deals</p>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Use Reference</p>
                    <p className="text-2xl font-black text-[#FFD700] font-mono tracking-tighter">{profile.reference_code}</p>
                    <p className="text-[9px] text-zinc-400 mt-2 font-medium">Auto-credited within seconds of payment.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="h-9 px-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
              <Wallet size={14} className="text-violet-400" />
              <div className="flex flex-col">
                <span className="text-[7px] font-black uppercase text-zinc-500 leading-none">Wallet</span>
                <span className="font-black text-xs">GHS {profile.wallet_balance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {!systemStatus.enabled && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex gap-2">
              <AlertTriangle className="shrink-0 w-4 h-4" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest">Maintenance</p>
                <p className="text-xs font-medium">{systemStatus.message}</p>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                  <Zap className="text-[#FFD700] w-5 h-5" />
                  Buy Data
                </h2>
                <p className="text-zinc-500 text-xs">Choose network to view bundles.</p>
              </div>

              <Tabs defaultValue="MTN" className="space-y-6">
                <TabsList className="bg-[#111118] border border-white/5 p-1 h-auto w-full grid grid-cols-3 gap-1 sticky top-0 z-10 backdrop-blur-sm bg-opacity-90">
                  <TabsTrigger value="MTN" className="py-2.5 font-black text-[10px] uppercase tracking-widest">MTN</TabsTrigger>
                  <TabsTrigger value="AirtelTigo" className="py-2.5 font-black text-[10px] uppercase tracking-widest">AirtelTigo</TabsTrigger>
                  <TabsTrigger value="Telecel" className="py-2.5 font-black text-[10px] uppercase tracking-widest">Telecel</TabsTrigger>
                </TabsList>

                {Object.entries(groupedBundles).map(([network, networkBundles]) => (
                  <TabsContent key={network} value={network} className="mt-0 outline-none">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {networkBundles.length > 0 ? (
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
                        <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-20 gap-2">
                          <Smartphone size={32} />
                          <p className="text-xs font-bold">No packages available</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">Orders</h2>
                <div className="relative w-full max-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                  <Input 
                    placeholder="Search..." 
                    value={ordersSearch} 
                    onChange={e => setOrdersSearch(e.target.value)} 
                    className="bg-[#111118] border-white/5 pl-8 h-8 text-xs" 
                  />
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-[#111118] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 bg-white/5 hover:bg-white/5">
                      <TableHead className="font-black uppercase text-[9px] h-10">Bundle</TableHead>
                      <TableHead className="font-black uppercase text-[9px] h-10">Recipient</TableHead>
                      <TableHead className="text-right font-black uppercase text-[9px] h-10">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders
                      .filter(o => (o.gig || o.gb_size || '').toLowerCase().includes(ordersSearch.toLowerCase()) || (o.phone || o.recipient || '').includes(ordersSearch))
                      .map(order => (
                      <TableRow key={order.id} className="border-white/5 hover:bg-white/5 h-12">
                        <TableCell className="text-xs font-bold">{formatGb(order.gig || order.gb_size)}</TableCell>
                        <TableCell className="font-mono text-[11px] text-zinc-400">{order.phone || order.recipient}</TableCell>
                        <TableCell className="text-right"><StatusBadge status={order.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black">Transactions</h2>
              <div className="rounded-xl border border-white/5 bg-[#111118] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 bg-white/5 hover:bg-white/5">
                      <TableHead className="font-black uppercase text-[9px] h-10">Date</TableHead>
                      <TableHead className="font-black uppercase text-[9px] h-10">Detail</TableHead>
                      <TableHead className="text-right font-black uppercase text-[9px] h-10">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(tx => (
                      <TableRow key={tx.id} className="border-white/5 hover:bg-white/5 h-12">
                        <TableCell className="text-[10px] text-zinc-500 whitespace-nowrap">{formatLongDate(tx.created_at)}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{tx.description}</TableCell>
                        <TableCell className={cn("font-black text-right text-xs", tx.type === 'credit' ? 'text-emerald-400' : 'text-white')}>
                          {tx.type === 'credit' ? '+' : '-'} {tx.amount.toFixed(2)}
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

function NavItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
      active ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-zinc-500 hover:bg-white/5"
    )}>
      <Icon size={16} /> {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase border", styles[status?.toLowerCase()] || 'bg-zinc-500/10 text-zinc-400')}>{status}</span>;
}
