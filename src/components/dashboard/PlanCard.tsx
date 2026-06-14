'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, CheckCircle2, Loader2 } from "lucide-react";
import { buyBundle } from '@/app/actions/orders';
import { useToast } from '@/hooks/use-toast';

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

  return (
    <Card className="flex flex-col h-full bg-card hover:border-primary/50 transition-all group overflow-hidden border-2 border-transparent">
      <div className="bg-primary/5 p-6 group-hover:bg-primary/10 transition-colors">
        <div className="flex justify-between items-start mb-4">
          <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
          <CheckCircle2 className="text-primary w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-foreground">{plan.size}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
      </div>
      
      <CardContent className="p-6 flex-grow space-y-4">
        <div className="text-2xl font-bold text-accent">GHS {plan.price}</div>
        <div className="space-y-2">
          <Label htmlFor={`phone-${plan.id}`} className="text-xs text-muted-foreground uppercase font-semibold">MTN Number</Label>
          <div className="relative">
            <Smartphone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input 
              id={`phone-${plan.id}`}
              placeholder="024 000 0000" 
              className="pl-10 h-11 bg-background/50 border-white/5"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-6 pt-0">
        <Button 
          className="w-full h-11 font-bold tracking-wide" 
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