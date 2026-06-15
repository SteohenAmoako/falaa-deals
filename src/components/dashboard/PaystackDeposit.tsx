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

interface PaystackDepositProps {
  userEmail: string;
  userId: string;
  disabled?: boolean;
}

export default function PaystackDeposit({ userEmail, userId, disabled }: PaystackDepositProps) {
  const [amount, setAmount] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
        // Redirect to Paystack Gateway
        window.location.href = data.authorization_url;
      } else {
        throw new Error(data.error || 'Failed to initialize payment');
      }
    } catch (err: any) {
      console.error('Paystack Initialization Error:', err);
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
            {loading ? 'REDIRECTING...' : 'PROCEED TO PAY'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}