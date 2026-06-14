'use client';

import { useState, useEffect } from 'react';
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
import { usePaystackPayment } from 'react-paystack';
import { supabase } from '@/lib/supabase';

interface PaystackDepositProps {
  userEmail: string;
  userId: string;
}

export default function PaystackDeposit({ userEmail, userId }: PaystackDepositProps) {
  const [amount, setAmount] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const config = {
    reference: `PAY-${new Date().getTime()}-${Math.floor(Math.random() * 1000000)}`,
    email: userEmail || 'customer@example.com',
    amount: parseFloat(amount) * 100, // Paystack works in pesewas
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
    currency: 'GHS',
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = async (reference: any) => {
    setLoading(true);
    try {
      const depositAmount = parseFloat(amount);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, wallet_balance')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: (profile.wallet_balance || 0) + depositAmount })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await supabase.from('wallet_transactions').insert({
        user_id: userId,
        amount: depositAmount,
        type: 'credit',
        reference: reference.reference,
        description: `Paystack Deposit (Ref: ${reference.reference})`,
      });

      toast({ 
        title: "Deposit Successful", 
        description: `GHS ${depositAmount} has been added to your wallet.` 
      });
      
      setIsDialogOpen(false);
      setAmount('');
      window.location.reload(); 
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: "Update Failed", 
        description: "Payment successful but balance update failed. Contact support.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const onClose = () => {
    toast({ 
      title: "Payment Cancelled", 
      description: "You closed the payment window.",
      variant: "destructive"
    });
  };

  const handlePaystackClick = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }
    initializePayment(onSuccess, onClose);
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
            Enter the amount you wish to deposit.
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
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handlePaystackClick} 
            className="w-full h-12 font-bold text-lg"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
            PAY WITH PAYSTACK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}