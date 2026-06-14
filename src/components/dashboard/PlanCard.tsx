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
      setLoading(false);
    }
  };

  const isHighlighted = phone.length >= 10;

  return (
    <Card className="flex flex-col h-full bg-[#111827] border-white/5 hover:border-primary/20 transition-all group overflow-hidden shadow-2xl">
      <div className="p-8 pb-0 space-y-1">
        <div className="flex justify-between items-start">
          <span className="text-sm font-bold text-muted-foreground/80">{plan.name}</span>
          <CheckCircle2 className="text-primary w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-5xl font-black text-foreground tracking-tighter">{plan.size}</div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">{plan.description}</p>
      </div>
      
      <CardContent className="p-8 space-y-8">
        <div className="text-2xl font-black text-accent tracking-tight">GHS {plan.price}</div>
        
        <div className="space-y-3">
          <Label htmlFor={`phone-${plan.id}`} className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">MTN NUMBER</Label>
          <div className="relative">
            <div className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10",
              isHighlighted ? "text-primary" : "text-muted-foreground/50"
            )}>
              <Smartphone className="w-4 h-4" />
            </div>
            <Input 
              id={`phone-${plan.id}`}
              placeholder="024 000 0000" 
              className={cn(
                "pl-11 h-14 font-bold text-lg transition-all border-none ring-offset-transparent focus-visible:ring-0",
                isHighlighted 
                  ? "bg-[#dbeafe] text-black" 
                  : "bg-black/40 text-white placeholder:text-gray-700"
              )}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              maxLength={10}
            />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-8 pt-0">
        <Button 
          className="w-full h-14 font-black tracking-widest text-sm uppercase bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/10 rounded-xl" 
          onClick={handlePurchase}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'ACTIVATE BUNDLE'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
