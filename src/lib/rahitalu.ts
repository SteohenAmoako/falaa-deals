import { createClient } from '@supabase/supabase-js';

/**
 * @fileOverview Rahitalu API Integration
 * Handles token management and order placement with robust error handling.
 * Documentation used: https://data-api.rahitalu.com/v2
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Normalize the base URL - ensure no trailing slash
const RAW_BASE_URL = process.env.RAHITALU_BASE_URL || 'https://data-api.rahitalu.com/v2';
const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

const LOGIN_URL = `${BASE_URL}/auth/login`;
const PURCHASE_URL = `${BASE_URL}/purchases`;
const TWO_MINUTES = 2 * 60 * 1000;

/**
 * Safely parses JSON from a fetch response, handling HTML error pages gracefully.
 */
async function safeParseJson(response: Response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    return data;
  }
  
  // Handle non-JSON responses (like 404 or 500 HTML pages)
  const text = await response.text();
  console.error(`Rahitalu Non-JSON Response (Status ${response.status}):`, text.substring(0, 200));
  
  if (response.status === 404) {
    throw new Error(`API Endpoint Not Found (404). Please check RAHITALU_BASE_URL: ${BASE_URL}`);
  }
  
  throw new Error(`Unexpected response from data provider (Status ${response.status}).`);
}

async function fetchNewToken(): Promise<string> {
  try {
    const res = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: process.env.RAHITALU_CODE || 'sboa230',
        basename: process.env.RAHITALU_BASENAME || 'bravo',
      }),
    });

    const data = await safeParseJson(res);

    if (!data.success) {
      throw new Error(data.message || 'Rahitalu login failed.');
    }

    const accessToken = data.data.accessToken;
    // Set expiry slightly earlier than 15 mins to be safe
    const expiresAt = new Date(Date.now() + 13 * 60 * 1000).toISOString();

    // Update the single row (id = 1)
    const { error } = await supabaseAdmin
      .from('rahitalu_token')
      .update({
        access_token: accessToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      console.error('Failed to save token to database:', error);
    }

    return accessToken;
  } catch (error: any) {
    console.error('fetchNewToken Error:', error);
    throw error;
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

  // If token expires within 2 minutes — refresh it
  if (expiresAt - now < TWO_MINUTES) {
    return await fetchNewToken();
  }

  return data.access_token;
}

/**
 * Places a data order using the /purchases endpoint.
 */
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
      throw new Error(data.message || 'The data provider could not process this order.');
    }

    return data.data;
  } catch (error: any) {
    console.error('placeDataOrder Error:', error);
    throw error;
  }
}
