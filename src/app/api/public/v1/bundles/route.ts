import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBundlesForRole } from '@/app/actions/bundles';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized. Use "Bearer YOUR_API_KEY"' }, { status: 401 });
    }

    const apiKey = authHeader.substring(7);
    const { data: keyRecord, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .maybeSingle();

    if (keyError || !keyRecord) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', keyRecord.user_id)
      .single();

    const bundles = await getBundlesForRole(profile?.role || 'base');
    
    return NextResponse.json({
      success: true,
      bundles: bundles.map(b => ({
        id: b.id,
        network: b.network,
        size: b.label,
        price: b.sell_price_ghs
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
