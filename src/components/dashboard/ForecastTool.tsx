'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Loader2, Calendar, TrendingUp, AlertTriangle, AreaChart } from "lucide-react";
import { forecastDataUsage, type DataUsageForecasterOutput } from '@/ai/flows/data-usage-forecaster';

interface ForecastToolProps {
  currentBalance: number;
  orders: any[];
}

export default function ForecastTool({ currentBalance, orders }: ForecastToolProps) {
  const [forecast, setForecast] = useState<DataUsageForecasterOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const runForecast = async () => {
    setLoading(true);
    try {
      const purchaseHistory = orders.map((order, idx) => {
        const nextOrder = orders[idx - 1];
        const currentOrderDate = new Date(order.created_at);
        const nextOrderDate = nextOrder ? new Date(nextOrder.created_at) : new Date();
        const daysLasted = Math.max(1, Math.ceil((nextOrderDate.getTime() - currentOrderDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        return {
          gigabytes: parseFloat(order.gig.replace('GB', '')),
          purchaseDate: order.created_at,
          daysLasted
        };
      }).slice(0, 5);

      const result = await forecastDataUsage({
        currentDataBalanceGB: currentBalance,
        currentBundlePurchaseDate: orders[0]?.created_at || new Date().toISOString(),
        purchaseHistory
      });
      setForecast(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-white/5 bg-[#111827]/50 shadow-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2 font-bold">
            <BrainCircuit className="w-5 h-5 text-accent" />
            AI Usage Insights
          </CardTitle>
          <CardDescription className="text-xs">Predict depletion based on history</CardDescription>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={runForecast}
          disabled={loading || orders.length === 0}
          className="bg-accent/10 border-accent/20 hover:bg-accent/20 text-accent font-bold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Analyze
        </Button>
      </CardHeader>
      <CardContent>
        {!forecast ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 opacity-30">
            <TrendingUp className="w-12 h-12 stroke-[1.5]" />
            <p className="text-xs font-medium tracking-tight">Click analyze to see when your data will run out.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-2">
            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                <Calendar className="w-3 h-3" /> Depletion Date
              </div>
              <div className="text-lg font-black text-foreground">{forecast.estimatedDepletionDate}</div>
            </div>
            <div className="bg-black/20 p-4 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
                <AlertTriangle className="w-3 h-3" /> Top-up Date
              </div>
              <div className="text-lg font-black text-primary">{forecast.recommendedTopUpDate}</div>
            </div>
            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                <TrendingUp className="w-3 h-3" /> Avg Consumption
              </div>
              <div className="text-lg font-black text-foreground">{forecast.averageDailyConsumptionGB} GB/day</div>
            </div>
            <div className="md:col-span-3 p-4 bg-accent/5 rounded-xl text-xs text-muted-foreground leading-relaxed italic border border-accent/10">
              "{forecast.explanation}"
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
