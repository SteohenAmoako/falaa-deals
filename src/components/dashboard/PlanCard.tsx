
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, CheckCircle2, Loader2, AlertCircle, CreditCard, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { fulfillDirectOrder, buyBundle } from '@/app/actions/orders';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    size: string;
    price: number;
    description: string;
  };
  userId: string;
  walletBalance: number;
  disabled?: boolean;
  isSKPlug?: boolean;
}

export default function PlanCard({ plan, userId, walletBalance, disabled, isSKPlug }: PlanCardProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'paystack'>('wallet');
  const { toast } = useToast();

  useEffect(() => {
    async function getEmail() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) setUserEmail(session.user.email);
    }
    getEmail();
  }, []);

  const handleInitialClick = () => {
    if (!phone || phone.length < 10) {
      toast({ title: "Invalid Phone", description: "Enter a valid 10-digit number.", variant: "destructive" });
      return;
    }
    const mtnPrefixes = ['024', '054', '055', '059', '025', '053'];
    if (!mtnPrefixes.includes(phone.substring(0, 3))) {
      toast({ title: "MTN Only", description: "Use numbers starting with 024, 054, etc.", variant: "destructive" });
      return;
    }
    setShowConfirm(true);
  };

  const handleProcessOrder = async () => {
    setLoading(true);
    setShowConfirm(false);

    try {
      if (isSKPlug) {
        if (walletBalance < plan.price) {
          toast({ variant: "destructive", title: "Insufficient Funds", description: "Top up your wallet." });
          setLoading(false);
          return;
        }
        const res = await fetch('/api/skplug/buy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, recipient: phone, network: 'MTN', gbSize: plan.size.replace('GB', ''), sellPriceGHS: plan.price })
        });
        const data = await res.json();
        if (data.success) {
          toast({ variant: "success", title: "🎉 Order Placed", description: "SK Plug is processing your data." });
          setPhone('');
        } else {
          toast({ variant: "destructive", title: "Error", description: data.message });
        }
        setLoading(false);
        return;
      }

      if (paymentMethod === 'wallet') {
        const result = await buyBundle(userId, plan.id, phone);
        if (result.success) {
          toast({ variant: "success", title: "🎉 Bundle Activated", description: result.message });
          setPhone('');
        } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
        }
      } else {
        // Paystack logic...
        const response = await fetch('/api/paystack/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: plan.price, email: userEmail, userId: userId }),
        });
        const data = await response.json();
        const PaystackPop = (await import('@paystack/inline-js')).default;
        const paystack = new PaystackPop();
        paystack.newTransaction({
          key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
          email: userEmail,
          amount: Math.round(plan.price * 100),
          currency: 'GHS',
          reference: data.reference,
          onSuccess: async (tx: any) => {
            const result = await fulfillDirectOrder(tx.reference, plan.id, phone, userId);
            if (result.success) toast({ variant: "success", title: "🎉 Order Complete", description: result.message });
          }
        });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className={cn("flex flex-col h-full bg-[#111827] border-white/5 transition-all group overflow-hidden shadow-2xl", !disabled && "hover:border-violet-500/20", disabled && "opacity-60")}>
        <div className="p-4 sm:p-8 pb-0 space-y-1">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{plan.name}</span>
            <CheckCircle2 className="text-violet-500 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-3xl sm:text-5xl font-black text-white tracking-tighter leading-none">{plan.size}</div>
          <p className="text-[10px] text-zinc-500 font-medium uppercase truncate">{plan.description}</p>
        </div>
        <CardContent className="p-4 sm:p-8 space-y-6">
          <div className="text-xl sm:text-2xl font-black text-violet-400">GHS {plan.price.toFixed(2)}</div>
          <div className="space-y-2">
            <Label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Recipient Number</Label>
            <Input 
              placeholder="024 000 0000" 
              className="bg-white/5 border-none h-12 font-bold text-lg focus-visible:ring-violet-600"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              maxLength={10}
            />
          </div>
        </CardContent>
        <CardFooter className="p-4 sm:p-8 pt-0 mt-auto">
          <Button className="w-full h-12 font-black tracking-widest text-xs uppercase bg-violet-600 hover:bg-violet-700 text-white" onClick={handleInitialClick} disabled={loading || disabled}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ACTIVATE'}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-[#111827] border-white/5 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-violet-600" /> Confirmation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-black/30 rounded-2xl p-5 border border-white/5 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-500 uppercase tracking-widest">Recipient</span>
                <span className="font-mono font-bold text-base">{phone}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-500 uppercase tracking-widest">Total Price</span>
                <span className="font-black text-xl">GHS {plan.price.toFixed(2)}</span>
              </div>
            </div>
            {!isSKPlug && (
              <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid gap-3">
                <div className={cn("flex items-center justify-between p-4 rounded-xl border cursor-pointer", paymentMethod === 'wallet' ? "bg-violet-600/10 border-violet-600" : "bg-black/20 border-white/5")} onClick={() => setPaymentMethod('wallet')}>
                  <Label htmlFor="wallet" className="font-bold cursor-pointer">Wallet Balance (GHS {walletBalance.toFixed(2)})</Label>
                  <RadioGroupItem value="wallet" id="wallet" />
                </div>
                <div className={cn("flex items-center justify-between p-4 rounded-xl border cursor-pointer", paymentMethod === 'paystack' ? "bg-primary/10 border-primary" : "bg-black/20 border-white/5")} onClick={() => setPaymentMethod('paystack')}>
                  <Label htmlFor="paystack" className="font-bold cursor-pointer">Paystack (Direct Pay)</Label>
                  <RadioGroupItem value="paystack" id="paystack" />
                </div>
              </RadioGroup>
            )}
            {isSKPlug && <p className="text-[11px] text-zinc-500 text-center">SK Plug orders use wallet balance only.</p>}
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
