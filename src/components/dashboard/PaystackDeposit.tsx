
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
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

interface PaystackDepositProps {
  userEmail: string;
  userId: string;
}

export default function PaystackDeposit({ userEmail, userId }: PaystackDepositProps) {
  const [amount, setAmount] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          email: userEmail,
          userId: userId
        }),
      });

      const data = await response.json();

      if (data.authorization_url) {
        // Redirect to Paystack Checkout
        window.location.href = data.authorization_url;
      } else {
        throw new Error(data.error || 'Failed to initialize payment');
      }
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
        <Button className="w-full gap-2 font-semibold shadow-lg shadow-primary/20">
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
              min="5"
              max="500"
              className="bg-background/50 border-white/5 h-12 text-lg font-bold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleFundWallet} 
            className="w-full h-12 font-bold text-lg"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
            {loading ? 'INITIALIZING...' : 'PROCEED TO PAY'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
