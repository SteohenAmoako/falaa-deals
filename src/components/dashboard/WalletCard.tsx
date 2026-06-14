'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Copy, Smartphone, Loader2, Coins } from "lucide-react";
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
    <Card className="bg-[#111827]/50 border-white/5 shadow-2xl overflow-hidden relative group">
      {/* Wallet Watermark */}
      <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Wallet size={120} strokeWidth={1} />
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <Coins className="w-3 h-3 text-primary" />
          AVAILABLE BALANCE
        </div>
        <div className="text-4xl font-black tracking-tighter text-foreground mt-1">
          GHS {balance.toFixed(2)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="bg-black/30 rounded-xl p-6 border border-white/5 space-y-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Deposit Reference Code</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-bold text-primary tracking-widest">{referenceCode}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/5 text-muted-foreground" onClick={copyRef}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Send MoMo to <span className="text-foreground font-bold italic">024XXXXXXX</span> and use this reference code to fund your wallet instantly.
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          {userId && <PaystackDeposit userEmail={userEmail} userId={userId} />}
          
          <Button variant="outline" className="w-full h-12 gap-2 border-white/5 bg-[#1e293b]/40 hover:bg-[#1e293b]/60 text-sm font-bold" asChild>
            <a href="https://wa.me/233240000000" target="_blank" rel="noopener noreferrer">
              <Smartphone className="w-4 h-4" /> Support
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
