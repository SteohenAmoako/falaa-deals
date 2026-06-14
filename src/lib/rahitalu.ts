import { createClient } from '@supabase/supabase-js'

/**
 * @fileOverview Rahitalu API Integration
 * Handles token management (OAuth2-style) and data bundle order placement.
 * Uses a single-row Supabase table to persist tokens across serverless function calls.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE_URL = process.env.RAHITALU_BASE_URL || 'https://data-api.rahitalu.com/v2'
const LOGIN_URL = `${BASE_URL}/auth/login`
const ORDER_URL = `${BASE_URL}/orders`
const TWO_MINUTES = 2 * 60 * 1000

/**
 * Fetches a fresh access token from Rahitalu and saves it to Supabase.
 */
async function fetchNewToken(): Promise<string> {
  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: process.env.RAHITALU_CODE,
      basename: process.env.RAHITALU_BASENAME,
    }),
  })

  const data = await res.json()

  if (!data.success) {
    throw new Error('Rahitalu login failed: ' + (data.message || 'Unknown error'))
  }

  const accessToken = data.data.accessToken
  // Rahitalu tokens usually last 15 mins, we set expiration for 13 mins to be safe
  const expiresAt = new Date(Date.now() + 13 * 60 * 1000).toISOString()

  // Upsert the single row (id = 1)
  const { error } = await supabase
    .from('rahitalu_token')
    .upsert({
      id: 1,
      access_token: accessToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })

  if (error) throw new Error('Failed to save token to database: ' + error.message)

  return accessToken
}

/**
 * Retrieves a valid access token. Checks local DB first, refreshes if expired.
 */
export async function getValidToken(): Promise<string> {
  const { data, error } = await supabase
    .from('rahitalu_token')
    .select('access_token, expires_at')
    .eq('id', 1)
    .single()

  if (error || !data) {
    return await fetchNewToken()
  }

  const expiresAt = new Date(data.expires_at).getTime()
  const now = Date.now()

  // If token expires within 2 minutes — refresh it
  if (expiresAt - now < TWO_MINUTES) {
    return await fetchNewToken()
  }

  return data.access_token
}

/**
 * Places a data bundle order via Rahitalu API.
 * @param planId The Rahitalu specific plan ID
 * @param phone The recipient MTN number
 * @param amount The sell price for our records
 */
export async function placeDataOrder(planId: string, phone: string, amount: number) {
  const token = await getValidToken()

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
  })

  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.message || 'Rahitalu API error: Failed to place order')
  }

  return data.data // Contains upstream status and reference
}
