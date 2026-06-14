'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Users, CreditCard, ShoppingCart, Wallet, TrendingUp, Search } from "lucide-react";
import { Input } from '@/components/ui/input';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 142,
    todayDeposits: 4500,
    todayOrders: 56,
    rahitaluBalance: 12450.50
  });

  const [users, setUsers] = useState([
    { id: '1', name: 'Kojo Antwi', ref: 'FD-A3X9', balance: 45.50, joined: '2023-10-01' },
    { id: '2', name: 'Ama Serwaa', ref: 'FD-B9Y2', balance: 12.00, joined: '2023-10-02' },
  ]);

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10 space-y-10 max-w-7xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">System Nexus</h1>
          <p className="text-muted-foreground">Global administration and financial monitoring.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="border-white/5 bg-card">Export CSV</Button>
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
              <div className="text-2xl font-black">{stats.totalUsers}</div>
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
              <div className="text-2xl font-black">GHS {stats.todayDeposits}</div>
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
              <div className="text-2xl font-black">{stats.todayOrders}</div>
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
              <div className="text-2xl font-black">GHS {stats.rahitaluBalance}</div>
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
                {users.map(user => (
                  <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-semibold">{user.name}</TableCell>
                    <TableCell><code className="bg-secondary px-2 py-1 rounded text-xs">{user.ref}</code></TableCell>
                    <TableCell className="font-mono">GHS {user.balance.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{user.joined}</TableCell>
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
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${i % 2 === 0 ? 'bg-primary' : 'bg-accent'}`}></div>
                  <div className="space-y-1">
                    <p className="text-xs leading-tight">
                      <span className="font-bold text-foreground">FD-A3X9</span> purchased <span className="font-bold">5.1GB Bundle</span> for 0244123456.
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase">{i * 2} mins ago</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}