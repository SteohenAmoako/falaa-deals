'use client';

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone, Zap, Info, ArrowRight, AlertTriangle } from "lucide-react";
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
        toast({ variant: "success", title: "Order Complete", description: result.message });
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

  const isAirtelTigo = bundle.network.toUpperCase().startsWith('AT_') || bundle.network.toUpperCase().includes('AIRTEL') || bundle.network.toUpperCase().includes('ISHARE') || bundle.network.toUpperCase().includes('BIGTIME');
  
  const formattedGb = parseFloat(bundle.gb_size.toString()).toString() + 'GB';

  return (
    <>
      <Card 
        onClick={() => !disabled && setShowPurchase(true)}
        className={cn(
          "flex flex-col bg-[#111118] border-white/5 transition-all cursor-pointer active:scale-95 group overflow-hidden",
          "hover:border-violet-500/40 hover:bg-[#15151f]",
          disabled && "opacity-50 grayscale pointer-events-none"
        )}
      >
        <div className="p-3 sm:p-4 space-y-1">
          <div className="flex justify-between items-center h-4">
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest truncate">
              {bundle.network.replace('AT_', '').replace('_', ' ')}
            </span>
          </div>
          
          <div className="pt-2">
            <div className="text-xl sm:text-2xl font-black text-white tracking-tighter leading-none">
              {formattedGb}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs sm:text-sm font-black text-violet-400">
                GHS {bundle.sell_price_ghs?.toFixed(2)}
              </div>
              <div className="w-5 h-5 rounded-full bg-violet-600/10 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                <ArrowRight size={10} />
              </div>
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
            <DialogDescription className="text-zinc-500 font-medium text-[11px] leading-tight">
              Please review the mandatory usage guidelines below before confirming your purchase.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Important Disclaimer</span>
              </div>
              <p className="text-[10px] text-zinc-300 font-medium leading-relaxed">
                This package is strictly for <strong className="text-white">existing customers</strong> who have previously purchased the <strong className="text-[#FFD700]">MTNUP2U</strong> package. If the number has never bought this before, it will not arrive. Note that delivery may be delayed as MTN has made everything complicated. <strong className="text-red-400">Read carefully before you buy.</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest flex items-center gap-1.5">
                <Phone size={10} className="text-violet-500" /> 
                Recipient Number
              </Label>
              <Input 
                placeholder="024XXXXXXX" 
                className="bg-black/40 border-white/10 h-12 font-black text-xl placeholder:text-zinc-800 text-white focus:border-violet-600 text-center"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                autoFocus
              />
            </div>

            <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-1">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-zinc-500 uppercase">Package</span>
                <span className="text-white">{formattedGb}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-zinc-500 uppercase">Total Cost</span>
                <span className="text-[#FFD700]">GHS {bundle.sell_price_ghs?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              disabled={loading || phone.length < 10}
              onClick={handleProcessOrder} 
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-black h-12 rounded-xl text-xs tracking-widest"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CONFIRM PURCHASE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
