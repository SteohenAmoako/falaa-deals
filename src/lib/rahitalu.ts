import { createClient } from '@supabase/supabase-js';

/**
 * @fileOverview Rahitalu API Integration
 * Handles token management and order placement.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.RAHITALU_BASE_URL || 'https://data-api.rahitalu.com/v2';
const LOGIN_URL = `${BASE_URL}/auth/login`;
const ORDER_URL = `${BASE_URL}/orders`;
const TWO_MINUTES = 2 * 60 * 1000;

async function fetchNewToken(): Promise<string> {
  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: process.env.RAHITALU_CODE,
      basename: process.env.RAHITALU_BASENAME,
    }),
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error('Rahitalu login failed: ' + (data.message || 'Unknown error'));
  }

  const accessToken = data.data.accessToken;
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

  if (error) throw new Error('Failed to save token: ' + error.message);

  return accessToken;
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
  const token = await getValidToken();

  const response = await fetch(ORDER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      planId,
      recipient: phone,
      amount: amount
    })
  });

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Rahitalu API error: Failed to place order');
  }

  return data.data;
}
