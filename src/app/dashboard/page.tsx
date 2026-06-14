'use client';

import { useState, useEffect } from 'react';
import WalletCard from '@/components/dashboard/WalletCard';
import PlanCard from '@/components/dashboard/PlanCard';
import ForecastTool from '@/components/dashboard/ForecastTool';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PLANS, type Profile, type RahitaluOrder, type WalletTransaction } from '@/lib/types';
import { LayoutDashboard, History, ShoppingBag, LogOut, BarChart3, User, Loader2 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<RahitaluOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        
        // In a real app with Auth, we would use: const { data: { user } } = await supabase.auth.getUser();
        // For this prototype, we'll fetch the first profile to demonstrate connectivity
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .limit(1)
          .single();

        if (profileError) throw profileError;
        setProfile(profiles);

        // Fetch user's orders
        const { data: userOrders, error: orderError } = await supabase
          .from('rahitalu_orders')
          .select('*')
          .eq('user_id', profiles.user_id)
          .order('created_at', { ascending: false });

        if (orderError) throw orderError;
        setOrders(userOrders || []);

      } catch (error: any) {
        console.error('Dashboard Load Error:', error);
        toast({
          title: "Connection Error",
          description: "Failed to fetch data from your Supabase backend. Please check your tables and credentials.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">Connecting to SB Bundles Engine...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <Card className="max-w-md p-8 border-dashed border-2">
          <h2 className="text-2xl font-bold mb-4">No Profile Found</h2>
          <p className="text-muted-foreground mb-6">
            We connected to your Supabase instance, but couldn't find any user profiles. 
            Make sure your `profiles` table has at least one entry.
          </p>
          <Button onClick={() => window.location.reload()}>Retry Connection</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-card/50 hidden lg:flex flex-col p-6 space-y-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black italic">SB</div>
          <span className="text-xl font-black tracking-tighter">SB Bundles</span>
        </div>
        
        <nav className="flex-grow space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-3 text-primary bg-primary/10">
            <LayoutDashboard size={18} /> Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
            <ShoppingBag size={18} /> My Orders
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
            <History size={18} /> Transactions
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
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
          <Button variant="outline" className="w-full gap-2 border-white/5 bg-transparent hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20">
            <LogOut size={16} /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Welcome back, {profile.full_name.split(' ')[0]}!</h1>
            <p className="text-muted-foreground">Manage your wallet and buy data bundles instantly.</p>
          </div>
          <div className="flex gap-3">
             <Badge variant="outline" className="py-1.5 px-3 bg-card border-white/5 gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               System Online
             </Badge>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="xl:col-span-4 space-y-8">
            <WalletCard balance={profile.wallet_balance} referenceCode={profile.reference_code} />
            <div className="hidden xl:block">
              <ForecastTool currentBalance={5} orders={orders} />
            </div>
          </div>

          {/* Right Column */}
          <div className="xl:col-span-8 space-y-8">
            <section>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Available Bundles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {PLANS.map(plan => (
                  <PlanCard key={plan.id} plan={plan} userId={profile.user_id} />
                ))}
              </div>
            </section>

            <div className="xl:hidden">
              <ForecastTool currentBalance={5} orders={orders} />
            </div>

            <section>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Recent Orders
              </h2>
              <Card className="border-white/5 bg-card/30 backdrop-blur-sm overflow-hidden">
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
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No orders found.</TableCell>
                      </TableRow>
                    ) : (
                      orders.map(order => (
                        <TableRow key={order.id} className="border-white/5 hover:bg-white/5">
                          <TableCell className="text-sm">
                            {new Date(order.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-bold">{order.gig}</TableCell>
                          <TableCell className="font-mono text-xs">{order.phone}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-[10px] uppercase font-bold ${
                              order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'
                            }`}>
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
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
