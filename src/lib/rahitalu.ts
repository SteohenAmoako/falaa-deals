import { createClient } from '@supabase/supabase-js';

/**
 * @fileOverview Rahitalu API Integration
 * Handles token management and order placement with robust error handling.
 * Credentials are pulled strictly from environment variables.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = (process.env.RAHITALU_BASE_URL || '').replace(/\/+$/, '');

const LOGIN_URL = `${BASE_URL}/auth/login`;
const PURCHASE_URL = `${BASE_URL}/purchases`;
const DASHBOARD_URL = `${BASE_URL}/dashboard`;
const TWO_MINUTES = 2 * 60 * 1000;

async function safeParseJson(response: Response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  throw new Error(`Upstream service error: ${response.status}`);
}

async function fetchNewToken(): Promise<string> {
  const code = process.env.RAHITALU_CODE;
  const basename = process.env.RAHITALU_BASENAME;

  if (!code || !basename || !BASE_URL) {
    throw new Error('Rahitalu configuration missing in environment variables');
  }

  try {
    const res = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, basename }),
    });

    const data = await safeParseJson(res);

    if (!data.success) {
      throw new Error('Auth failed with provider');
    }

    const accessToken = data.data.accessToken;
    const expiresAt = new Date(Date.now() + 13 * 60 * 1000).toISOString();

    await supabaseAdmin
      .from('rahitalu_token')
      .update({
        access_token: accessToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    return accessToken;
  } catch (error: any) {
    throw new Error('Provider connectivity issue');
  }
}

export async function getValidToken(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('rahitalu_token')
    .select('access_token, expires_at')
    .eq('id', 1)
    .single();

  if (error || !data || data.access_token === 'placeholder') {
    return await fetchNewToken();
  }

  const expiresAt = new Date(data.expires_at).getTime();
  const now = Date.now();

  if (expiresAt - now < TWO_MINUTES) {
    return await fetchNewToken();
  }

  return data.access_token;
}

export async function placeDataOrder(planId: string, phone: string, amount: number) {
  try {
    const token = await getValidToken();

    const response = await fetch(PURCHASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        planId: planId,
        customerPhone: phone,
        sellPriceGHS: amount,
        productType: 'instant'
      })
    });

    const data = await safeParseJson(response);
    
    if (!data.success) {
      throw new Error(data.message || 'Provider could not process order');
    }

    return data.data;
  } catch (error: any) {
    throw error;
  }
}

export async function getUpstreamDashboard() {
  try {
    const token = await getValidToken();
    const response = await fetch(DASHBOARD_URL, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await safeParseJson(response);
    return data.data;
  } catch (error) {
    return { wallet: { balance: 0 } };
  }
}

export async function getUpstreamOrderHistory(limit = 50) {
  try {
    const token = await getValidToken();
    const response = await fetch(`${PURCHASE_URL}?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await safeParseJson(response);
    return data.data || [];
  } catch (error) {
    return [];
  }
}
