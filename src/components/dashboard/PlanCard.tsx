
'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2, Phone, ArrowRight, Zap, Info } from "lucide-react";
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const handleInitialClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      return;
    }

    if (!phone || phone.length < 10) {
      toast({ title: "Invalid Phone", description: "Enter a valid 10-digit number.", variant: "destructive" });
      return;
    }

    const mtnPrefixes = ['024', '054', '055', '059', '025', '053'];
    const telecelPrefixes = ['020', '050'];
    const airtelTigoPrefixes = ['027', '057', '026', '056'];

    const net = bundle.network.toUpperCase();
    let isValid = false;
    let requiredNetwork = "";

    if (net === 'MTN') {
      isValid = mtnPrefixes.includes(phone.substring(0, 3));
      requiredNetwork = "MTN";
    } else if (net === 'TELECEL') {
      isValid = telecelPrefixes.includes(phone.substring(0, 3));
      requiredNetwork = "Telecel";
    } else if (net.startsWith('AT_')) {
      isValid = airtelTigoPrefixes.includes(phone.substring(0, 3));
      requiredNetwork = "AirtelTigo";
    }

    if (!isValid) {
      toast({ 
        title: "Network Mismatch", 
        description: `This bundle is for ${requiredNetwork}. Please enter a valid ${requiredNetwork} number.`, 
        variant: "destructive" 
      });
      return;
    }

    setShowConfirm(true);
  };

  const handleProcessOrder = async () => {
    setLoading(true);
    setShowConfirm(false);

    try {
      const result = await buyBundle(userId, bundle.id, phone);
      if (result.success) {
        toast({ variant: "success", title: "🎉 Order Complete", description: result.message });
        setPhone('');
        setIsExpanded(false);
      } else {
        toast({ variant: "destructive", title: "Purchase Failed", description: result.message });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "System Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const isNoExpiry = bundle.network.toUpperCase() === 'AT_NOEXPIRY';
  const isAirtelTigo = bundle.network.toUpperCase().startsWith('AT_');

  return (
    <>
      <Card className={cn(
        "flex flex-col h-full bg-[#111118] border-white/5 transition-all group overflow-hidden shadow-2xl relative",
        !disabled && "hover:border-violet-500/40",
        isExpanded && "border-violet-600/60 ring-1 ring-violet-600/20",
        disabled && "opacity-50 grayscale pointer-events-none"
      )}>
        {isAirtelTigo && (
          <div className={cn(
            "absolute top-0 right-0 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-bl-lg",
            isNoExpiry ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
          )}>
            {isNoExpiry ? 'No Expiry' : 'Expiry'}
          </div>
        )}

        <div className="p-6 space-y-1">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{bundle.network.replace('_', ' ')}</span>
            <Zap className={cn("w-4 h-4 transition-colors", isExpanded ? "text-violet-500" : "text-zinc-700")} />
          </div>
          <div className="text-3xl font-black text-white tracking-tighter">{bundle.label}</div>
          <div className="text-xl font-black text-violet-400 mt-2">GHS {bundle.sell_price_ghs?.toFixed(2)}</div>
        </div>

        <CardContent className={cn("p-6 pt-0 space-y-5 transition-all duration-300", isExpanded ? "opacity-100" : "opacity-0 h-0 p-0 overflow-hidden")}>
          <div className="space-y-2">
            <Label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest flex items-center gap-1.5">
              <Phone size={10} className="text-violet-500" /> 
              Recipient Number
            </Label>
            <div className="relative">
              <Input 
                placeholder="e.g. 024 000 0000" 
                className="bg-black/40 border-white/10 h-12 font-black text-lg placeholder:text-zinc-800 text-white focus:border-violet-600 focus:ring-violet-600/20 transition-all"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
              />
            </div>
            <p className="text-[9px] text-zinc-500 font-medium">Please double check the number. No refunds for wrong entries.</p>
          </div>
        </CardContent>

        <CardFooter className="p-6 pt-0 mt-auto">
          <Button 
            className={cn(
              "w-full h-12 font-black tracking-[0.1em] text-xs uppercase transition-all duration-300",
              isExpanded ? "bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-600/20" : "bg-white/5 hover:bg-white/10 text-white border border-white/5"
            )} 
            onClick={handleInitialClick} 
            disabled={loading || disabled}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <span className="flex items-center gap-2">
                {isExpanded ? 'PROCEED TO PAY' : 'SELECT PACKAGE'}
                <ArrowRight size={14} className={cn("transition-transform", isExpanded && "rotate-0", !isExpanded && "-rotate-45")} />
              </span>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-[#111118] border-white/5 text-white max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" /> CONFIRM
            </DialogTitle>
            <DialogDescription className="text-zinc-500 font-medium">Verify your order details before processing.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-black/60 rounded-2xl p-6 border border-white/5 space-y-4 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-zinc-500 uppercase">Package</span>
                <span className="font-black text-white text-lg">{bundle.label}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-zinc-500 uppercase">Network</span>
                <span className="font-black text-violet-400 text-sm uppercase tracking-widest">{bundle.network.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-zinc-500 uppercase">Recipient</span>
                <span className="font-mono font-black text-white text-lg tracking-tighter">{phone}</span>
              </div>
              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] font-black text-zinc-500 uppercase">Total Cost</span>
                <span className="font-black text-[#FFD700] text-2xl">GHS {bundle.sell_price_ghs?.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
              <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[9px] text-amber-200/60 leading-tight">Data delivery is usually instant. Ensure the recipient number is correct as transactions cannot be reversed.</p>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="ghost" className="font-bold text-zinc-500 hover:text-white" onClick={() => setShowConfirm(false)}>CANCEL</Button>
            <Button onClick={handleProcessOrder} className="bg-violet-600 hover:bg-violet-700 text-white font-black px-8 py-6 rounded-xl shadow-xl shadow-violet-600/20">PAY NOW</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
