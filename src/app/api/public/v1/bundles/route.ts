import { NextRequest, NextResponse } from 'next/server';
import { skPlugClient } from '@/lib/skplug/client';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const bundles = await skPlugClient.getBundles();
    return NextResponse.json({ success: true, data: bundles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
