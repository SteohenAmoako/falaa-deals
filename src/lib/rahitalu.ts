import { supabase } from './supabase';

const RAHITALU_BASE_URL = process.env.RAHITALU_BASE_URL || 'https://data-api.rahitalu.com/v2';
const RAHITALU_CODE = process.env.RAHITALU_CODE || 'sboa230';
const RAHITALU_BASENAME = process.env.RAHITALU_BASENAME || 'bravo';

export async function getRahitaluToken() {
  // Try to get token from our internal storage
  const { data: tokenRecord, error } = await supabase
    .from('rahitalu_token')
    .select('*')
    .single();

  if (tokenRecord && new Date(tokenRecord.expires_at) > new Date()) {
    return tokenRecord.access_token;
  }

  // Otherwise, refresh it
  const response = await fetch(`${RAHITALU_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: RAHITALU_CODE, basename: RAHITALU_BASENAME }),
  });

  if (!response.ok) throw new Error('Failed to login to Rahitalu');
  
  const data = await response.json();
  const accessToken = data.token;
  const expiresAt = new Date(Date.now() + 14 * 60 * 1000).toISOString(); // 14 mins to be safe

  // Update in DB
  await supabase.from('rahitalu_token').upsert({
    id: 1,
    access_token: accessToken,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  return accessToken;
}

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
    throw new Error(errorData.message || 'Rahitalu purchase failed');
  }

  return response.json();
}

export async function getRahitaluDashboard() {
  const token = await getRahitaluToken();
  const response = await fetch(`${RAHITALU_BASE_URL}/dashboard`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) return { balance: 0 };
  return response.json();
}