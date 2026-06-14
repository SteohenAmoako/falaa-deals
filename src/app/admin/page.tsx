'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Users, CreditCard, ShoppingCart, Wallet, TrendingUp, Search, Loader2, RefreshCw } from "lucide-react";
import { Input } from '@/components/ui/input';
import { getAdminDashboardData } from '@/app/actions/admin';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    stats: { totalUsers: number; todayDeposits: number; todayOrders: number; rahitaluBalance: number };
    users: any[];
    liveStream: any[];
  } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getAdminDashboardData();
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10 space-y-10 max-w-7xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">System Nexus</h1>
          <p className="text-muted-foreground">Global administration and financial monitoring.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="border-white/5 bg-card" onClick={fetchData}>
             <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Refresh
           </Button>
           <Button className="font-bold">Manual Settlement</Button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-white/5 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black">{data?.stats.totalUsers}</div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Total Customers</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-white/5 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-accent/10 rounded-xl">
                <CreditCard className="w-5 h-5 text-accent" />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black">GHS {data?.stats.todayDeposits.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Today's Deposits</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-white/5 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <ShoppingCart className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black">{data?.stats.todayOrders}</div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Orders Today</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground border-none shadow-xl shadow-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-white/20 rounded-xl">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black">GHS {data?.stats.rahitaluBalance.toFixed(2)}</div>
              <div className="text-xs text-white/60 uppercase font-semibold">Rahitalu Wallet</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* User Management */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Customer Directory</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search references..." className="pl-10 bg-card border-white/5" />
            </div>
          </div>
          <Card className="border-white/5 bg-card/30 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-white/5">
                  <TableHead>Customer</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.users.map(user => (
                  <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-semibold">{user.full_name}</TableCell>
                    <TableCell><code className="bg-secondary px-2 py-1 rounded text-xs">{user.reference_code}</code></TableCell>
                    <TableCell className="font-mono">GHS {parseFloat(user.wallet_balance).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-8 border-white/5 hover:bg-primary/10 hover:text-primary">Credit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Global Activity Feed */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="text-xl font-bold">Live Stream</h2>
          <Card className="border-white/5 bg-card/30">
            <CardContent className="p-4 space-y-4">
              {data?.liveStream.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">No recent activity</div>
              ) : (
                data?.liveStream.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-1.5 shrink-0",
                      item.status === 'delivered' ? 'bg-emerald-500' : 'bg-primary'
                    )}></div>
                    <div className="space-y-1">
                      <p className="text-xs leading-tight">
                        <span className="font-bold text-foreground">{item.phone}</span> purchased <span className="font-bold">{item.plan}</span>.
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {formatDistanceToNow(new Date(item.timestamp))} ago
                        </p>
                        <Badge variant="outline" className="text-[8px] h-3 px-1 border-white/10 uppercase">{item.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
