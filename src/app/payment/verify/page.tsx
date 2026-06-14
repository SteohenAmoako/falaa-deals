
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
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
          setMessage(`Payment of GHS ${data.amount} verified successfully!`);
          setTimeout(() => router.push('/dashboard'), 3000);
        } else {
          setStatus('failed');
          setMessage(data.error || 'Verification failed.');
        }
      } catch (err) {
        setStatus('failed');
        setMessage('An unexpected error occurred during verification.');
      }
    };

    verifyPayment();
  }, [reference, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-white/5 bg-card shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="w-16 h-16 text-primary animate-spin" />}
            {status === 'success' && <CheckCircle2 className="w-16 h-16 text-emerald-500" />}
            {status === 'failed' && <XCircle className="w-16 h-16 text-destructive" />}
          </div>
          <CardTitle className="text-2xl font-black">
            {status === 'loading' && 'Verifying...'}
            {status === 'success' && 'Success!'}
            {status === 'failed' && 'Oops!'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">{message}</p>
          {status !== 'loading' && (
            <Button className="w-full" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
