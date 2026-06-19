
'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
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
  const { toast } = useToast();

  const handleInitialClick = () => {
    if (!phone || phone.length < 10) {
      toast({ title: "Invalid Phone", description: "Enter a valid 10-digit number.", variant: "destructive" });
      return;
    }
    const validPrefixes = ['024', '054', '055', '059', '025', '053', '020', '050', '027', '057', '026', '056'];
    if (!validPrefixes.includes(phone.substring(0, 3))) {
      toast({ title: "Invalid Network", description: "Please use a supported Ghana network prefix.", variant: "destructive" });
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
        toast({ variant: "success", title: "Order Complete", description: result.message });
        setPhone('');
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className={cn("flex flex-col h-full bg-[#1e1e2d] border-white/5 transition-all group overflow-hidden shadow-xl", !disabled && "hover:border-violet-500/40", disabled && "opacity-60")}>
        <div className="p-4 space-y-1">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{bundle.network}</span>
            <CheckCircle2 className="text-violet-500 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-2xl font-black text-white tracking-tighter">{bundle.label}</div>
        </div>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="text-xl font-black text-violet-400">GHS {bundle.sell_price_ghs?.toFixed(2)}</div>
          <div className="space-y-1.5">
            <Label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Phone Number</Label>
            <Input 
              placeholder="024 000 0000" 
              className="bg-black/20 border-white/5 h-10 font-bold text-base placeholder:text-zinc-700"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              maxLength={10}
            />
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 mt-auto">
          <Button className="w-full h-10 font-black tracking-widest text-[10px] uppercase bg-violet-600 hover:bg-violet-700 text-white" onClick={handleInitialClick} disabled={loading || disabled}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'BUY NOW'}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-[#111118] border-white/5 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-violet-500" /> Confirm Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-500 uppercase">Bundle</span>
                <span className="font-black text-white">{bundle.label}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-500 uppercase">Recipient</span>
                <span className="font-mono font-bold">{phone}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5">
                <span className="font-bold text-zinc-500 uppercase">Deduct Wallet</span>
                <span className="font-black text-violet-400 text-lg">GHS {bundle.sell_price_ghs?.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 text-center italic">Payment is non-refundable once data is sent.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={handleProcessOrder} className="bg-violet-600 hover:bg-violet-700 text-white font-black px-8">PAY NOW</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
