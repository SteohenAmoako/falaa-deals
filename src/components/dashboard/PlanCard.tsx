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
}

export default function PlanCard({ plan, userId, walletBalance, disabled }: PlanCardProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'paystack'>('paystack');
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
      toast({ 
        title: "Invalid Phone", 
        description: "Please enter a valid 10-digit phone number.", 
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
      if (paymentMethod === 'wallet') {
        if (walletBalance < plan.price) {
          toast({ title: "Insufficient Balance", description: "Top up your wallet or use Paystack.", variant: "destructive" });
          setLoading(false);
          return;
        }

        const result = await buyBundle(userId, plan.id, phone);
        if (result.success) {
          toast({ title: "Success", description: result.message });
          setPhone('');
        } else {
          toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setLoading(false);
      } else {
        // Paystack Inline Flow
        const response = await fetch('/api/paystack/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: plan.price,
            email: userEmail,
            userId: userId
          }),
        });

        const data = await response.json();
        if (!data.reference) throw new Error(data.error || 'Failed to initialize payment');

        const PaystackPop = (await import('@paystack/inline-js')).default;
        const paystack = new PaystackPop();
        
        paystack.newTransaction({
          key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
          email: userEmail,
          amount: Math.round(plan.price * 100),
          currency: 'GHS',
          reference: data.reference,
          onSuccess: async (transaction: any) => {
            toast({ title: "Payment Verified", description: "Fulfilling your data order..." });
            const result = await fulfillDirectOrder(transaction.reference, plan.id, phone, userId);
            if (result.success) {
              toast({ title: "Order Complete", description: result.message });
              setPhone('');
            } else {
              toast({ title: "Fulfillment Failed", description: result.message, variant: "destructive" });
            }
            setLoading(false);
          },
          onCancel: () => {
            toast({ title: "Payment Cancelled", description: "Transaction was not completed." });
            setLoading(false);
          }
        });
      }
    } catch (err: any) {
      console.error('Order Process Error:', err);
      toast({ title: "Error", description: err.message || "An unexpected error occurred", variant: "destructive" });
      setLoading(false);
    }
  };

  const isHighlighted = phone.length >= 10;

  return (
    <>
      <Card className={cn(
        "flex flex-col h-full bg-[#111827] border-white/5 transition-all group overflow-hidden shadow-2xl",
        !disabled && "hover:border-primary/20",
        disabled && "opacity-60 grayscale cursor-not-allowed"
      )}>
        <div className="p-3 sm:p-8 pb-0 space-y-0.5 sm:space-y-1">
          <div className="flex justify-between items-start">
            <span className="text-[9px] sm:text-sm font-bold text-muted-foreground/80">{plan.name}</span>
            <CheckCircle2 className="text-primary w-3 h-3 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-2xl sm:text-5xl font-black text-foreground tracking-tighter leading-none">{plan.size}</div>
          <p className="text-[8px] sm:text-xs text-muted-foreground font-medium uppercase tracking-tight truncate">{plan.description}</p>
        </div>
        
        <CardContent className="p-3 sm:p-8 space-y-4 sm:space-y-8">
          <div className="text-sm sm:text-2xl font-black text-accent tracking-tight">GHS {plan.price.toFixed(2)}</div>
          
          <div className="space-y-2">
            <Label htmlFor={`phone-${plan.id}`} className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-[0.1em] sm:tracking-[0.2em]">RECIPIENT NUMBER</Label>
            <div className="relative">
              <div className={cn(
                "absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 transition-colors z-10",
                isHighlighted ? "text-primary" : "text-muted-foreground/50"
              )}>
                <Smartphone className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
              <Input 
                id={`phone-${plan.id}`}
                placeholder="024 000 0000" 
                className={cn(
                  "pl-7 sm:pl-11 h-9 sm:h-14 font-bold text-xs sm:text-lg transition-all border-none ring-offset-transparent focus-visible:ring-0",
                  isHighlighted 
                    ? "bg-[#dbeafe] text-black" 
                    : "bg-black/40 text-white placeholder:text-zinc-800"
                )}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                disabled={loading || disabled}
                maxLength={10}
              />
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="p-3 sm:p-8 pt-0 mt-auto">
          <Button 
            className="w-full h-9 sm:h-14 font-black tracking-normal sm:tracking-widest text-[9px] sm:text-sm uppercase bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/10 rounded-lg sm:rounded-xl" 
            onClick={handleInitialClick}
            disabled={loading || disabled}
          >
            {loading ? (
              <Loader2 className="w-3 h-3 sm:w-5 sm:h-5 animate-spin" />
            ) : (
              'ACTIVATE'
            )}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-[#111827] border-white/5 sm:max-w-md text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Confirmation
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              Confirm recipient and choose your preferred payment method.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 my-2">
            <div className="bg-black/30 rounded-2xl p-5 border border-white/5 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-500 uppercase tracking-widest">Recipient</span>
                <span className="font-mono font-bold text-base text-white">{phone}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-500 uppercase tracking-widest">Plan</span>
                <span className="font-black text-base text-primary">{plan.size}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="font-bold text-zinc-500 uppercase tracking-widest">Total Price</span>
                <span className="font-black text-xl text-white">GHS {plan.price.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Select Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid gap-3">
                <div 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                    paymentMethod === 'wallet' ? "bg-violet-600/10 border-violet-600" : "bg-black/20 border-white/5"
                  )}
                  onClick={() => setPaymentMethod('wallet')}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="wallet" id="wallet" className="border-zinc-700" />
                    <div>
                      <Label htmlFor="wallet" className="font-bold text-sm block cursor-pointer">Wallet Balance</Label>
                      <span className="text-[10px] text-zinc-500 font-medium">Current: GHS {walletBalance.toFixed(2)}</span>
                    </div>
                  </div>
                  <Wallet className={cn("w-5 h-5", paymentMethod === 'wallet' ? "text-violet-400" : "text-zinc-700")} />
                </div>

                <div 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                    paymentMethod === 'paystack' ? "bg-primary/10 border-primary" : "bg-black/20 border-white/5"
                  )}
                  onClick={() => setPaymentMethod('paystack')}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="paystack" id="paystack" className="border-zinc-700" />
                    <div>
                      <Label htmlFor="paystack" className="font-bold text-sm block cursor-pointer">Direct Paystack</Label>
                      <span className="text-[10px] text-zinc-500 font-medium">MoMo / Card / Bank</span>
                    </div>
                  </div>
                  <CreditCard className={cn("w-5 h-5", paymentMethod === 'paystack' ? "text-primary" : "text-zinc-700")} />
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" onClick={() => setShowConfirm(false)} className="font-bold text-zinc-400 hover:text-white">Cancel</Button>
            <Button onClick={handleProcessOrder} className="bg-primary hover:bg-primary/90 text-white font-black px-8">
              {paymentMethod === 'wallet' ? 'USE WALLET' : 'PAY NOW'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
