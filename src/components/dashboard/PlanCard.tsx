'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
      toast({ title: "Invalid Phone", description: "Please enter a valid 10-digit phone number.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const result = await buyBundle(userId, plan.id, phone);
    setLoading(false);

    if (result.success) {
      toast({ title: "Success!", description: result.message });
      setPhone('');
    } else {
      toast({ title: "Purchase Failed", description: result.message, variant: "destructive" });
    }
  };

  const isHighlighted = phone.length >= 10;

  return (
    <Card className="flex flex-col h-full bg-[#111827]/80 backdrop-blur-xl border-white/5 hover:border-primary/30 transition-all group overflow-hidden shadow-2xl">
      <div className="p-6 pb-0">
        <div className="flex justify-between items-start mb-1">
          <span className="text-sm font-bold text-foreground/80">{plan.name}</span>
          <CheckCircle2 className="text-primary w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-4xl font-black text-foreground tracking-tighter mb-1">{plan.size}</div>
        <p className="text-xs text-muted-foreground font-medium">{plan.description}</p>
      </div>
      
      <CardContent className="p-6 space-y-6">
        <div className="text-xl font-black text-accent tracking-tight">GHS {plan.price}</div>
        
        <div className="space-y-2">
          <Label htmlFor={`phone-${plan.id}`} className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">MTN NUMBER</Label>
          <div className="relative">
            <Smartphone className={cn("absolute left-3 top-3 w-4 h-4 transition-colors", isHighlighted ? "text-primary" : "text-muted-foreground")} />
            <Input 
              id={`phone-${plan.id}`}
              placeholder="024 000 0000" 
              className={cn(
                "pl-10 h-12 font-bold transition-all border-none",
                isHighlighted ? "bg-[#dbeafe] text-black" : "bg-black/40 text-white placeholder:text-gray-600"
              )}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-6 pt-0">
        <Button 
          className="w-full h-12 font-black tracking-widest text-xs uppercase bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20" 
          onClick={handlePurchase}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {loading ? 'PROCESSING...' : 'ACTIVATE BUNDLE'}
        </Button>
      </CardFooter>
    </Card>
  );
}
