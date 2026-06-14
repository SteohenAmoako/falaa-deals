
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Users, ShoppingCart, Wallet, 
  Search, Loader2, RefreshCw, CheckCircle2, Clock, XCircle,
  Zap, ArrowDownLeft, LogOut, LayoutDashboard, AlertCircle, Save
} from "lucide-react";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getAdminDashboardData, updateSystemStatus } from '@/app/actions/admin';
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
  } | null>(null);

  const [localSystemEnabled, setLocalSystemEnabled] = useState(true);
  const [localSystemMessage, setLocalSystemMessage] = useState('');

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
    u.reference_code?.toLowerCase().includes(search.toLowerCase())
  );

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
        {/* System Controls */}
        <Card className="bg-[#111111] border-white/5 overflow-hidden">
          <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#FFD700]" />
              <CardTitle className="text-base font-black uppercase tracking-tight">System Status</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("text-[10px] font-bold uppercase tracking-widest", localSystemEnabled ? "text-emerald-400" : "text-red-400")}>
                {localSystemEnabled ? "LIVE" : "RESTRICTED"}
              </span>
              <Switch checked={localSystemEnabled} onCheckedChange={setLocalSystemEnabled} className="data-[state=checked]:bg-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {!localSystemEnabled && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Restriction Message</label>
                <Textarea 
                  placeholder="e.g. Packages are out of stock. Please wait for a while." 
                  value={localSystemMessage}
                  onChange={(e) => setLocalSystemMessage(e.target.value)}
                  className="bg-[#0d0d0d] border-white/5 text-sm min-h-[80px]"
                />
              </div>
            )}
            <Button 
              className="w-full bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-black uppercase tracking-widest text-xs h-12"
              onClick={handleUpdateStatus}
              disabled={updatingStatus}
            >
              {updatingStatus ? <Loader2 className="animate-spin w-4 h-4" /> : <><Save className="w-4 h-4 mr-2" /> Save System Settings</>}
            </Button>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Users} iconColor="text-[#FFD700]" iconBg="bg-[#FFD700]/10" value={data?.stats.totalUsers ?? 0} label="Total Users" loading={loading} />
          <StatCard icon={ArrowDownLeft} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" value={`GHS ${(data?.stats.todayDeposits ?? 0).toFixed(2)}`} label="Today's Deposits" loading={loading} />
          <StatCard icon={ShoppingCart} iconColor="text-blue-400" iconBg="bg-blue-500/10" value={data?.stats.todayOrders ?? 0} label="Orders Today" loading={loading} />
          <StatCard icon={Wallet} iconColor="text-black" iconBg="bg-[#FFD700]" value={`GHS ${(data?.stats.rahitaluBalance ?? 0).toFixed(2)}`} label="Rahitalu Balance" loading={loading} highlight />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-black tracking-tight">Customer Directory</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <Input placeholder="Search name or reference…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-[#111111] border-white/5 text-white placeholder:text-zinc-700 h-9 w-full sm:w-64 text-sm" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#111111] overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-zinc-600 animate-spin" /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-16 text-zinc-600 text-sm">No customers found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-[11px] uppercase font-bold text-zinc-600 py-4 pl-5">Customer</TableHead>
                        <TableHead className="text-[11px] uppercase font-bold text-zinc-600 py-4">Reference</TableHead>
                        <TableHead className="text-[11px] uppercase font-bold text-zinc-600 py-4">Balance</TableHead>
                        <TableHead className="text-[11px] uppercase font-bold text-zinc-600 py-4 hidden sm:table-cell">Joined</TableHead>
                        <TableHead className="text-[11px] uppercase font-bold text-zinc-600 py-4 pr-5 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(user => (
                        <TableRow key={user.id} className="border-white/5 hover:bg-white/3">
                          <TableCell className="py-4 pl-5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center shrink-0">
                                <span className="text-[11px] font-black text-[#FFD700]">{user.full_name?.charAt(0).toUpperCase()}</span>
                              </div>
                              <span className="text-sm font-semibold truncate max-w-[100px] sm:max-w-none">{user.full_name}</span>
                            </div>
                          </TableCell>
                          <TableCell><code className="bg-white/5 px-2 py-1 rounded-lg text-xs font-mono text-[#FFD700]">{user.reference_code}</code></TableCell>
                          <TableCell className="font-bold text-sm">GHS {parseFloat(user.wallet_balance).toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-zinc-500 hidden sm:table-cell">{new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</TableCell>
                          <TableCell className="text-right pr-5">
                            <Button size="sm" className="h-7 text-[11px] font-bold bg-[#FFD700]/10 text-[#FFD700] hover:bg-[#FFD700] hover:text-black border-0 px-3">Credit</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-black tracking-tight">Live Activity</h2>
            <div className="rounded-2xl border border-white/5 bg-[#111111] overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-zinc-600 animate-spin" /></div>
              ) : !data?.liveStream?.length ? (
                <div className="text-center py-16 text-zinc-600 text-sm">No recent activity.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {data.liveStream.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-white/3 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                          item.status === 'delivered' ? 'bg-emerald-500/10' :
                          item.status === 'processing' ? 'bg-[#FFD700]/10' :
                          item.status === 'failed' ? 'bg-red-500/10' : 'bg-zinc-500/10'
                        )}>
                          {item.status === 'delivered' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          {item.status === 'processing' && <Zap className="w-4 h-4 text-[#FFD700]" />}
                          {item.status === 'pending' && <Clock className="w-4 h-4 text-zinc-400" />}
                          {item.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-sm font-bold text-white truncate">{item.phone}</span>
                            <StatusPill status={item.status} />
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-[#FFD700] font-black">{item.plan}</span>
                            <span className="text-zinc-500">·</span>
                            <span className="text-white font-bold">GHS {item.price ?? '—'}</span>
                          </div>
                          <div className="text-[10px] text-zinc-600">{safeTime(item.timestamp)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, iconColor, iconBg, value, label, loading, highlight }: any) {
  return (
    <Card className={cn("border-white/5 overflow-hidden", highlight ? "bg-[#FFD700]" : "bg-[#111111]")}>
      <CardContent className="p-4 sm:p-5">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-4", iconBg)}>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        {loading ? (
          <div className="h-7 w-20 bg-white/5 rounded-lg animate-pulse mb-1" />
        ) : (
          <div className={cn("text-xl sm:text-2xl font-black leading-none mb-1", highlight ? "text-black" : "text-white")}>{value}</div>
        )}
        <div className={cn("text-[10px] font-bold uppercase tracking-widest", highlight ? "text-black/60" : "text-zinc-600")}>{label}</div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    delivered:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-[#FFD700]/10  text-[#FFD700]  border-[#FFD700]/20',
    pending:    'bg-zinc-500/10   text-zinc-400   border-zinc-500/20',
    failed:     'bg-red-500/10    text-red-400    border-red-500/20',
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase border shrink-0", styles[status?.toLowerCase()] ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20')}>{status || 'pending'}</span>;
}
