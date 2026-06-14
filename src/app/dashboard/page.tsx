'use client';

import { useState, useEffect } from 'react';
import WalletCard from '@/components/dashboard/WalletCard';
import PlanCard from '@/components/dashboard/PlanCard';
import ForecastTool from '@/components/dashboard/ForecastTool';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PLANS, type Profile, type RahitaluOrder, type WalletTransaction } from '@/lib/types';
import { LayoutDashboard, History, ShoppingBag, LogOut, BarChart3, User, Loader2, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type DashboardTab = 'dashboard' | 'orders' | 'transactions' | 'usage';

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<RahitaluOrder[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/');
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        const { data: userOrders, error: orderError } = await supabase
          .from('rahitalu_orders')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (orderError) throw orderError;
        setOrders(userOrders || []);

        const { data: userTransactions, error: txError } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (txError) throw txError;
        setTransactions(userTransactions || []);

      } catch (error: any) {
        console.error('Dashboard Load Error:', error);
        toast({ title: "Session Error", description: "Please login again.", variant: "destructive" });
        router.push('/');
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [toast, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-card/50 hidden lg:flex flex-col p-6 space-y-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black italic">SB</div>
          <span className="text-xl font-black tracking-tighter">SB Bundles</span>
        </div>
        
        <nav className="flex-grow space-y-1">
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('dashboard')}
            className={cn("w-full justify-start gap-3", activeTab === 'dashboard' ? "text-primary bg-primary/10" : "text-muted-foreground")}
          >
            <LayoutDashboard size={18} /> Dashboard
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('orders')}
            className={cn("w-full justify-start gap-3", activeTab === 'orders' ? "text-primary bg-primary/10" : "text-muted-foreground")}
          >
            <ShoppingBag size={18} /> My Orders
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('transactions')}
            className={cn("w-full justify-start gap-3", activeTab === 'transactions' ? "text-primary bg-primary/10" : "text-muted-foreground")}
          >
            <History size={18} /> Transactions
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('usage')}
            className={cn("w-full justify-start gap-3", activeTab === 'usage' ? "text-primary bg-primary/10" : "text-muted-foreground")}
          >
            <BarChart3 size={18} /> Usage Stats
          </Button>
        </nav>

        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 mb-6">
             <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-white/10">
                <User className="w-5 h-5 text-muted-foreground" />
             </div>
             <div className="flex flex-col">
                <span className="text-sm font-semibold truncate max-w-[120px]">{profile.full_name}</span>
                <span className="text-xs text-muted-foreground">{profile.phone}</span>
             </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="w-full gap-2 border-white/5 bg-transparent hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20">
            <LogOut size={16} /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              {activeTab === 'dashboard' && `Welcome back, ${profile.full_name.split(' ')[0]}!`}
              {activeTab === 'orders' && `My Data Orders`}
              {activeTab === 'transactions' && `Wallet Transactions`}
              {activeTab === 'usage' && `AI Usage Insights`}
            </h1>
            <p className="text-muted-foreground">
              {activeTab === 'dashboard' && 'Manage your wallet and buy data bundles instantly.'}
              {activeTab === 'orders' && 'Track all your data bundle purchases.'}
              {activeTab === 'transactions' && 'Your financial history and deposits.'}
              {activeTab === 'usage' && 'Predict when your data will run out using AI.'}
            </p>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in duration-500">
            <div className="xl:col-span-4 space-y-8">
              <WalletCard balance={profile.wallet_balance} referenceCode={profile.reference_code} />
              <ForecastTool currentBalance={5} orders={orders} />
            </div>

            <div className="xl:col-span-8 space-y-8">
              <section>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" /> Available Bundles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {PLANS.map(plan => (
                    <PlanCard key={plan.id} plan={plan} userId={profile.user_id} />
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <Card className="border-white/5 bg-card/30 animate-in slide-in-from-bottom-4 duration-500">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-xs uppercase font-bold text-muted-foreground">Date</TableHead>
                  <TableHead className="text-xs uppercase font-bold text-muted-foreground">Plan</TableHead>
                  <TableHead className="text-xs uppercase font-bold text-muted-foreground">Phone</TableHead>
                  <TableHead className="text-xs uppercase font-bold text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold text-muted-foreground">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-50">No orders found.</TableCell></TableRow>
                ) : (
                  orders.map(order => (
                    <TableRow key={order.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="text-sm">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-bold">{order.gig}</TableCell>
                      <TableCell className="font-mono text-xs">{order.phone}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-[10px] uppercase font-bold", order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary')}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">GHS {order.sell_price_ghs}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {activeTab === 'transactions' && (
          <Card className="border-white/5 bg-card/30 animate-in slide-in-from-bottom-4 duration-500">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-xs uppercase font-bold text-muted-foreground">Date</TableHead>
                  <TableHead className="text-xs uppercase font-bold text-muted-foreground">Type</TableHead>
                  <TableHead className="text-xs uppercase font-bold text-muted-foreground">Description</TableHead>
                  <TableHead className="text-xs uppercase font-bold text-muted-foreground">Reference</TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold text-muted-foreground">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-50">No transactions recorded.</TableCell></TableRow>
                ) : (
                  transactions.map(tx => (
                    <TableRow key={tx.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="text-sm">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {tx.type === 'credit' ? <ArrowDownLeft className="w-3 h-3 text-emerald-500" /> : <ArrowUpRight className="w-3 h-3 text-red-500" />}
                          <span className={cn("text-xs font-bold uppercase", tx.type === 'credit' ? 'text-emerald-500' : 'text-red-500')}>{tx.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tx.description}</TableCell>
                      <TableCell className="font-mono text-[10px] opacity-70">{tx.reference}</TableCell>
                      <TableCell className={cn("text-right font-black", tx.type === 'credit' ? 'text-emerald-500' : 'text-foreground')}>
                        {tx.type === 'credit' ? '+' : '-'} GHS {tx.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {activeTab === 'usage' && (
          <div className="max-w-3xl animate-in fade-in duration-500">
            <ForecastTool currentBalance={5} orders={orders} />
          </div>
        )}
      </main>
    </div>
  );
}