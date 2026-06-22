'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  PackageSearch, RefreshCw, Save, Loader2, AlertTriangle, ShieldCheck, Search, ChevronLeft, Zap
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { syncBundlesFromSkPlug, syncBundlesFromDakazina, updateBundleRolePrice, applyBulkMarkup } from '@/app/actions/bundles';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';

function RolePriceInput({ bundleId, role, defaultValue, cost, onSave }: any) {
  const [val, setVal] = useState(defaultValue ? Number(defaultValue).toFixed(2) : '0.00');
  const isBelowCost = parseFloat(val) < cost;

  return (
    <div className="flex items-center gap-1 group">
      <div className="relative">
        <Input 
          type="number" 
          step="0.01" 
          value={val} 
          onChange={e => setVal(e.target.value)} 
          className={cn(
            "h-8 w-16 bg-black/40 border-white/5 text-[10px] font-black text-center p-0 px-1",
            isBelowCost ? "border-red-500/50 text-red-400" : "text-emerald-400"
          )} 
        />
        {isBelowCost && (
          <div className="absolute -top-1 -right-1">
            <AlertTriangle size={8} className="text-red-500" />
          </div>
        )}
      </div>
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-7 w-7 text-zinc-600 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" 
        onClick={() => onSave(bundleId, role, parseFloat(val))}
      >
        <Save size={12} />
      </Button>
    </div>
  );
}

export default function PricingPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
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

  const handleSyncSkPlug = async () => {
    setSyncing('skplug');
    const res = await syncBundlesFromSkPlug();
    if (res.success) {
      toast({ title: "SK Sync Complete", description: `Added/Updated ${res.count} bundles.` });
      fetchPricingData();
    }
    setSyncing(null);
  };

  const handleSyncDakazina = async () => {
    setSyncing('dakazina');
    const res = await syncBundlesFromDakazina();
    if (res.success) {
      toast({ title: "Dakazina Sync Complete", description: `Added/Updated ${res.count} bundles.` });
      fetchPricingData();
    }
    setSyncing(null);
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
      toast({ title: "Markup Applied", description: `Updated all ${markupRole} prices.` });
      fetchPricingData();
    }
    setMarkupLoading(false);
  };

  const filteredBundles = bundles.filter(b => 
    b.network.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.provider.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
    if (a.network !== b.network) return a.network.localeCompare(b.network);
    return a.gb_size - b.gb_size;
  });

  const formatGbValue = (gb: any) => {
    return parseFloat(gb.toString()).toString() + 'GB';
  };

  if (loading) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center"><Loader2 className="animate-spin text-[#FFD700]" /></div>;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-4 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <button onClick={() => router.push('/falaadealsadminurl$$')} className="text-zinc-500 hover:text-white flex items-center gap-1 text-xs font-bold uppercase mb-2">
              <ChevronLeft size={14} /> Back to Dashboard
            </button>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-3">
              <ShieldCheck className="text-[#FFD700]" />
              Role Pricing Manager
            </h1>
            <p className="text-zinc-500 text-xs lg:text-sm">Manage cost-to-selling ratios for all customer tiers across all providers.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleSyncSkPlug} disabled={!!syncing} className="bg-blue-600 hover:bg-blue-700 font-bold h-10 px-4 text-[10px] uppercase">
              {syncing === 'skplug' ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw size={14} className="mr-2" />}
              Sync SK Plug
            </Button>
            <Button onClick={handleSyncDakazina} disabled={!!syncing} className="bg-violet-600 hover:bg-violet-700 font-bold h-10 px-4 text-[10px] uppercase">
              {syncing === 'dakazina' ? <Loader2 className="animate-spin mr-2" /> : <Zap size={14} className="mr-2" />}
              Sync Dakazina
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="bg-[#111111] border-white/5 lg:col-span-1 h-fit">
            <CardHeader><CardTitle className="text-xs font-black uppercase text-zinc-500 tracking-widest">Markup Engine</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Target Tier</label>
                <select value={markupRole} onChange={e => setMarkupRole(e.target.value as UserRole)} className="w-full h-10 bg-black/40 border-white/5 rounded-md px-3 text-xs font-bold">
                  <option value="base">Base (Retail)</option>
                  <option value="falaa">VIP (Falaa)</option>
                  <option value="api_user">API (Resellers)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Markup %</label>
                <Input type="number" value={markupPercent} onChange={e => setMarkupPercent(e.target.value)} className="bg-black/40 border-white/5 h-10 text-xs font-black" />
              </div>
              <Button onClick={handleApplyMarkup} disabled={markupLoading} className="w-full bg-[#FFD700] text-black font-black uppercase text-[10px] h-10 tracking-widest shadow-lg shadow-[#FFD700]/10">
                {markupLoading ? <Loader2 className="animate-spin" /> : "Apply Markup"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-white/5 lg:col-span-3">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-white/5">
              <CardTitle className="text-xs font-black uppercase text-zinc-500 tracking-widest">Package Catalog ({filteredBundles.length})</CardTitle>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                <Input placeholder="Filter catalog..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-black/20 border-white/5 h-9 text-xs" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-[#111111] z-10">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-[9px] font-black uppercase text-zinc-600 h-10 px-4">Provider / Net</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-zinc-600 h-10 px-4">Size</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-zinc-600 h-10 px-4">Cost</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-zinc-600 h-10 px-4">API</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-zinc-600 h-10 px-4">VIP</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-zinc-600 h-10 px-4">Retail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBundles.map(bundle => {
                      const apiPrice = bundle.bundle_role_prices?.find((p: any) => p.role === 'api_user')?.sell_price_ghs || 0;
                      const falaaPrice = bundle.bundle_role_prices?.find((p: any) => p.role === 'falaa')?.sell_price_ghs || 0;
                      const basePrice = bundle.bundle_role_prices?.find((p: any) => p.role === 'base')?.sell_price_ghs || 0;

                      return (
                        <TableRow key={bundle.id} className="border-white/5 hover:bg-white/5 transition-colors h-14">
                          <TableCell className="px-4">
                            <div className="flex flex-col">
                              <span className={cn(
                                "text-[7px] font-black uppercase px-1 py-0 rounded w-fit mb-0.5",
                                bundle.provider === 'skplug' ? 'bg-blue-500/10 text-blue-400' : 'bg-violet-500/10 text-violet-400'
                              )}>
                                {bundle.provider}
                              </span>
                              <span className="text-[10px] font-black text-white uppercase">{bundle.network}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-black text-xs px-4">{formatGbValue(bundle.gb_size)}</TableCell>
                          <TableCell className="font-black text-zinc-500 text-[10px] px-4">GHS {bundle.cost_price_ghs ? Number(bundle.cost_price_ghs).toFixed(2) : '0.00'}</TableCell>
                          <TableCell className="px-2">
                            <RolePriceInput bundleId={bundle.id} role="api_user" defaultValue={apiPrice} cost={bundle.cost_price_ghs} onSave={handlePriceUpdate} />
                          </TableCell>
                          <TableCell className="px-2">
                            <RolePriceInput bundleId={bundle.id} role="falaa" defaultValue={falaaPrice} cost={bundle.cost_price_ghs} onSave={handlePriceUpdate} />
                          </TableCell>
                          <TableCell className="px-2">
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
