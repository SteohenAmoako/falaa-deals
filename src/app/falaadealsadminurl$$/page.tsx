'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, ShoppingCart, Wallet, 
  Search, Loader2, RefreshCw, CheckCircle2, Clock, XCircle,
  Zap, ArrowDownLeft, LogOut, LayoutDashboard, AlertCircle, Save, Settings2, History, TrendingUp, Download
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

export default function AdminDashboard() {
  const [loading, setLoading]       = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [search, setSearch]         = useState('');
  const [data, setData] = useState<{
    stats: { totalUsers: number; todayDeposits: number; todayOrders: number; rahitaluBalance: number };
    systemStatus: { enabled: boolean; message: string };
    users: any[];
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

  const safeTime = (ts: string) => {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  };

  const filteredUsers = (data?.users || []).filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.reference_code?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  const handleExportUsers = () => {
    if (!filteredUsers.length) {
      toast({ title: "No data", description: "No users to export.", variant: "destructive" });
      return;
    }

    // CSV Headers
    const headers = ["Full Name", "Phone Number"];
    
    // Prepare rows
    const rows = filteredUsers.map(user => [
      `"${user.full_name?.replace(/"/g, '""')}"`, // Escape quotes in names
      `"${user.phone || ''}"`
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().split('T')[0];
    
    link.setAttribute("href", url);
    link.setAttribute("download", `falaadeals_customers_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Export Started", description: "Your customer list is being downloaded." });
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

          <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
            <StatCard icon={Users} iconColor="text-[#FFD700]" iconBg="bg-[#FFD700]/10" value={data?.stats.totalUsers ?? 0} label="Total Users" loading={loading} />
            <StatCard icon={ArrowDownLeft} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" value={`GHS ${(data?.stats.todayDeposits ?? 0).toFixed(2)}`} label="Today's Deposits" loading={loading} />
            <StatCard icon={ShoppingCart} iconColor="text-blue-400" iconBg="bg-blue-500/10" value={data?.stats.todayOrders ?? 0} label="Orders Today" loading={loading} />
            <StatCard icon={Wallet} iconColor="text-black" iconBg="bg-[#FFD700]" value={`GHS ${(data?.stats.rahitaluBalance ?? 0).toFixed(2)}`} label="Rahitalu Balance" loading={loading} highlight />
          </div>
        </div>

        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="bg-[#111111] border border-white/5 p-1">
            <TabsTrigger value="activity" className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black text-xs font-bold uppercase tracking-widest px-6">Live Activity</TabsTrigger>
            <TabsTrigger value="deposits" className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black text-xs font-bold uppercase tracking-widest px-6">Deposits</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black text-xs font-bold uppercase tracking-widest px-6">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <div className="rounded-2xl border border-white/5 bg-[#111111] overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-zinc-600 animate-spin" /></div>
              ) : !data?.liveStream?.length ? (
                <div className="text-center py-16 text-zinc-600 text-sm">No recent data orders.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="border-white/5 hover:bg-transparent"><TableHead className="text-[10px] uppercase font-bold text-zinc-600 pl-5">Time</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600">Phone</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600">Plan</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600">Price</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600 pr-5 text-right">Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {data.liveStream.map((item) => (
                        <TableRow key={item.id} className="border-white/5 hover:bg-white/3">
                          <TableCell className="pl-5 text-[11px] text-zinc-500 whitespace-nowrap">{safeTime(item.timestamp)}</TableCell>
                          <TableCell className="font-mono text-sm font-bold">{item.phone}</TableCell>
                          <TableCell className="text-[11px] font-black text-[#FFD700]">{item.plan}</TableCell>
                          <TableCell className="text-[11px] font-bold">GHS {item.price ?? '—'}</TableCell>
                          <TableCell className="pr-5 text-right"><StatusPill status={item.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="deposits">
            <div className="rounded-2xl border border-white/5 bg-[#111111] overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-zinc-600 animate-spin" /></div>
              ) : !data?.recentTransactions?.length ? (
                <div className="text-center py-16 text-zinc-600 text-sm">No recent deposits found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="border-white/5 hover:bg-transparent"><TableHead className="text-[10px] uppercase font-bold text-zinc-600 pl-5">Date</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600">Customer</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600">Amount</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600">Reference</TableHead><TableHead className="text-[10px] uppercase font-bold text-zinc-600 pr-5 text-right">Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {data.recentTransactions.map((tx) => (
                        <TableRow key={tx.id} className="border-white/5 hover:bg-white/3">
                          <TableCell className="pl-5 text-[11px] text-zinc-500 whitespace-nowrap">{new Date(tx.created_at).toLocaleString()}</TableCell>
                          <TableCell className="text-sm font-semibold">{tx.profiles?.full_name || 'System'}</TableCell>
                          <TableCell className="text-sm font-black text-emerald-400">GHS {parseFloat(tx.amount).toFixed(2)}</TableCell>
                          <TableCell className="font-mono text-[10px] text-zinc-400">{tx.reference}</TableCell>
                          <TableCell className="pr-5 text-right"><StatusPill status={tx.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <Input 
                    placeholder="Search name, phone or reference…" 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    className="pl-9 bg-[#111111] border-white/5 text-white h-10 w-full" 
                  />
                </div>
                <Button 
                  onClick={handleExportUsers} 
                  variant="outline" 
                  className="h-10 bg-[#111111] border-white/5 text-zinc-400 hover:text-white gap-2 font-bold text-xs uppercase tracking-widest"
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </Button>
              </div>
              <div className="rounded-2xl border border-white/5 bg-[#111111] overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="border-white/5 hover:bg-transparent"><TableHead className="pl-5">User</TableHead><TableHead>Phone</TableHead><TableHead>Reference</TableHead><TableHead>Balance</TableHead><TableHead className="text-right pr-5">Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => (
                      <TableRow key={user.id} className="border-white/5 hover:bg-white/3">
                        <TableCell className="pl-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{user.full_name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{user.user_id?.substring(0,8)}</span>
                          </div>
                        </TableCell>
                        <TableCell><span className="text-xs font-mono text-zinc-400">{user.phone || 'N/A'}</span></TableCell>
                        <TableCell><code className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-[#FFD700]">{user.reference_code}</code></TableCell>
                        <TableCell className="font-bold">GHS {parseFloat(user.wallet_balance).toFixed(2)}</TableCell>
                        <TableCell className="text-right pr-5"><Button size="sm" onClick={() => openAdjustment(user)} className="h-7 text-[9px] bg-[#FFD700]/10 text-[#FFD700] hover:bg-[#FFD700] hover:text-black">Adjust</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

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
