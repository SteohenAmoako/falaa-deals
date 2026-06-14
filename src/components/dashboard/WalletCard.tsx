'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Copy, Smartphone, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';

// Dynamically import Paystack logic to avoid window undefined error during SSR
const PaystackDeposit = dynamic(() => import('./PaystackDeposit'), { 
  ssr: false,
  loading: () => <Button disabled className="w-full"><Loader2 className="animate-spin mr-2 h-4 w-4" /> Loading Paystack...</Button>
});

interface WalletCardProps {
  balance: number;
  referenceCode: string;
}

export default function WalletCard({ balance, referenceCode }: WalletCardProps) {
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || '');
        setUserId(session.user.id);
      }
    }
    getUser();
  }, []);

  const copyRef = () => {
    navigator.clipboard.writeText(referenceCode);
    toast({ title: "Copied!", description: "Reference code copied to clipboard." });
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
        
        <div className="flex flex-col gap-2">
          {userId && <PaystackDeposit userEmail={userEmail} userId={userId} />}
          
          <Button variant="outline" className="w-full gap-2 border-white/5" asChild>
            <a href="https://wa.me/233240000000" target="_blank" rel="noopener noreferrer">
              <Smartphone className="w-4 h-4" /> Support
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}