'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, ShoppingCart, Wallet, Search, Loader2, RefreshCw,
  ArrowDownLeft, LogOut, LayoutDashboard, TrendingUp, PackageSearch, Bell, Menu, Plus
} from "lucide-react";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { getAdminDashboardData, updateSystemStatus, adjustUserBalance, assignUserRole, registerSkPlugWebhook } from '@/app/actions/admin';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/lib/types';

const PAGE_SIZE = 15;

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [registeringWebhook, setRegisteringWebhook] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('activity');
  const [currentPage, setCurrentPage] = useState(1);
  const [userSortField, setUserSortField] = useState<string>('recent');

  const [data, setData] = useState<any>(null);
  const [localSystemEnabled, setLocalSystemEnabled] = useState(true);
  const [localSystemMessage, setLocalSystemMessage] = useState('');

  const [isAdjOpen, setIsAdjOpen] = useState(false);
  const [adjUser, setAdjUser] = useState<any>(null);
  const [adjType, setAdjType] = useState<'credit' | 'debit'>('credit');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjLoading, setAdjLoading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const result = await getAdminDashboardData();
    if (result) {
      setData(result);
      setLocalSystemEnabled(result.systemStatus.enabled);
      setLocalSystemMessage(result.systemStatus.message);
    }
    setLoading(false);
  };

  const processedUsers = useMemo(() => {
    if (!data) return [];
    return data.users;
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    const query = searchQuery.toLowerCase();
    
    if (activeTab === 'users') {
      return processedUsers.filter((u: any) =>
        (u.full_name || '').toLowerCase().includes(query) ||
        (u.reference_code || '').toLowerCase().includes(query) ||
        (u.phone || '').includes(query)
      ).sort((a: any, b: any) => {
        if (userSortField === 'balance') return b.wallet_balance - a.wallet_balance;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    
    if (activeTab === 'activity') return data.liveStream.filter((i: any) => (i.phone || '').includes(query));
    if (activeTab === 'deposits') return data.recentTransactions.filter((t: any) => (t.profiles?.full_name || '').toLowerCase().includes(query));
    
    return [];
  }, [activeTab, searchQuery, data, processedUsers, userSortField]);

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

  const handleRegisterWebhook = async () => {
    setRegisteringWebhook(true);
    const result = await registerSkPlugWebhook(window.location.origin);
    if (result.success) toast({ title: "Webhook Registered" });
    setRegisteringWebhook(false);
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

  const formatGb = (gb: any) => {
    return parseFloat(gb.toString()).toString() + 'GB';
  };

  if (loading && !data) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center"><Loader2 className="animate-spin text-[#FFD700]" /></div>;

  const NavContent = () => (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
      <Button size="sm" variant="ghost" onClick={handleRegisterWebhook} disabled={registeringWebhook} className="text-zinc-400 border border-white/5 justify-start h-10 px-4">
        {registeringWebhook ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} className="mr-2" />} 
        Webhook
      </Button>
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
          <h1 className="text-sm font-black uppercase tracking-widest">Admin</h1>
        </div>
        
        <div className="hidden lg:flex items-center gap-2"><NavContent /></div>

        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild><Button size="icon" variant="ghost" className="text-zinc-400"><Menu size={20} /></Button></SheetTrigger>
            <SheetContent side="right" className="bg-[#111111] border-white/5 text-white p-6 pt-12">
              <SheetHeader className="text-left mb-6">
                <SheetTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Menu</SheetTitle>
                <SheetDescription className="text-xs text-zinc-500">Admin Navigation Control</SheetDescription>
              </SheetHeader>
              <NavContent />
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
            <StatCard icon={Users} label="Users" value={data?.stats.totalUsers} />
            <StatCard icon={ArrowDownLeft} label="Deposits" value={data?.stats.todayDeposits.toFixed(2)} color="text-emerald-400" />
            <StatCard icon={ShoppingCart} label="Orders" value={data?.stats.todayOrders} color="text-blue-400" />
            <StatCard icon={TrendingUp} label="Profit" value={data?.stats.todayProfit.toFixed(2)} color="text-amber-500" />
            <StatCard icon={Wallet} label="Upstream" value={data?.stats.rahitaluBalance.toFixed(2)} highlight />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-[#111111] border border-white/5 p-1 w-full lg:w-fit overflow-x-auto no-scrollbar h-auto flex gap-1">
            <TabsTrigger value="activity" className="text-[9px] font-black uppercase px-4 py-2.5">Live Feed</TabsTrigger>
            <TabsTrigger value="deposits" className="text-[9px] font-black uppercase px-4 py-2.5">Deposits</TabsTrigger>
            <TabsTrigger value="users" className="text-[9px] font-black uppercase px-4 py-2.5">Customers tier</TabsTrigger>
          </TabsList>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <Input placeholder={`Filter ${activeTab}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-[#111111] border-white/5 h-10 text-xs" />
          </div>

          <div className="rounded-xl border border-white/5 bg-[#111111] overflow-hidden">
            <Table>
              {activeTab === 'users' && (
                <>
                  <TableHeader><TableRow className="border-white/5 bg-white/5"><TableHead className="text-[9px] font-black uppercase px-4">Name</TableHead><TableHead className="text-[9px] font-black uppercase px-4">Balance</TableHead><TableHead className="text-[9px] font-black uppercase px-4">Tier</TableHead><TableHead className="text-right px-4">Edit</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {paginatedData.map((u: any) => (
                      <TableRow key={u.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="px-4 py-3"><div className="font-bold text-xs">{u.full_name}</div><div className="text-[9px] text-zinc-500 font-mono">{u.phone}</div></TableCell>
                        <TableCell className="px-4 font-black text-xs">{parseFloat(u.wallet_balance).toFixed(2)}</TableCell>
                        <TableCell className="px-4">
                          <Select value={u.role || 'base'} onValueChange={(v: UserRole) => handleUpdateRole(u.user_id, v)}>
                            <SelectTrigger className="h-7 text-[8px] font-black uppercase bg-black/40 border-white/5 w-20 px-2"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#111111] border-white/5 text-white">
                              <SelectItem value="base" className="text-[10px]">BASE</SelectItem>
                              <SelectItem value="falaa" className="text-[10px]">VIP</SelectItem>
                              <SelectItem value="api_user" className="text-[10px]">API</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right px-4"><Button size="sm" variant="ghost" onClick={() => { setAdjUser(u); setIsAdjOpen(true); }} className="h-7 w-7 p-0 text-[#FFD700] hover:bg-[#FFD700]/10"><Plus size={14} /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </>
              )}
              {activeTab === 'activity' && (
                <>
                  <TableHeader><TableRow className="border-white/5 bg-white/5"><TableHead className="text-[9px] font-black uppercase px-4">Time</TableHead><TableHead className="text-[9px] font-black uppercase px-4">Order Info</TableHead><TableHead className="text-right px-4">Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {paginatedData.map((i: any) => (
                      <TableRow key={i.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="px-4 text-[10px] text-zinc-500">{new Date(i.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell className="px-4 py-3"><div className="font-bold text-xs">{i.phone}</div><div className="text-[9px] text-[#FFD700] font-black uppercase">{formatGb(i.plan)}</div></TableCell>
                        <TableCell className="text-right px-4"><StatusBadge status={i.status} /></TableCell>
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
            <DialogTitle className="text-sm font-black uppercase">Wallet Adjustment</DialogTitle>
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
            <Textarea placeholder="Reason (for log)..." value={adjReason} onChange={e => setAdjReason(e.target.value)} className="bg-[#0d0d0d] border-white/5 text-xs h-20" />
          </div>
          <DialogFooter>
            <Button onClick={handleAdjustBalance} disabled={adjLoading} className="w-full bg-[#FFD700] text-black font-black uppercase h-12 rounded-xl">
              {adjLoading ? <Loader2 size={18} className="animate-spin" /> : "Confirm Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = "text-white", highlight }: any) {
  return (
    <Card className={cn("bg-[#111111] border-white/5 p-3 flex flex-col justify-between h-20", highlight && "bg-[#FFD700]")}>
      <div className="flex items-center justify-between">
        <Icon className={cn("w-3 h-3", highlight ? "text-black/60" : "text-zinc-600")} />
        <span className={cn("text-[8px] font-black uppercase tracking-widest", highlight ? "text-black/60" : "text-zinc-600")}>{label}</span>
      </div>
      <div className={cn("text-sm font-black truncate", highlight ? "text-black" : color)}>{value}</div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase border", styles[status?.toLowerCase()] || 'bg-zinc-500/10')}>{status}</span>;
}