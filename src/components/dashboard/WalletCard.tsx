'use client';

import { Wallet, Copy, Smartphone, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface WalletCardProps {
  balance: number;
  referenceCode: string;
  disabled?: boolean;
}

export default function WalletCard({ balance, referenceCode, disabled }: WalletCardProps) {
  const { toast } = useToast();

  const copyRef = async () => {
    try {
      // Check if navigator.clipboard is available and the context allows writing
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referenceCode);
        toast({ title: "Copied!", description: "Reference code copied to clipboard." });
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (err) {
      console.warn('Clipboard access failed:', err);
      // Fallback for environments with restricted permissions
      toast({ 
        variant: "destructive", 
        title: "Copy Failed", 
        description: "Clipboard access is restricted. Please copy the code manually." 
      });
    }
  };

  return (
    <Card className={cn(
      "bg-[#111827]/50 border-white/5 shadow-2xl overflow-hidden relative group max-w-md",
      disabled && "opacity-60 pointer-events-none"
    )}>
      <div className="absolute top-2 right-2 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
        <Wallet size={80} strokeWidth={1} />
      </div>
      
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
          <Coins className="w-2.5 h-2.5 text-primary" />
          WALLET BALANCE
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
            Use this code for manual MoMo transfers if needed. All purchases now support direct payment.
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="w-full h-10 gap-2 border-white/5 bg-[#1e293b]/40 hover:bg-[#1e293b]/60 text-xs font-bold" asChild>
            <a href="https://wa.me/233240000000" target="_blank" rel="noopener noreferrer">
              <Smartphone className="w-3.5 h-3.5" /> Contact Support
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}