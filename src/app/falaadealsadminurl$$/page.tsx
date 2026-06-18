'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, ShoppingCart, Wallet, 
  Search, Loader2, RefreshCw, CheckCircle2, Clock, XCircle,
  Zap, ArrowDownLeft, LogOut, LayoutDashboard, AlertCircle, Save, Settings2, History, TrendingUp, Download, BarChart3, Coins, Filter, ChevronLeft, ChevronRight, ArrowUpDown
} from "lucide-react";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { getAdminDashboardData, updateSystemStatus, adjustUserBalance } from '@/app/actions/admin';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 15;

export default function AdminDashboard() {
  const [loading, setLoading]       = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('activity');
  
  // Sorting & Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [userSortField, setUserSortField] = useState<string>('recent');

  const [data, setData] = useState<{
    stats: { 
      totalUsers: number; 
      todayDeposits: number; 
      todayOrders: number; 
      rahitaluBalance: number;
      totalProfit: number;
      todayProfit: number;
    };
    systemStatus: { enabled: boolean; message: string };
    users: any[];
    orders: any[];
    liveStream: any[];
    recentTransactions: any[];
  } | null>(null);

  const [localSystemEnabled, setLocalSystemEnabled] = useState(true);
  const [localSystemMessage, setLocalSystemMessage] = useState('');

  // Adjustment Dialog State
  const [isAdjOpen, setIsAdjOpen] = useState(false);
  const [adjUser, setAdjUser] = useState<any>(null);
  const [adjType, setAdjType] = useState<'credit' | 'debit'>('credit');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjLoading, setAdjLoading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function checkAdminAccess() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/'); return; }

        const { data: profile, error } = await supabase
          .from('profiles').select('is_admin').eq('user_id', session.user.id).single();

        if (error || !profile?.is_admin) { router.push('/dashboard'); return; }

        setAuthLoading(false);
        fetchData();
      } catch { router.push('/dashboard'); }
    }
    checkAdminAccess();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getAdminDashboardData();
      setData(result);
      setLocalSystemEnabled(result.systemStatus.enabled);
      setLocalSystemMessage(result.systemStatus.message);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Advanced User Processing
  const processedUsers = useMemo(() => {
    if (!data) return [];

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return data.users.map(user => {
      const userOrders = data.orders.filter(o => o.user_id === user.user_id);
      const userTxs = data.recentTransactions.filter(t => t.user_id === user.user_id);
      
      const lifetimeSpend = userOrders.reduce((sum, o) => sum + Number(o.sell_price_ghs), 0);
      const purchases7Days = userOrders.filter(o => new Date(o.created_at) >= sevenDaysAgo).length;
      const purchases30Days = userOrders.filter(o => new Date(o.created_at) >= thirtyDaysAgo).length;
      
      const lastTxDate = userTxs.length > 0 ? new Date(userTxs[0].created_at) : new Date(user.created_at);

      return {
        ...user,
        lifetimeSpend,
        purchases7Days,
        purchases30Days,
        lastActivity: lastTxDate.toISOString()
      };
    });
  }, [data]);

  // Filtering Logic
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    if (activeTab === 'activity') {
      return (data?.liveStream || []).filter(item => 
        item.phone?.includes(query) || 
        item.plan?.toLowerCase().includes(query) ||
        item.reference?.toLowerCase().includes(query)
      );
    }
    
    if (activeTab === 'deposits') {
      return (data?.recentTransactions || []).filter(tx => 
        tx.profiles?.full_name?.toLowerCase().includes(query) ||
        tx.reference?.toLowerCase().includes(query) ||
        tx.amount?.toString().includes(query)
      );
    }
    
    if (activeTab === 'users') {
      let result = processedUsers.filter(u =>
        u.full_name?.toLowerCase().includes(query) ||
        u.reference_code?.toLowerCase().includes(query) ||
        u.phone?.includes(query)
      );

      // Advanced Sorting
      switch (userSortField) {
        case 'balance':
          result.sort((a, b) => Number(b.wallet_balance) - Number(a.wallet_balance));
          break;
        case 'spend':
          result.sort((a, b) => b.lifetimeSpend - a.lifetimeSpend);
          break;
        case 'purchases-7':
          result.sort((a, b) => b.purchases7Days - a.purchases7Days);
          break;
        case 'purchases-30':
          result.sort((a, b) => b.purchases30Days - a.purchases30Days);
          break;
        case 'recent':
        default:
          result.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
          break;
      }
      return result;
    }
    
    return [];
  }, [activeTab, searchQuery, data, processedUsers, userSortField]);

  // Pagination Helper
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);

  const handleUpdateStatus = async () => {
    setUpdatingStatus(true);
    try {
      const result = await updateSystemStatus(localSystemEnabled, localSystemMessage);
      if (result.success) {
        toast({ title: "System Updated", description: `Shop is now ${localSystemEnabled ? 'LIVE' : 'RESTRICTED'}.` });
        fetchData();
      } else {
        toast({ title: "Update Failed", description: result.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Update Failed", description: "Internal error occurred", variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAdjustBalance = async () => {
    if (!adjUser || !adjAmount || parseFloat(adjAmount) <= 0 || !adjReason) {
      toast({ title: "Validation Error", description: "Please fill all adjustment fields.", variant: "destructive" });
      return;
    }

    setAdjLoading(true);
    try {
      const result = await adjustUserBalance(adjUser.id, parseFloat(adjAmount), adjType, adjReason);
      if (result.success) {
        toast({ title: "Balance Adjusted", description: `Successfully ${adjType}ed GHS ${adjAmount} for ${adjUser.full_name}.` });
        setIsAdjOpen(false);
        setAdjAmount('');
        setAdjReason('');
        fetchData();
      } else {
        toast({ title: "Adjustment Failed", description: result.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Adjustment Failed", description: "An internal error occurred", variant: "destructive" });
    } finally {
      setAdjLoading(false);
    }
  };

  const openAdjustment = (user: any) => {
    setAdjUser(user);
    setIsAdjOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleExportUsers = () => {
    if (!filteredData.length) {
      toast({ title: "No data", description: "No users to export.", variant: "destructive" });
      return;
    }

    const headers = ["Full Name", "Phone Number", "Reference", "Balance", "Lifetime Spend"];
    const rows = filteredData.map(user => [
      `"${user.full_name?.replace(/"/g, '""')}"`,
      `"${user.phone || ''}"`,
      `"${user.reference_code}"`,
      user.wallet_balance,
      user.lifetimeSpend || 0
    ]);

    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Started" });
  };

  if (authLoading) return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#FFD700] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-black animate-spin" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Verifying access…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <header className="sticky top-0 z-20 bg-[#0d0d0d]/90 backdrop-blur border-b border-white/5 px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFD700] flex items-center justify-center font-black text-black text-sm shrink-0">FD</div>
          <div>
            <h1 className="text-base font-black tracking-tight leading-none">FalaaData</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Admin Console</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={fetchData} disabled={loading} className="text-zinc-400 hover:text-white border border-white/5 h-9 px-3">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span className="hidden sm:inline ml-2 text-xs font-bold">Refresh</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => router.push('/dashboard')} className="text-zinc-400 hover:text-white border border-white/5 h-9 px-3">
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline ml-2 text-xs font-bold">Dashboard</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={handleLogout} className="text-zinc-400 hover:text-red-400 border border-white/5 h-9 px-3">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline ml-2 text-xs font-bold">Logout</span>
          </Button>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="lg:col-span-1 bg-[#111111] border-white/5 overflow-hidden">
            <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#FFD700]" />
                <CardTitle className="text-base font-black uppercase tracking-tight">Status</CardTitle>
              </div>
              <Switch checked={localSystemEnabled} onCheckedChange={setLocalSystemEnabled} className="data-[state=checked]:bg-emerald-500" />
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Textarea 
                placeholder="Restriction message..." 
                value={localSystemMessage}
                onChange={(e) => setLocalSystemMessage(e.target.value)}
                className="bg-[#0d0d0d] border-white/5 text-sm min-h-[60px]"
              />
              <Button 
                className="w-full bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-black uppercase tracking-widest text-[10px] h-10"
                onClick={handleUpdateStatus}
                disabled={updatingStatus}
              >
                {updatingStatus ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Status"}
              </Button>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <StatCard icon={Users} iconColor="text-[#FFD700]" iconBg="bg-[#FFD700]/10" value={data?.stats.totalUsers ?? 0} label="Total Users" loading={loading} />
            <StatCard icon={ArrowDownLeft} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" value={`GHS ${(data?.stats.todayDeposits ?? 0).toFixed(2)}`} label="Today's Deposits" loading={loading} />
            <StatCard icon={ShoppingCart} iconColor="text-blue-400" iconBg="bg-blue-500/10" value={data?.stats.todayOrders ?? 0} label="Orders Today" loading={loading} />
            <StatCard icon={TrendingUp} iconColor="text-amber-500" iconBg="bg-amber-500/10" value={`GHS ${(data?.stats.todayProfit ?? 0).toFixed(2)}`} label="Today's Profit" loading={loading} />
            <StatCard icon={Coins} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" value={`GHS ${(data?.stats.totalProfit ?? 0).toFixed(2)}`} label="All-Time Profit" loading={loading} />
            <StatCard icon={Wallet} iconColor="text-black" iconBg="bg-[#FFD700]" value={`GHS ${(data?.stats.rahitaluBalance ?? 0).toFixed(2)}`} label="Rahitalu Balance" loading={loading} highlight />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); setSearchQuery(''); }} className="space-y-6">
          <TabsList className="bg-[#111111] border border-white/5 p-1">
            <TabsTrigger value="activity" className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black text-xs font-bold uppercase tracking-widest px-6">Live Activity</TabsTrigger>
            <TabsTrigger value="deposits" className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black text-xs font-bold uppercase tracking-widest px-6">Deposits</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black text-xs font-bold uppercase tracking-widest px-6">Users</TabsTrigger>
          </TabsList>

          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <Input 
                placeholder={`Search ${activeTab}...`} 
                value={searchQuery} 
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
                className="pl-9 bg-[#111111] border-white/5 text-white h-10 w-full" 
              />
            </div>
            
            {activeTab === 'users' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-[#111111] px-3 py-1.5 rounded-lg border border-white/5">
                  <Filter className="w-3.5 h-3.5 text-zinc-500" />
                  <Select value={userSortField} onValueChange={setUserSortField}>
                    <SelectTrigger className="w-[180px] h-7 bg-transparent border-none text-[10px] font-bold uppercase text-[#FFD700]">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111111] border-white/5 text-white">
                      <SelectItem value="recent">Recent Activity</SelectItem>
                      <SelectItem value="balance">Highest Balance</SelectItem>
                      <SelectItem value="spend">Lifetime Spend</SelectItem>
                      <SelectItem value="purchases-7">Purchases (7 Days)</SelectItem>
                      <SelectItem value="purchases-30">Purchases (30 Days)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleExportUsers} variant="outline" className="h-10 bg-[#111111] border-white/5 text-zinc-400 hover:text-white gap-2 font-bold text-xs uppercase tracking-widest">
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="activity">
            <div className="rounded-2xl border border-white/5 bg-[#111111] overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="border-white/5 hover:bg-transparent"><TableHead className="text-[10px] uppercase font-bold text-zinc-600 pl-5">Time</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600">Phone</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600">Plan</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600">Price</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600 pr-5 text-right">Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {paginatedData.map((item) => (
                      <TableRow key={item.id} className="border-white/5 hover:bg-white/3">
                        <TableCell className="pl-5 text-[11px] text-zinc-500 whitespace-nowrap">{new Date(item.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell className="font-mono text-sm font-bold">{item.phone}</TableCell>
                        <TableCell className="text-[11px] font-black text-[#FFD700]">{item.plan}</TableCell>
                        <TableCell className="text-[11px] font-bold">GHS {item.price ?? '—'}</TableCell>
                        <TableCell className="pr-5 text-right"><StatusPill status={item.status} /></TableCell>
                      </TableRow>
                    ))}
                    {paginatedData.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-10 text-zinc-600">No activity matches your search.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="deposits">
            <div className="rounded-2xl border border-white/5 bg-[#111111] overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="border-white/5 hover:bg-transparent"><TableHead className="text-[10px] uppercase font-bold text-zinc-600 pl-5">Date</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600">Customer</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600">Amount</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600">Reference</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600 pr-5 text-right">Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {paginatedData.map((tx) => (
                      <TableRow key={tx.id} className="border-white/5 hover:bg-white/3">
                        <TableCell className="pl-5 text-[11px] text-zinc-500 whitespace-nowrap">{new Date(tx.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-sm font-semibold">{tx.profiles?.full_name || 'System'}</TableCell>
                        <TableCell className="text-sm font-black text-emerald-400">GHS {parseFloat(tx.amount).toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-[10px] text-zinc-400">{tx.reference}</TableCell>
                        <TableCell className="pr-5 text-right"><StatusPill status={tx.status} /></TableCell>
                      </TableRow>
                    ))}
                    {paginatedData.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-10 text-zinc-600">No deposits match your search.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="rounded-2xl border border-white/5 bg-[#111111] overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="border-white/5 hover:bg-transparent"><TableHead className="pl-5 text-[10px] uppercase text-zinc-600">User</TableHead><TableHead className="text-[10px] uppercase text-zinc-600">Phone</TableHead><TableHead className="text-[10px] uppercase text-zinc-600">Balance</TableHead><TableHead className="text-[10px] uppercase text-zinc-600">Spend</TableHead><TableHead className="text-[10px] uppercase text-zinc-600">Activity</TableHead><TableHead className="text-right pr-5 text-[10px] uppercase text-zinc-600">Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {paginatedData.map(user => (
                      <TableRow key={user.id} className="border-white/5 hover:bg-white/3">
                        <TableCell className="pl-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">{user.full_name}</span>
                            <span className="text-[10px] text-[#FFD700] font-black">{user.reference_code}</span>
                          </div>
                        </TableCell>
                        <TableCell><span className="text-xs font-mono text-zinc-400">{user.phone || 'N/A'}</span></TableCell>
                        <TableCell className="font-black">GHS {parseFloat(user.wallet_balance).toFixed(2)}</TableCell>
                        <TableCell className="text-xs font-bold text-emerald-400">GHS {user.lifetimeSpend.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] text-zinc-500 uppercase font-bold">{new Date(user.lastActivity).toLocaleDateString()}</span>
                            <span className="text-[9px] text-zinc-600 font-medium">{user.purchases30Days} purchases in 30d</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-5"><Button size="sm" onClick={() => openAdjustment(user)} className="h-7 text-[9px] bg-[#FFD700]/10 text-[#FFD700] hover:bg-[#FFD700] hover:text-black font-black uppercase">Adjust</Button></TableCell>
                      </TableRow>
                    ))}
                    {paginatedData.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-10 text-zinc-600">No users match your criteria.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-4">
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                Showing {Math.min(filteredData.length, (currentPage - 1) * PAGE_SIZE + 1)} to {Math.min(filteredData.length, currentPage * PAGE_SIZE)} of {filteredData.length}
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="bg-[#111111] border-white/5 h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    if (totalPages > 5 && Math.abs(currentPage - pageNum) > 2 && pageNum !== 1 && pageNum !== totalPages) {
                      if (Math.abs(currentPage - pageNum) === 3) return <span key={pageNum} className="text-zinc-600">...</span>;
                      return null;
                    }
                    return (
                      <Button
                        key={pageNum}
                        size="sm"
                        variant={currentPage === pageNum ? "default" : "outline"}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "h-8 w-8 p-0 text-[10px] font-black",
                          currentPage === pageNum ? "bg-[#FFD700] text-black border-none" : "bg-[#111111] border-white/5 text-zinc-500"
                        )}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="bg-[#111111] border-white/5 h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Tabs>
      </div>

      {/* Dialogs remain unchanged */}
      <Dialog open={isAdjOpen} onOpenChange={setIsAdjOpen}>
        <DialogContent className="bg-[#111111] border-white/5 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-[#FFD700]" />
              Adjust Wallet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Select value={adjType} onValueChange={(v: any) => setAdjType(v)}>
                <SelectTrigger className="bg-[#0d0d0d] border-white/5 h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#111111] border-white/5 text-white"><SelectItem value="credit">CREDIT (+)</SelectItem><SelectItem value="debit">DEBIT (-)</SelectItem></SelectContent>
              </Select>
              <Input type="number" placeholder="0.00" className="bg-[#0d0d0d] border-white/5 h-11 font-bold" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} />
            </div>
            <Textarea placeholder="Reason..." className="bg-[#0d0d0d] border-white/5 text-sm" value={adjReason} onChange={(e) => setAdjReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAdjOpen(false)}>Cancel</Button>
            <Button className="bg-[#FFD700] text-black font-black" onClick={handleAdjustBalance} disabled={adjLoading}>
              {adjLoading ? <Loader2 className="animate-spin" /> : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, iconColor, iconBg, value, label, loading, highlight }: any) {
  return (
    <Card className={cn("border-white/5 overflow-hidden shadow-xl", highlight ? "bg-[#FFD700]" : "bg-[#111111]")}>
      <CardContent className="p-4 sm:p-5">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", iconBg)}>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        {loading ? <div className="h-6 w-20 bg-white/5 rounded animate-pulse" /> : <div className={cn("text-xl font-black", highlight ? "text-black" : "text-white")}>{value}</div>}
        <div className={cn("text-[9px] font-bold uppercase tracking-widest mt-1", highlight ? "text-black/60" : "text-zinc-500")}>{label}</div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    delivered:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    success:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-[#FFD700]/10  text-[#FFD700]  border-[#FFD700]/20',
    pending:    'bg-zinc-500/10   text-zinc-400   border-zinc-500/20',
    failed:     'bg-red-500/10    text-red-400    border-red-500/20',
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase border shrink-0", styles[status?.toLowerCase()] ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20')}>{status || 'pending'}</span>;
}
