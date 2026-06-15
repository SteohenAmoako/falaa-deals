
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get('reference');
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      setMessage('Invalid payment reference.');
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await fetch('/api/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage(`Payment of GHS ${data.amount} verified successfully! Redirecting you back...`);
          // Fast redirect on success
          const timer = setTimeout(() => router.push('/dashboard'), 2000);
          return () => clearTimeout(timer);
        } else {
          setStatus('failed');
          setMessage(data.error || 'Verification failed. Please contact support if you were charged.');
        }
      } catch (err) {
        setStatus('failed');
        setMessage('An unexpected error occurred during verification.');
      }
    };

    verifyPayment();
  }, [reference, router]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-white/5 bg-[#111118] shadow-2xl overflow-hidden">
        <CardHeader className="text-center pt-10">
          <div className="flex justify-center mb-6">
            <div className="relative">
              {status === 'loading' && (
                <div className="w-20 h-20 rounded-full border-4 border-violet-600/20 border-t-violet-600 animate-spin" />
              )}
              {status === 'success' && (
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center animate-in zoom-in duration-300">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
              )}
              {status === 'failed' && (
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center animate-in zoom-in duration-300">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">
            {status === 'loading' && 'Checking Payment'}
            {status === 'success' && 'Funds Received!'}
            {status === 'failed' && 'Verification Error'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-8 pb-10">
          <p className="text-zinc-400 text-sm font-medium px-4 leading-relaxed">
            {message}
          </p>
          
          <div className="px-4">
            {status !== 'loading' ? (
              <Button 
                className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white font-bold group" 
                onClick={() => router.push('/dashboard')}
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Please do not close this window
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
