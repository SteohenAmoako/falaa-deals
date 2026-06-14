'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, Copy, RefreshCw, Smartphone } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WalletCardProps {
  balance: number;
  referenceCode: string;
}

export default function WalletCard({ balance, referenceCode }: WalletCardProps) {
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
        
        <div className="flex gap-2">
          <Button className="w-full gap-2 font-semibold shadow-lg shadow-primary/20">
            <RefreshCw className="w-4 h-4" /> Fund Wallet
          </Button>
          <Button variant="outline" className="w-full gap-2">
             <Smartphone className="w-4 h-4" /> Support
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}