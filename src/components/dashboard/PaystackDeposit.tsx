
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from 'next/navigation';

interface PaystackDepositProps {
  userEmail: string;
  userId: string;
  disabled?: boolean;
}

export default function PaystackDeposit({ userEmail, userId, disabled }: PaystackDepositProps) {
  const [amount, setAmount] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleFundWallet = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 5) {
      toast({ title: "Invalid Amount", description: "Minimum deposit is GHS 5.", variant: "destructive" });
      return;
    }
    if (parsedAmount > 500) {
      toast({ title: "Limit Exceeded", description: "Maximum single deposit is GHS 500.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // 1. Initialize on our server
      const initResponse = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          email: userEmail,
          userId: userId
        }),
      });

      const initData = await initResponse.json();

      if (!initData.reference) {
        throw new Error(initData.error || 'Failed to initialize payment');
      }

      // 2. Load Paystack Inline
      const PaystackPop = (await import('@paystack/inline-js')).default;
      const paystack = new PaystackPop();
      
      paystack.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email: userEmail,
        amount: Math.round(parsedAmount * 100),
        currency: 'GHS',
        ref: initData.reference,
        onSuccess: (transaction: any) => {
          setIsDialogOpen(false);
          setLoading(false);
          router.push(`/payment/verify?reference=${transaction.reference}`);
        },
        onCancel: () => {
          setLoading(false);
          toast({ title: "Cancelled", description: "Payment was cancelled." });
        },
        metadata: {
          user_id: userId
        }
      });

    } catch (err: any) {
      console.error(err);
      toast({ 
        title: "Payment Error", 
        description: err.message || "Could not start payment process.", 
        variant: "destructive" 
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          type="button"
          className="w-full gap-2 font-semibold shadow-lg shadow-primary/20 relative z-20" 
          disabled={disabled}
        >
          <RefreshCw className="w-4 h-4" /> Fund Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-white/5">
        <DialogHeader>
          <DialogTitle>Fund Your Wallet</DialogTitle>
          <DialogDescription>
            Enter the amount to deposit (GHS 5 - 500).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount" className="text-xs uppercase font-bold text-muted-foreground">Amount (GHS)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="20.00"
              className="bg-background/50 border-white/5 h-12 text-lg font-bold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            type="button"
            onClick={handleFundWallet} 
            className="w-full h-12 font-bold text-lg"
            disabled={loading || !amount}
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
            {loading ? 'INITIALIZING...' : 'PROCEED TO PAY'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
