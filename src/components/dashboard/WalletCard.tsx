
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Copy, RefreshCw, Smartphone, CreditCard, Loader2 } from "lucide-react";
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

interface WalletCardProps {
  balance: number;
  referenceCode: string;
}

export default function WalletCard({ balance, referenceCode }: WalletCardProps) {
  const [amount, setAmount] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    }
    getUser();
  }, []);

  const config = {
    reference: `PAY-${new Date().getTime()}-${Math.floor(Math.random() * 1000000)}`,
    email: userEmail || 'customer@example.com',
    amount: parseFloat(amount) * 100, // Paystack works in kobo/pesewas
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
    currency: 'GHS',
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = async (reference: any) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      // Update wallet balance in Supabase
      const depositAmount = parseFloat(amount);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, wallet_balance')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) throw profileError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: (profile.wallet_balance || 0) + depositAmount })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      // Record transaction
      await supabase.from('wallet_transactions').insert({
        user_id: session.user.id,
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
      // In a real app, you might want to trigger a data revalidation or window reload
      window.location.reload(); 
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: "Update Failed", 
        description: "Payment was successful but we couldn't update your balance. Please contact support.", 
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

  const copyRef = () => {
    navigator.clipboard.writeText(referenceCode);
    toast({ title: "Copied!", description: "Reference code copied to clipboard." });
  };

  const handlePaystackClick = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid deposit amount.", variant: "destructive" });
      return;
    }
    initializePayment(onSuccess, onClose);
  };

  return (
    <Card className="bg-gradient-to-br from-card to-secondary border-primary/20 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Wallet size={120} />
      </div>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          AVAILABLE BALANCE
        </CardTitle>
        <div className="mt-2 text-4xl font-bold tracking-tight text-foreground">
          GHS {balance.toFixed(2)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-background/40 backdrop-blur-sm rounded-xl p-4 border border-white/5">
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Deposit Reference Code</div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-2xl font-mono font-bold text-primary tracking-widest">{referenceCode}</span>
            <Button size="icon" variant="ghost" className="hover:bg-primary/10" onClick={copyRef}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
            Send MoMo to <span className="text-foreground font-semibold">024XXXXXXX</span> and use this reference code to fund your wallet instantly.
          </p>
        </div>
        
        <div className="flex gap-2">
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
                  Enter the amount you wish to deposit. You will be redirected to Paystack.
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

          <Button variant="outline" className="w-full gap-2" asChild>
            <a href="https://wa.me/233240000000" target="_blank" rel="noopener noreferrer">
              <Smartphone className="w-4 h-4" /> Support
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
