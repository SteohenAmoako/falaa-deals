
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import {
  Users, ShoppingCart, Wallet, 
  Search, Loader2, RefreshCw,
  Zap, ArrowDownLeft, LogOut, LayoutDashboard, AlertCircle, Settings2, History, TrendingUp, Download, Coins, Filter, ChevronLeft, ChevronRight, PackageSearch, Bell, Menu, X
} from "lucide-react";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);

  const handleUpdateRole = async (userId: string, role: UserRole) => {
    try {
      await assignUserRole(userId, role);
      toast({ variant: "success", title: "Role Updated", description: `User promoted to ${role}.` });
      fetchData();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    }
  };

  const handleUpdateStatus = async () => {
    setUpdatingStatus(true);
    const result = await updateSystemStatus(localSystemEnabled, localSystemMessage);
    if (result.success) {
      toast({ variant: "success", title: "System Updated" });
      fetchData();
    }
    setUpdatingStatus(false);
  };

  const handleRegisterWebhook = async () => {
    setRegisteringWebhook(true);
    const appUrl = window.location.origin;
    const result = await registerSkPlugWebhook(appUrl);
    if (result.success) {
      toast({ variant: "success", title: "Webhook Registered", description: result.message });
    } else {
      toast({ variant: "destructive", title: "Registration Failed", description: result.message });
    }
    setRegisteringWebhook(false);
  };

  const handleAdjustBalance = async () => {
    if (!adjUser || !adjAmount) return;
    setAdjLoading(true);
    const result = await adjustUserBalance(adjUser.id, parseFloat(adjAmount), adjType, adjReason);
    if (result.success) {
      toast({ variant: "success", title: "Balance Adjusted" });
      setIsAdjOpen(false);
      fetchData();
    }
    setAdjLoading(false);
  };

  if (loading && !data) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center"><Loader2 className="animate-spin text-[#FFD700]" /></div>;

  const NavContent = () => (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
      <Button size="sm" variant="ghost" onClick={handleRegisterWebhook} disabled={registeringWebhook} className="text-zinc-400 border border-white/5 justify-start">
        {registeringWebhook ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} className="mr-2" />} 
        Webhook Setup
      </Button>
      <Button size="sm" variant="ghost" onClick={() => router.push('/falaadealsadminurl$$/pricing')} className="text-zinc-400 border border-white/5 justify-start"><PackageSearch size={16} className="mr-2" /> Pricing & Bundles</Button>
      <Button size="sm" variant="ghost" onClick={fetchData} className="text-zinc-400 border border-white/5 justify-start"><RefreshCw size={16} className={cn(loading && "animate-spin mr-2")} /> Refresh</Button>
      <Button size="sm" variant="ghost" onClick={() => router.push('/dashboard')} className="text-zinc-400 border border-white/5 justify-start"><LayoutDashboard size={16} className="mr-2" /> Dashboard</Button>
      <Button size="sm" variant="ghost" onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="text-red-400 border border-white/5 justify-start"><LogOut size={16} className="mr-2" /> Logout</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <header className="sticky top-0 z-20 bg-[#0d0d0d]/90 backdrop-blur border-b border-white/5 px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFD700] flex items-center justify-center font-black text-black text-sm">FD</div>
          <h1 className="text-base font-black tracking-tight">Admin</h1>
        </div>
        
        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-2">
          <NavContent />
        </div>

        {/* Mobile Nav */}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="text-zinc-400"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#111111] border-white/5 text-white p-6 pt-12">
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 bg-[#111111] border-white/5 h-fit">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 p-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500">System Control</CardTitle>
              <Switch checked={localSystemEnabled} onCheckedChange={setLocalSystemEnabled} />
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <Textarea placeholder="Maintenance message..." value={localSystemMessage} onChange={e => setLocalSystemMessage(e.target.value)} className="bg-[#0d0d0d] border-white/5 text-xs min-h-[80px]" />
              <Button onClick={handleUpdateStatus} disabled={updatingStatus} className="w-full bg-[#FFD700] text-black font-black uppercase text-[10px] h-9">Update System</Button>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard icon={Users} label="Total Users" value={data?.stats.totalUsers} />
            <StatCard icon={ArrowDownLeft} label="Deposits Today" value={`GHS ${data?.stats.todayDeposits.toFixed(2)}`} color="text-emerald-400" />
            <StatCard icon={ShoppingCart} label="Orders Today" value={data?.stats.todayOrders} color="text-blue-400" />
            <StatCard icon={TrendingUp} label="Total Profit" value={`GHS ${data?.stats.totalProfit.toFixed(2)}`} color="text-amber-500" />
            <StatCard icon={Wallet} label="Upstream Wallet" value={`GHS ${data?.stats.rahitaluBalance.toFixed(2)}`} highlight />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#111111] border border-white/5 p-1 w-full lg:w-fit overflow-x-auto h-auto grid grid-cols-3 lg:flex">
            <TabsTrigger value="activity" className="text-[10px] font-black uppercase">Live Stream</TabsTrigger>
            <TabsTrigger value="deposits" className="text-[10px] font-black uppercase">Recent Deposits</TabsTrigger>
            <TabsTrigger value="users" className="text-[10px] font-black uppercase">Customers</TabsTrigger>
          </TabsList>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <Input placeholder={`Filter ${activeTab}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-[#111111] border-white/5" />
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#111111] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                {activeTab === 'users' && (
                  <>
                    <TableHeader><TableRow className="border-white/5"><TableHead className="pl-6">Name</TableHead><TableHead>Reference</TableHead><TableHead>Balance</TableHead><TableHead>Role</TableHead><TableHead className="text-right pr-6">Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {paginatedData.map((u: any) => (
                        <TableRow key={u.id} className="border-white/5">
                          <TableCell className="pl-6 font-bold text-xs truncate max-w-[120px]">{u.full_name}</TableCell>
                          <TableCell className="font-mono text-zinc-500 text-xs">{u.reference_code}</TableCell>
                          <TableCell className="font-black text-xs">GHS {parseFloat(u.wallet_balance).toFixed(2)}</TableCell>
                          <TableCell>
                            <Select value={u.role || 'base'} onValueChange={(v: UserRole) => handleUpdateRole(u.user_id, v)}>
                              <SelectTrigger className="h-7 text-[9px] font-black uppercase bg-black/40 border-white/5 w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#111111] border-white/5 text-white">
                                <SelectItem value="base" className="text-[10px]">BASE</SelectItem>
                                <SelectItem value="falaa" className="text-[10px]">FALAA</SelectItem>
                                <SelectItem value="api_user" className="text-[10px]">API USER</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right pr-6"><Button size="sm" onClick={() => { setAdjUser(u); setIsAdjOpen(true); }} className="h-7 text-[9px] font-black uppercase bg-[#FFD700]/10 text-[#FFD700]">Adjust</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}
                {activeTab === 'activity' && (
                  <>
                    <TableHeader><TableRow className="border-white/5"><TableHead className="pl-6">Time</TableHead><TableHead>Phone</TableHead><TableHead>Plan</TableHead><TableHead className="text-right pr-6">Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {paginatedData.map((i: any) => (
                        <TableRow key={i.id} className="border-white/5">
                          <TableCell className="pl-6 text-[10px] text-zinc-500">{new Date(i.timestamp).toLocaleTimeString()}</TableCell>
                          <TableCell className="font-mono text-xs">{i.phone}</TableCell>
                          <TableCell className="font-black text-[#FFD700] text-xs">{i.plan}</TableCell>
                          <TableCell className="text-right pr-6"><StatusPill status={i.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}
              </Table>
            </div>
          </div>
        </Tabs>
      </div>

      <Dialog open={isAdjOpen} onOpenChange={setIsAdjOpen}>
        <DialogContent className="bg-[#111111] border-white/5 text-white max-w-[95vw] sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-sm font-black uppercase">Adjust Wallet: {adjUser?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Select value={adjType} onValueChange={(v: any) => setAdjType(v)}>
                <SelectTrigger className="bg-[#0d0d0d] border-white/5 h-12"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#111111] text-white border-white/5"><SelectItem value="credit">CREDIT (+)</SelectItem><SelectItem value="debit">DEBIT (-)</SelectItem></SelectContent>
              </Select>
              <Input type="number" placeholder="0.00" value={adjAmount} onChange={e => setAdjAmount(e.target.value)} className="bg-[#0d0d0d] border-white/5 h-12" />
            </div>
            <Textarea placeholder="Adjustment reason..." value={adjReason} onChange={e => setAdjReason(e.target.value)} className="bg-[#0d0d0d] border-white/5" />
          </div>
          <DialogFooter>
            <Button onClick={handleAdjustBalance} disabled={adjLoading} className="w-full bg-[#FFD700] text-black font-black uppercase h-12">{adjLoading ? <Loader2 className="animate-spin" /> : "Apply Adjustment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = "text-white", highlight }: any) {
  return (
    <Card className={cn("bg-[#111111] border-white/5 p-4 lg:p-5", highlight && "bg-[#FFD700]")}>
      <Icon className={cn("w-3 h-3 mb-2", highlight ? "text-black" : "text-zinc-500")} />
      <div className={cn("text-base lg:text-xl font-black truncate", highlight ? "text-black" : color)}>{value}</div>
      <div className={cn("text-[8px] lg:text-[9px] font-bold uppercase tracking-widest", highlight ? "text-black/60" : "text-zinc-600")}>{label}</div>
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase border", styles[status?.toLowerCase()] || 'bg-zinc-500/10')}>{status}</span>;
}
