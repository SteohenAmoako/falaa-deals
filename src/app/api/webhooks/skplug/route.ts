import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * SK Plug Webhook Receiver
 * Handles automated delivery notifications.
 */
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('X-SKPlug-Signature');
    const secret = process.env.SKPLUG_WEBHOOK_SECRET;

    // Verify signature - SK Plug sends the secret as the signature for verification
    if (!secret || signature !== secret) {
      console.error('SK Plug Webhook: Unauthorized attempt. Signature mismatch.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { order_id, status } = payload;

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    console.log(`SK Plug Webhook Received: Order ${order_id} is now ${status}`);

    // Update the SK Plug order status in the database
    // SK Plug statuses: pending, processing, delivered, failed
    const { error } = await supabaseAdmin
      .from('skplug_orders')
      .update({ 
        status: status || 'delivered',
        updated_at: new Date().toISOString()
      })
      .eq('order_id', order_id);

    if (error) {
      console.error('SK Plug Webhook DB Error:', error);
      return NextResponse.json({ error: 'DB Update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Status updated' });
  } catch (error: any) {
    console.error('SK Plug Webhook Fatal Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Diagnostic GET endpoint to check if the webhook is active.
 */
export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'SK Plug Webhook endpoint is active and waiting for POST requests.' 
  });
}
