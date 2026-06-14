'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Loader2, Calendar, TrendingUp, AlertTriangle } from "lucide-react";
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
      // Map orders to historical consumption
      const purchaseHistory = orders.map((order, idx) => {
        const nextOrder = orders[idx - 1]; // Orders are sorted desc
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
        currentDataBalanceGB: currentBalance, // In a real app we'd track actual usage, for now we assume balance is used over time
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
    <Card className="border-accent/20 bg-accent/5 backdrop-blur-md overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-accent" />
            AI Usage Insights
          </CardTitle>
          <CardDescription>Predict depletion based on history</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={runForecast}
          disabled={loading || orders.length === 0}
          className="bg-accent/10 border-accent/20 hover:bg-accent/20"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Analyze
        </Button>
      </CardHeader>
      <CardContent>
        {!forecast ? (
          <div className="py-10 text-center space-y-2 opacity-50">
            <TrendingUp className="w-10 h-10 mx-auto mb-4" />
            <p className="text-sm">Click analyze to see when your data will run out.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-background/40 p-4 rounded-lg border border-accent/10">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase mb-1">
                <Calendar className="w-3 h-3" /> Depletion Date
              </div>
              <div className="text-lg font-bold text-foreground">{forecast.estimatedDepletionDate}</div>
            </div>
            <div className="bg-background/40 p-4 rounded-lg border border-primary/10">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase mb-1">
                <AlertTriangle className="w-3 h-3 text-primary" /> Top-up Date
              </div>
              <div className="text-lg font-bold text-primary">{forecast.recommendedTopUpDate}</div>
            </div>
            <div className="bg-background/40 p-4 rounded-lg border border-accent/10">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase mb-1">
                <TrendingUp className="w-3 h-3" /> Avg Consumption
              </div>
              <div className="text-lg font-bold text-foreground">{forecast.averageDailyConsumptionGB} GB/day</div>
            </div>
            <div className="md:col-span-3 p-4 bg-accent/5 rounded-lg text-sm text-muted-foreground leading-relaxed italic">
              "{forecast.explanation}"
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}