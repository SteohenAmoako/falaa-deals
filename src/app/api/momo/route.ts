import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendNtfy } from '@/lib/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Clean up inputs in case the iPhone Shortcut sends labels instead of just values.
 */
function sanitizeInput(value: any): string {
  if (typeof value !== 'string') return String(value || '');
  return value
    .replace(/Reference:\s*/i, '')
    .replace(/GHS\s*/i, '')
    .replace(/Transaction ID:\s*/i, '')
    .trim();
}

/**
 * Enhanced MoMo Message Parser
 */
function parseMomoMessage(rawText: string) {
  const amountMatch = rawText.match(/received for GHS\s*([\d,]+\.?\d*)/i) || 
                      rawText.match(/GHS\s*([\d,]+\.?\d*)/i);
  
  const referenceMatch = rawText.match(/Reference:\s*([A-Z0-9]+)/i);
  
  const transactionIdMatch = rawText.match(/Transaction ID:\s*(\d+)/i) || 
                             rawText.match(/ID:\s*(\w+)/i);

  if (!referenceMatch || !amountMatch || !transactionIdMatch) {
    return null;
  }

  return {
    reference: referenceMatch[1].trim(),
    amount: parseFloat(amountMatch[1].replace(/,/g, '')),
    transactionId: transactionIdMatch[1].trim(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.MOMO_WEBHOOK_SECRET;

    if (!expectedSecret) {
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    if (!secret || secret !== expectedSecret) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let reference: string | null = null;
    let amount: number | null = null;
    let transactionId: string | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      reference = sanitizeInput(body.reference || body.ref);
      const rawAmount = body.amount;
      amount = typeof rawAmount === 'string' 
        ? parseFloat(rawAmount.replace(/[^0-9.]/g, '')) 
        : rawAmount;
      transactionId = sanitizeInput(body.transactionId || body.transactionID || body.transaction_id || body.txid);

      if (!reference && (body.text || body.message)) {
        const parsed = parseMomoMessage(body.text || body.message);
        if (parsed) {
          reference = parsed.reference;
          amount = parsed.amount;
          transactionId = parsed.transactionId;
        }
      }
    } else {
      const rawText = await req.text();
      const parsed = parseMomoMessage(rawText);
      if (parsed) {
        reference = parsed.reference;
        amount = parsed.amount;
        transactionId = parsed.transactionId;
      }
    }

    if (!reference || amount === null || isNaN(amount) || !transactionId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Data parsing failed. Ensure reference, amount, and transactionId are correctly sent.' 
      }, { status: 400 });
    }

    const { data: existingTx } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id')
      .eq('reference', transactionId)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, wallet_balance, phone, full_name, reference_code')
      .eq('reference_code', reference)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ 
        success: false, 
        message: `Account not found for reference: ${reference}` 
      }, { status: 404 });
    }

    const newBalance = parseFloat(profile.wallet_balance.toString()) + amount;

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) throw updateError;

    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: profile.user_id,
      amount,
      type: 'credit',
      reference: transactionId,
      description: `MoMo Deposit (Ref: ${reference})`,
      status: 'success'
    });

    // Notify ntfy
    await sendNtfy({
      title: `${profile.full_name} (${profile.reference_code}): MoMo Deposit GHS ${amount}`,
      tags: ["momo", "deposit", "wallet"],
      data: {
        user: `${profile.full_name} (${profile.reference_code})`,
        amount,
        reference,
        transactionId,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({ success: true, message: 'Wallet credited successfully', newBalance });
  } catch (error: any) {
    console.error('MoMo Webhook Fatal Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  const isSecretSet = !!process.env.MOMO_WEBHOOK_SECRET;
  return NextResponse.json({ 
    success: true, 
    message: 'MoMo Webhook Active',
    diagnostics: {
      secretIsConfigured: isSecretSet,
      supportedFormat: "POST JSON with fields 'reference', 'amount', 'transactionId'"
    }
  });
}
