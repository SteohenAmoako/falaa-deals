
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Copy, Smartphone, Loader2, Coins } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// Dynamically import Paystack logic to avoid window undefined error during SSR
const PaystackDeposit = dynamic(() => import('./PaystackDeposit'), { 
  ssr: false,
  loading: () => <Button disabled className="w-full h-10"><Loader2 className="animate-spin mr-2 h-4 w-4" /> Loading Paystack...</Button>
});

interface WalletCardProps {
  balance: number;
  referenceCode: string;
  disabled?: boolean;
}

export default function WalletCard({ balance, referenceCode, disabled }: WalletCardProps) {
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
    <Card className={cn(
      "bg-[#111827]/50 border-white/5 shadow-2xl overflow-hidden relative group max-w-md",
      disabled && "opacity-60 pointer-events-none"
    )}>
      {/* Wallet Watermark - Added pointer-events-none to fix click interference */}
      <div className="absolute top-2 right-2 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
        <Wallet size={80} strokeWidth={1} />
      </div>
      
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
          <Coins className="w-2.5 h-2.5 text-primary" />
          BALANCE
        </div>
        <div className="text-2xl font-black tracking-tighter text-foreground">
          GHS {balance.toFixed(2)}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-4 space-y-4 relative z-10">
        <div className="bg-black/30 rounded-xl p-4 border border-white/5 space-y-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Reference Code</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-mono font-bold text-primary tracking-widest">{referenceCode}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/5 text-muted-foreground" onClick={copyRef} disabled={disabled}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Send MoMo to <span className="text-foreground font-bold italic">024XXXXXXX</span> and use this code to fund your wallet.
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          {userId && <PaystackDeposit userEmail={userEmail} userId={userId} disabled={disabled} />}
          
          <Button variant="outline" className="w-full h-10 gap-2 border-white/5 bg-[#1e293b]/40 hover:bg-[#1e293b]/60 text-xs font-bold" asChild>
            <a href="https://wa.me/233240000000" target="_blank" rel="noopener noreferrer">
              <Smartphone className="w-3.5 h-3.5" /> Support
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
