'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  RefreshCw, Save, Loader2, AlertTriangle, ShieldCheck, Search, ChevronLeft, Zap
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { syncBundlesFromSkPlug, syncBundlesFromDakazina, syncBundlesFromDiceConsult, updateBundleRolePrice, applyBulkMarkup } from '@/app/actions/bundles';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';

function RolePriceInput({ bundleId, role, defaultValue, cost, onSave }: any) {
  const [val, setVal] = useState(defaultValue ? Number(defaultValue).toFixed(2) : '0.00');
  const isBelowCost = parseFloat(val) < cost;

  return (
    <div className="flex items-center gap-1 group">
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
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-7 w-7 text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100" 
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
    const { data } = await supabase.from('bundles').select('*, bundle_role_prices(*)');
    if (data) setBundles(data);
    setLoading(false);
  };

  const handleSync = async (type: string) => {
    setSyncing(type);
    let res: any;
    if (type === 'skplug') res = await syncBundlesFromSkPlug();
    else if (type === 'dakazina') res = await syncBundlesFromDakazina();
    else if (type === 'diceconsult') res = await syncBundlesFromDiceConsult();

    if (res.success) {
      toast({ title: "Sync Complete", description: `Updated ${res.count} bundles.` });
      fetchPricingData();
    }
    setSyncing(null);
  };

  const handlePriceUpdate = async (bundleId: string, role: UserRole, price: number) => {
    const res = await updateBundleRolePrice(bundleId, role, price);
    if (res.success) toast({ title: "Price Saved" });
  };

  const handleApplyMarkup = async () => {
    setMarkupLoading(true);
    const res = await applyBulkMarkup(markupRole, parseFloat(markupPercent));
    if (res.success) {
      toast({ title: "Markup Applied" });
      fetchPricingData();
    }
    setMarkupLoading(false);
  };

  const filteredBundles = bundles.filter(b => b.network.toLowerCase().includes(searchQuery.toLowerCase()) || b.label.toLowerCase().includes(searchQuery.toLowerCase()) || b.provider.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => a.provider.localeCompare(b.provider) || a.network.localeCompare(b.network) || a.gb_size - b.gb_size);

  if (loading) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center"><Loader2 className="animate-spin text-[#FFD700]" /></div>;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-4 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <button onClick={() => router.push('/falaadealsadminurl$$')} className="text-zinc-500 hover:text-white flex items-center gap-1 text-xs font-bold uppercase mb-2"><ChevronLeft size={14} /> Back</button>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3"><ShieldCheck className="text-[#FFD700]" /> Pricing Manager</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => handleSync('skplug')} disabled={!!syncing} className="bg-blue-600 font-bold h-10 px-4 text-[10px] uppercase">{syncing === 'skplug' ? <Loader2 className="animate-spin" /> : <RefreshCw size={14} className="mr-2" />} SK Sync</Button>
            <Button onClick={() => handleSync('dakazina')} disabled={!!syncing} className="bg-violet-600 font-bold h-10 px-4 text-[10px] uppercase">{syncing === 'dakazina' ? <Loader2 className="animate-spin" /> : <Zap size={14} className="mr-2" />} Dakazina Sync</Button>
            <Button onClick={() => handleSync('diceconsult')} disabled={!!syncing} className="bg-emerald-600 font-bold h-10 px-4 text-[10px] uppercase">{syncing === 'diceconsult' ? <Loader2 className="animate-spin" /> : <Zap size={14} className="mr-2" />} DiceConsult Sync</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="bg-[#111111] border-white/5 h-fit p-4 space-y-4">
            <CardTitle className="text-xs font-black uppercase text-zinc-500">Bulk Markup</CardTitle>
            <select value={markupRole} onChange={e => setMarkupRole(e.target.value as UserRole)} className="w-full h-10 bg-black/40 border-white/5 rounded-md px-3 text-xs font-bold"><option value="base">Retail</option><option value="falaa">VIP</option><option value="api_user">API</option></select>
            <Input type="number" value={markupPercent} onChange={e => setMarkupPercent(e.target.value)} className="bg-black/40 border-white/5 h-10 text-xs font-black" />
            <Button onClick={handleApplyMarkup} disabled={markupLoading} className="w-full bg-[#FFD700] text-black font-black uppercase text-[10px] h-10">Apply</Button>
          </Card>

          <Card className="bg-[#111111] border-white/5 lg:col-span-3">
            <CardHeader className="p-4 border-b border-white/5 flex flex-row items-center justify-between"><CardTitle className="text-xs font-black uppercase text-zinc-500">Catalog</CardTitle><Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-48 bg-black/20 border-white/5 h-8 text-xs" /></CardHeader>
            <Table>
              <TableHeader><TableRow className="border-white/5"><TableHead className="text-[9px] font-black uppercase px-4">Provider / Net</TableHead><TableHead className="text-[9px] font-black uppercase px-4">Size</TableHead><TableHead className="text-[9px] font-black uppercase px-4">Cost</TableHead><TableHead className="text-[9px] font-black uppercase px-4">API</TableHead><TableHead className="text-[9px] font-black uppercase px-4">VIP</TableHead><TableHead className="text-[9px] font-black uppercase px-4">Retail</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredBundles.map(bundle => {
                  const api = bundle.bundle_role_prices?.find((p: any) => p.role === 'api_user')?.sell_price_ghs || 0;
                  const vip = bundle.bundle_role_prices?.find((p: any) => p.role === 'falaa')?.sell_price_ghs || 0;
                  const base = bundle.bundle_role_prices?.find((p: any) => p.role === 'base')?.sell_price_ghs || 0;
                  return (
                    <TableRow key={bundle.id} className="border-white/5 h-14">
                      <TableCell className="px-4"><div className="text-[7px] font-black uppercase bg-white/5 w-fit px-1 mb-1">{bundle.provider}</div><div className="text-[10px] font-black text-white uppercase">{bundle.network}</div></TableCell>
                      <TableCell className="font-black text-xs px-4">{bundle.label}</TableCell>
                      <TableCell className="font-black text-zinc-500 text-[10px] px-4">{bundle.cost_price_ghs.toFixed(2)}</TableCell>
                      <TableCell className="px-2"><RolePriceInput bundleId={bundle.id} role="api_user" defaultValue={api} cost={bundle.cost_price_ghs} onSave={handlePriceUpdate} /></TableCell>
                      <TableCell className="px-2"><RolePriceInput bundleId={bundle.id} role="falaa" defaultValue={vip} cost={bundle.cost_price_ghs} onSave={handlePriceUpdate} /></TableCell>
                      <TableCell className="px-2"><RolePriceInput bundleId={bundle.id} role="base" defaultValue={base} cost={bundle.cost_price_ghs} onSave={handlePriceUpdate} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
