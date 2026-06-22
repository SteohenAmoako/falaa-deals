'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, ShoppingCart, Wallet, Search, Loader2, RefreshCw,
  ArrowDownLeft, LogOut, LayoutDashboard, TrendingUp, PackageSearch, Bell, Menu, Plus, Zap, Globe
} from "lucide-react";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { getAdminDashboardData, updateSystemStatus, adjustUserBalance, assignUserRole, registerSkPlugWebhook, updateActiveProvider } from '@/app/actions/admin';
import { cn, formatGb, formatLongDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/lib/types';

const PAGE_SIZE = 50;

function StatCard({ icon: Icon, label, value, color = "text-white", highlight }: any) {
  return (
    <Card className={cn("bg-[#111111] border-white/5 p-3 flex flex-col justify-between h-20", highlight && "bg-[#FFD700]")}>
      <div className="flex items-center justify-between">
        <Icon className={cn("w-3 h-3", highlight ? "text-black/60" : "text-zinc-600")} />
        <span className={cn("text-[8px] font-black uppercase tracking-widest", highlight ? "text-black/60" : "text-zinc-600")}>{label}</span>
      </div>
      <div className={cn("text-sm font-black truncate", highlight ? "text-black" : color)}>
        {value !== undefined ? value : '...'}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase border", styles[status?.toLowerCase()] || 'bg-zinc-500/10')}>{status}</span>;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [registeringWebhook, setRegisteringWebhook] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<any>(null);
  
  const [localSystemEnabled, setLocalSystemEnabled] = useState(true);
  const [localSystemMessage, setLocalSystemMessage] = useState('');
  const [activeProvider, setActiveProvider] = useState<'skplug' | 'dakazina'>('skplug');

  const [isAdjOpen, setIsAdjOpen] = useState(false);
  const [adjUser, setAdjUser] = useState<any>(null);
  const [adjType, setAdjType] = useState<'credit' | 'debit'>('credit');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjLoading, setAdjLoading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminDashboardData();
      if (result) {
        setData(result);
        setLocalSystemEnabled(result.systemStatus?.enabled ?? true);
        setLocalSystemMessage(result.systemStatus?.message ?? '');
        setActiveProvider(result.activeProvider || 'skplug');
      }
    } catch (err) {
      console.error('Fetch Data Fail:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleProviderSwitch = async (newProvider: 'skplug' | 'dakazina') => {
    const res = await updateActiveProvider(newProvider);
    if (res.success) {
      setActiveProvider(newProvider);
      toast({ title: "Provider Switched", description: `Active provider is now ${newProvider.toUpperCase()}` });
      fetchData();
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    const query = searchQuery.toLowerCase();
    
    if (activeTab === 'users') {
      return (data.users || []).filter((u: any) =>
        (u.full_name || '').toLowerCase().includes(query) ||
        (u.reference_code || '').toLowerCase().includes(query) ||
        (u.phone || '').includes(query)
      );
    }
    
    if (activeTab === 'orders') {
      return (data.allOrders || []).filter((o: any) => 
        (o.phone || '').includes(query) || 
        (o.user_ref || '').toLowerCase().includes(query) ||
        (o.plan || '').toLowerCase().includes(query) ||
        (o.provider || '').toLowerCase().includes(query)
      );
    }
    
    if (activeTab === 'deposits') {
      return (data.allDeposits || []).filter((d: any) => 
        (d.name || '').toLowerCase().includes(query) || 
        (d.user_ref || '').toLowerCase().includes(query) ||
        (d.reference || '').toLowerCase().includes(query) ||
        (d.phone || '').includes(query)
      );
    }
    
    return [];
  }, [activeTab, searchQuery, data]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  const handleUpdateRole = async (userId: string, role: UserRole) => {
    try {
      await assignUserRole(userId, role);
      toast({ title: "Role Updated" });
      fetchData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    }
  };

  const handleUpdateStatus = async () => {
    setUpdatingStatus(true);
    const result = await updateSystemStatus(localSystemEnabled, localSystemMessage);
    if (result.success) {
      toast({ title: "System Updated" });
      fetchData();
    }
    setUpdatingStatus(false);
  };

  const handleAdjustBalance = async () => {
    if (!adjUser || !adjAmount) return;
    setAdjLoading(true);
    const result = await adjustUserBalance(adjUser.id, parseFloat(adjAmount), adjType, adjReason);
    if (result.success) {
      toast({ title: "Balance Adjusted" });
      setIsAdjOpen(false);
      fetchData();
    }
    setAdjLoading(false);
  };

  if (loading && !data) return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
      <Loader2 className="animate-spin text-[#FFD700]" />
    </div>
  );

  const NavContent = (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
      <div className="flex bg-[#111111] border border-white/5 rounded-lg p-1">
        <Button 
          size="sm" 
          variant={activeProvider === 'skplug' ? 'default' : 'ghost'} 
          onClick={() => handleProviderSwitch('skplug')}
          className={cn("h-8 text-[10px] font-black uppercase px-3", activeProvider === 'skplug' && "bg-violet-600")}
        >SK PLUG</Button>
        <Button 
          size="sm" 
          variant={activeProvider === 'dakazina' ? 'default' : 'ghost'} 
          onClick={() => handleProviderSwitch('dakazina')}
          className={cn("h-8 text-[10px] font-black uppercase px-3", activeProvider === 'dakazina' && "bg-violet-600")}
        >DAKAZINA</Button>
      </div>
      <Button size="sm" variant="ghost" onClick={() => router.push('/falaadealsadminurl$$/pricing')} className="text-zinc-400 border border-white/5 justify-start h-10 px-4"><PackageSearch size={14} className="mr-2" /> Pricing</Button>
      <Button size="sm" variant="ghost" onClick={fetchData} className="text-zinc-400 border border-white/5 justify-start h-10 px-4"><RefreshCw size={14} className={cn(loading && "animate-spin mr-2")} /> Sync</Button>
      <Button size="sm" variant="ghost" onClick={() => router.push('/dashboard')} className="text-zinc-400 border border-white/5 justify-start h-10 px-4"><LayoutDashboard size={14} className="mr-2" /> User Portal</Button>
      <Button size="sm" variant="ghost" onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="text-red-400 border border-white/5 justify-start h-10 px-4"><LogOut size={14} className="mr-2" /> Logout</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <header className="sticky top-0 z-20 bg-[#0d0d0d]/95 backdrop-blur-sm border-b border-white/5 h-16 px-4 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FFD700] flex items-center justify-center font-black text-black text-xs italic">FD</div>
          <h1 className="text-sm font-black uppercase tracking-widest">Audit Console</h1>
        </div>
        <div className="hidden lg:flex items-center gap-2">{NavContent}</div>
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild><Button size="icon" variant="ghost" className="text-zinc-400"><Menu size={20} /></Button></SheetTrigger>
            <SheetContent side="right" className="bg-[#111111] border-white/5 text-white p-6 pt-12">
              <SheetHeader className="text-left mb-6">
                <SheetTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Menu</SheetTitle>
              </SheetHeader>
              {NavContent}
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-3 bg-[#111111] border-white/5 h-fit">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 p-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Maintenance</CardTitle>
              <Switch checked={localSystemEnabled} onCheckedChange={setLocalSystemEnabled} />
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <Textarea placeholder="Msg..." value={localSystemMessage} onChange={e => setLocalSystemMessage(e.target.value)} className="bg-[#0d0d0d] border-white/5 text-[11px] min-h-[60px]" />
              <Button onClick={handleUpdateStatus} disabled={updatingStatus} className="w-full bg-[#FFD700] text-black font-black uppercase text-[10px] h-9">Save Config</Button>
            </CardContent>
          </Card>

          <div className="lg:col-span-9 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <StatCard icon={Users} label="Total Users" value={data?.stats?.totalUsers} />
            <StatCard icon={ArrowDownLeft} label="Today's Deposits" value={Number(data?.stats?.todayDeposits || 0).toFixed(2)} color="text-emerald-400" />
            <StatCard icon={ShoppingCart} label="Today's Orders" value={data?.stats?.todayOrders} color="text-blue-400" />
            <StatCard icon={TrendingUp} label="Daily Profit" value="0.00" color="text-amber-500" />
            <StatCard icon={Wallet} label="Rahitalu Bal" value={Number(data?.stats?.rahitaluBalance || 0).toFixed(2)} highlight />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-[#111111] border border-white/5 p-1 w-full lg:w-fit overflow-x-auto no-scrollbar h-auto flex gap-1">
            <TabsTrigger value="orders" className="text-[9px] font-black uppercase px-4 py-2.5">All Orders</TabsTrigger>
            <TabsTrigger value="deposits" className="text-[9px] font-black uppercase px-4 py-2.5">Deposits</TabsTrigger>
            <TabsTrigger value="users" className="text-[9px] font-black uppercase px-4 py-2.5">Customers Tier</TabsTrigger>
          </TabsList>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <Input placeholder={`Filter ${activeTab}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-[#111111] border-white/5 h-10 text-xs" />
          </div>

          <div className="rounded-xl border border-white/5 bg-[#111111] overflow-hidden">
            <Table>
              {activeTab === 'orders' && (
                <>
                  <TableHeader><TableRow className="border-white/5 bg-white/5 hover:bg-transparent"><TableHead className="text-[9px] font-black uppercase px-4">Time</TableHead><TableHead className="text-[9px] font-black uppercase px-4">Customer & Ref</TableHead><TableHead className="text-[9px] font-black uppercase px-4">Order Info</TableHead><TableHead className="text-right px-4">Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {paginatedData.map((o: any) => (
                      <TableRow key={o.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="px-4 text-[10px] text-zinc-500 whitespace-nowrap">{formatLongDate(o.timestamp)}</TableCell>
                        <TableCell className="px-4 py-3"><div className="font-bold text-xs">{o.phone}</div><div className="text-[9px] text-[#FFD700] font-black uppercase tracking-tighter">REF: {o.user_ref}</div></TableCell>
                        <TableCell className="px-4 py-3"><div className="font-black text-[10px] uppercase text-zinc-400">{o.provider}</div><div className="text-xs font-bold text-white">{formatGb(o.plan)}</div></TableCell>
                        <TableCell className="text-right px-4"><StatusBadge status={o.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </>
              )}
              {activeTab === 'deposits' && (
                <>
                  <TableHeader><TableRow className="border-white/5 bg-white/5 hover:bg-transparent"><TableHead className="text-[9px] font-black uppercase px-4">Time</TableHead><TableHead className="text-[9px] font-black uppercase px-4">Customer & Ref</TableHead><TableHead className="text-[9px] font-black uppercase px-4">Provider Ref</TableHead><TableHead className="text-right px-4">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {paginatedData.map((d: any) => (
                      <TableRow key={d.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="px-4 text-[10px] text-zinc-500 whitespace-nowrap">{formatLongDate(d.timestamp)}</TableCell>
                        <TableCell className="px-4 py-3"><div className="font-bold text-xs">{d.name}</div><div className="text-[9px] text-zinc-500 font-black uppercase tracking-tighter">{d.phone} • {d.user_ref}</div></TableCell>
                        <TableCell className="px-4 text-[10px] font-mono text-zinc-500 truncate max-w-[120px]">{d.reference}</TableCell>
                        <TableCell className="text-right px-4 font-black text-emerald-400">GHS {Number(d.amount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </>
              )}
              {activeTab === 'users' && (
                <>
                  <TableHeader><TableRow className="border-white/5 bg-white/5 hover:bg-transparent"><TableHead className="text-[9px] font-black uppercase px-4">Customer Info</TableHead><TableHead className="text-[9px] font-black uppercase px-4">Balance</TableHead><TableHead className="text-[9px] font-black uppercase px-4">Tier/Role</TableHead><TableHead className="text-right px-4">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {paginatedData.map((u: any) => (
                      <TableRow key={u.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="px-4 py-3"><div className="font-bold text-xs">{u.full_name}</div><div className="text-[9px] text-zinc-500 font-mono">{u.phone} • {u.reference_code}</div></TableCell>
                        <TableCell className="px-4 font-black text-xs">GHS {parseFloat(u.wallet_balance || 0).toFixed(2)}</TableCell>
                        <TableCell className="px-4">
                          <Select value={u.role || 'base'} onValueChange={(v: UserRole) => handleUpdateRole(u.user_id, v)}>
                            <SelectTrigger className="h-7 text-[8px] font-black uppercase bg-black/40 border-white/5 w-24 px-2"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#111111] border-white/5 text-white">
                              <SelectItem value="base" className="text-[10px]">BASE</SelectItem>
                              <SelectItem value="falaa" className="text-[10px]">VIP (FALAA)</SelectItem>
                              <SelectItem value="api_user" className="text-[10px]">API RESELLER</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right px-4">
                          <Button size="sm" variant="ghost" onClick={() => { setAdjUser(u); setIsAdjOpen(true); }} className="h-7 w-7 p-0 text-[#FFD700] hover:bg-[#FFD700]/10">
                            <Plus size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </>
              )}
            </Table>
          </div>
        </Tabs>
      </div>

      <Dialog open={isAdjOpen} onOpenChange={setIsAdjOpen}>
        <DialogContent className="bg-[#111111] border-white/5 text-white max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase">Balance Adjustment</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">Modifying balance for {adjUser?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Select value={adjType} onValueChange={(v: any) => setAdjType(v)}>
                <SelectTrigger className="bg-[#0d0d0d] border-white/5 h-12 text-xs font-bold"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#111111] text-white border-white/5"><SelectItem value="credit" className="text-xs">CREDIT (+)</SelectItem><SelectItem value="debit" className="text-xs">DEBIT (-)</SelectItem></SelectContent>
              </Select>
              <Input type="number" placeholder="0.00" value={adjAmount} onChange={e => setAdjAmount(e.target.value)} className="bg-[#0d0d0d] border-white/5 h-12 text-center font-black text-lg" />
            </div>
            <Textarea placeholder="Reason for change..." value={adjReason} onChange={e => setAdjReason(e.target.value)} className="bg-[#0d0d0d] border-white/5 text-xs h-20" />
          </div>
          <DialogFooter>
            <Button onClick={handleAdjustBalance} disabled={adjLoading} className="w-full bg-[#FFD700] text-black font-black uppercase h-12 rounded-xl">
              {adjLoading ? <Loader2 size={18} className="animate-spin" /> : "Execute Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}