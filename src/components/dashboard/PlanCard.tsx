'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, CheckCircle2, Loader2 } from "lucide-react";
import { buyBundle } from '@/app/actions/orders';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    size: string;
    price: number;
    description: string;
  };
  userId: string;
}

export default function PlanCard({ plan, userId }: PlanCardProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async () => {
    if (!phone || phone.length < 10) {
      toast({ 
        title: "Invalid Phone", 
        description: "Please enter a valid 10-digit phone number.", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const result = await buyBundle(userId, plan.id, phone);
      
      if (result.success) {
        toast({ 
          title: "Success!", 
          description: result.message 
        });
        setPhone('');
      } else {
        toast({ 
          title: "Purchase Failed", 
          description: result.message, 
          variant: "destructive" 
        });
      }
    } catch (err: any) {
      toast({ 
        title: "Purchase Failed", 
        description: err.message || "An unexpected error occurred", 
        variant: "destructive" 
      });
    } finally {
      setPhone('');
      setLoading(false);
    }
  };

  const isHighlighted = phone.length >= 10;

  return (
    <Card className="flex flex-col h-full bg-[#111827] border-white/5 hover:border-primary/20 transition-all group overflow-hidden shadow-2xl">
      <div className="p-3 sm:p-8 pb-0 space-y-0.5 sm:space-y-1">
        <div className="flex justify-between items-start">
          <span className="text-[9px] sm:text-sm font-bold text-muted-foreground/80">{plan.name}</span>
          <CheckCircle2 className="text-primary w-3 h-3 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-2xl sm:text-5xl font-black text-foreground tracking-tighter leading-none">{plan.size}</div>
        <p className="text-[8px] sm:text-xs text-muted-foreground font-medium uppercase tracking-tight truncate">{plan.description}</p>
      </div>
      
      <CardContent className="p-3 sm:p-8 space-y-4 sm:space-y-8">
        <div className="text-sm sm:text-2xl font-black text-accent tracking-tight">GHS {plan.price}</div>
        
        <div className="space-y-2">
          <Label htmlFor={`phone-${plan.id}`} className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-[0.1em] sm:tracking-[0.2em]">MTN NUMBER</Label>
          <div className="relative">
            <div className={cn(
              "absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 transition-colors z-10",
              isHighlighted ? "text-primary" : "text-muted-foreground/50"
            )}>
              <Smartphone className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
            <Input 
              id={`phone-${plan.id}`}
              placeholder="024 000 0000" 
              className={cn(
                "pl-7 sm:pl-11 h-9 sm:h-14 font-bold text-xs sm:text-lg transition-all border-none ring-offset-transparent focus-visible:ring-0",
                isHighlighted 
                  ? "bg-[#dbeafe] text-black" 
                  : "bg-black/40 text-white placeholder:text-zinc-800"
              )}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              maxLength={10}
            />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-3 sm:p-8 pt-0 mt-auto">
        <Button 
          className="w-full h-9 sm:h-14 font-black tracking-normal sm:tracking-widest text-[9px] sm:text-sm uppercase bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/10 rounded-lg sm:rounded-xl" 
          onClick={handlePurchase}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            'ACTIVATE'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
