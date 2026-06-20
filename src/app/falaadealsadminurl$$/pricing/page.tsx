'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  PackageSearch, RefreshCw, Save, Loader2, TrendingUp, AlertTriangle, ShieldCheck, Search, ChevronLeft
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { syncBundlesFromSkPlug, updateBundleRolePrice, applyBulkMarkup } from '@/app/actions/bundles';
import { supabase } from '@/lib/supabase';
import { Bundle, UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function PricingPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [bundles, setBundles] = useState<any[]>([]);
  const [markupRole, setMarkupRole] = useState<UserRole>('base');
  const [markupPercent, setMarkupPercent] = useState('30');
  const [markupLoading, setMarkupLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => { fetchPricingData(); }, []);

  const fetchPricingData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bundles')
      .select('*, bundle_role_prices(*)');
    
    if (data) setBundles(data);
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    const res = await syncBundlesFromSkPlug();
    if (res.success) {
      toast({ variant: "success", title: "Sync Complete", description: `Added/Updated bundles.` });
      fetchPricingData();
    }
    setSyncing(false);
  };

  const handlePriceUpdate = async (bundleId: string, role: UserRole, price: number) => {
    const res = await updateBundleRolePrice(bundleId, role, price);
    if (res.success) {
      toast({ title: "Price Saved", description: `${role} price updated.` });
    }
  };

  const handleApplyMarkup = async () => {
    setMarkupLoading(true);
    const res = await applyBulkMarkup(markupRole, parseFloat(markupPercent));
    if (res.success) {
      toast({ variant: "success", title: "Markup Applied", description: `Updated all ${markupRole} prices.` });
      fetchPricingData();
    }
    setMarkupLoading(false);
  };

  const filteredBundles = bundles.filter(b => 
    b.network.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatGb = (gb: any) => {
    return parseFloat(gb.toString()).toString() + 'GB';
  };

  if (loading) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center"><Loader2 className="animate-spin text-[#FFD700]" /></div>;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <button onClick={() => router.push('/falaadealsadminurl$$')} className="text-zinc-500 hover:text-white flex items-center gap-1 text-xs font-bold uppercase mb-2">
              <ChevronLeft size={14} /> Back to Dashboard
            </button>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <ShieldCheck className="text-[#FFD700]" />
              Role Pricing Management
            </h1>
            <p className="text-zinc-500">Configure cost-to-selling ratios for all customer tiers.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSync} disabled={syncing} className="bg-blue-600 hover:bg-blue-700 font-bold h-11 px-6">
              {syncing ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw size={18} className="mr-2" />}
              Sync From SK Plug
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="bg-[#111111] border-white/5 lg:col-span-1">
            <CardHeader><CardTitle className="text-sm font-black uppercase text-zinc-500">Bulk Markup Tool</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-600 uppercase">Target Role</label>
                <select value={markupRole} onChange={e => setMarkupRole(e.target.value as UserRole)} className="w-full h-10 bg-black/40 border-white/5 rounded-md px-3 text-sm">
                  <option value="base">Base Customers</option>
                  <option value="falaa">Falaa (VIP)</option>
                  <option value="api_user">API Resellers</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-600 uppercase">Markup Percentage (%)</label>
                <Input type="number" value={markupPercent} onChange={e => setMarkupPercent(e.target.value)} className="bg-black/40 border-white/5 h-10" />
              </div>
              <Button onClick={handleApplyMarkup} disabled={markupLoading} className="w-full bg-[#FFD700] text-black font-black uppercase text-[10px] h-10">
                {markupLoading ? <Loader2 className="animate-spin" /> : "Apply To All Bundles"}
              </Button>
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <TrendingUp size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-200/60 leading-relaxed font-medium">Markup is calculated based on current cost prices from SK Plug.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-white/5 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase text-zinc-500">Live Bundle Catalog</CardTitle>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <Input placeholder="Search bundles..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-black/20 border-white/5 h-8 text-xs" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-[10px] font-black uppercase text-zinc-600">Bundle</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-zinc-600">Network</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-zinc-600">Cost</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-zinc-600">API (Reseller)</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-zinc-600">Falaa (VIP)</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-zinc-600">Base (Retail)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBundles.map(bundle => {
                      const apiPrice = bundle.bundle_role_prices.find((p: any) => p.role === 'api_user')?.sell_price_ghs || 0;
                      const falaaPrice = bundle.bundle_role_prices.find((p: any) => p.role === 'falaa')?.sell_price_ghs || 0;
                      const basePrice = bundle.bundle_role_prices.find((p: any) => p.role === 'base')?.sell_price_ghs || 0;

                      return (
                        <TableRow key={bundle.id} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell className="font-black text-sm">{formatGb(bundle.gb_size)}</TableCell>
                          <TableCell className="text-[10px] font-black text-[#FFD700] uppercase">{bundle.network}</TableCell>
                          <TableCell className="font-mono text-zinc-500 text-xs">GHS {bundle.cost_price_ghs.toFixed(2)}</TableCell>
                          <TableCell>
                            <RolePriceInput bundleId={bundle.id} role="api_user" defaultValue={apiPrice} cost={bundle.cost_price_ghs} onSave={handlePriceUpdate} />
                          </TableCell>
                          <TableCell>
                            <RolePriceInput bundleId={bundle.id} role="falaa" defaultValue={falaaPrice} cost={bundle.cost_price_ghs} onSave={handlePriceUpdate} />
                          </TableCell>
                          <TableCell>
                            <RolePriceInput bundleId={bundle.id} role="base" defaultValue={basePrice} cost={bundle.cost_price_ghs} onSave={handlePriceUpdate} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RolePriceInput({ bundleId, role, defaultValue, cost, onSave }: any) {
  const [val, setVal] = useState(defaultValue.toFixed(2));
  const isBelowCost = parseFloat(val) < cost;

  return (
    <div className="flex items-center gap-1.5 group">
      <div className="relative">
        <Input 
          type="number" 
          step="0.01" 
          value={val} 
          onChange={e => setVal(e.target.value)} 
          className={cn(
            "h-8 w-20 bg-black/40 border-white/5 text-xs font-bold text-center",
            isBelowCost && "border-red-500 text-red-500"
          )} 
        />
        {isBelowCost && <AlertTriangle size={10} className="absolute -top-1.5 -right-1.5 text-red-500" />}
      </div>
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-8 w-8 text-zinc-600 hover:text-[#FFD700] opacity-0 group-hover:opacity-100" 
        onClick={() => onSave(bundleId, role, parseFloat(val))}
      >
        <Save size={14} />
      </Button>
    </div>
  );
}