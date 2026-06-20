'use client';

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Phone, Zap, Info, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buyBundle } from '@/app/actions/orders';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Bundle } from '@/lib/types';

interface PlanCardProps {
  bundle: Bundle;
  userId: string;
  walletBalance: number;
  disabled?: boolean;
}

export default function PlanCard({ bundle, userId, walletBalance, disabled }: PlanCardProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const { toast } = useToast();

  const handleProcessOrder = async () => {
    if (!phone || phone.length < 10) {
      toast({ title: "Invalid Phone", description: "Enter a valid 10-digit number.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const result = await buyBundle(userId, bundle.id, phone);
      if (result.success) {
        toast({ variant: "success", title: "🎉 Order Complete", description: result.message });
        setPhone('');
        setShowPurchase(false);
      } else {
        toast({ variant: "destructive", title: "Purchase Failed", description: result.message });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "System Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const isAirtelTigo = bundle.network.toUpperCase().startsWith('AT_');
  const isNoExpiry = bundle.network.toUpperCase() === 'AT_NOEXPIRY';

  return (
    <>
      <Card 
        onClick={() => !disabled && setShowPurchase(true)}
        className={cn(
          "flex flex-col bg-[#111118] border-white/5 transition-all cursor-pointer active:scale-95",
          "hover:border-violet-500/40 hover:bg-[#15151f]",
          disabled && "opacity-50 grayscale pointer-events-none"
        )}
      >
        <div className="p-3 sm:p-4 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">
              {bundle.network.replace('AT_', '').replace('_', ' ')}
            </span>
            {isAirtelTigo && (
              <span className={cn(
                "text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full",
                isNoExpiry ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
              )}>
                {isNoExpiry ? 'No Expiry' : 'Expiry'}
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black text-white tracking-tighter truncate">
            {bundle.label}
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-sm sm:text-base font-black text-violet-400">
              GHS {bundle.sell_price_ghs?.toFixed(2)}
            </div>
            <div className="w-6 h-6 rounded-full bg-violet-600/10 flex items-center justify-center">
              <ArrowRight size={12} className="text-violet-500" />
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={showPurchase} onOpenChange={setShowPurchase}>
        <DialogContent className="bg-[#111118] border-white/5 text-white max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-[#FFD700]" /> BUY DATA
            </DialogTitle>
            <DialogDescription className="text-zinc-500 font-medium">
              You are purchasing {bundle.label} for {bundle.network.replace('_', ' ')}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest flex items-center gap-1.5">
                <Phone size={10} className="text-violet-500" /> 
                Recipient Number
              </Label>
              <Input 
                placeholder="e.g. 024 000 0000" 
                className="bg-black/40 border-white/10 h-14 font-black text-2xl placeholder:text-zinc-800 text-white focus:border-violet-600 focus:ring-violet-600/20 text-center"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                autoFocus
              />
            </div>

            <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-2">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-zinc-500 uppercase">Package</span>
                <span className="text-white">{bundle.label}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-zinc-500 uppercase">Total Cost</span>
                <span className="text-[#FFD700]">GHS {bundle.sell_price_ghs?.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
              <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[9px] text-amber-200/60 leading-tight">
                Transactions are instant and irreversible. Please verify the recipient number.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              disabled={loading || phone.length < 10}
              onClick={handleProcessOrder} 
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-black h-14 rounded-xl shadow-xl shadow-violet-600/20 text-sm tracking-widest"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CONFIRM PURCHASE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}