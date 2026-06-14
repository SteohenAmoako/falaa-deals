import { createClient } from '@supabase/supabase-js';

// Use Service Role to ensure token management always works server-side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RAHITALU_BASE_URL = process.env.RAHITALU_BASE_URL || 'https://data-api.rahitalu.com/v2';
const RAHITALU_CODE = process.env.RAHITALU_CODE || 'sboa230';
const RAHITALU_BASENAME = process.env.RAHITALU_BASENAME || 'bravo';

/**
 * Retrieves a valid Rahitalu access token, either from the database or by logging in.
 */
export async function getRahitaluToken() {
  try {
    // 1. Try to get token from our internal storage
    const { data: tokenRecord } = await supabaseAdmin
      .from('rahitalu_token')
      .select('*')
      .eq('id', 1)
      .single();

    // Check if token exists and is not expired (we subtract 1 minute for safety)
    if (tokenRecord && new Date(tokenRecord.expires_at).getTime() > Date.now() + 60000) {
      return tokenRecord.access_token;
    }

    // 2. Otherwise, refresh it by logging in
    const response = await fetch(`${RAHITALU_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: RAHITALU_CODE, basename: RAHITALU_BASENAME }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to login to Rahitalu');
    }
    
    const data = await response.json();
    const accessToken = data.token;
    // Tokens usually last 15 mins, we set expiration to 14 mins from now
    const expiresAt = new Date(Date.now() + 14 * 60 * 1000).toISOString();

    // 3. Update in DB for future requests
    await supabaseAdmin.from('rahitalu_token').upsert({
      id: 1,
      access_token: accessToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });

    return accessToken;
  } catch (error: any) {
    console.error('Rahitalu Token Error:', error);
    throw new Error('Authentication with provider failed: ' + error.message);
  }
}

/**
 * Places a data order with Rahitalu.
 */
export async function placeDataOrder(planId: string, phone: string, price: number) {
  const token = await getRahitaluToken();

  const response = await fetch(`${RAHITALU_BASE_URL}/purchases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      planId,
      customerPhone: phone,
      sellPriceGHS: price,
      productType: 'instant'
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // If we get an unauthorized error, it might mean our cached token was revoked
    if (response.status === 401) {
      throw new Error('Invalid token');
    }
    throw new Error(errorData.message || 'Data provider rejected the request');
  }

  return response.json();
}
