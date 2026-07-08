
/**
 * @fileOverview ByteMeDeals API Client
 * Handles orders, balance checks, and authentication for the ByteMeDeals provider.
 */

const BASE_URL = process.env.BYTEMEDEALS_BASE_URL || 'https://bytemedeals.shop/api/v1';
const API_KEY = process.env.BYTEMEDEALS_API_KEY;

async function request(path: string, options: RequestInit = {}) {
  if (!API_KEY) {
    throw new Error('ByteMeDeals API key is not configured in environment variables');
  }

  const response = await fetch(`${BASE_URL.replace(/\/+$/, '')}${path}`, {
    ...options,
    // Add 15 second timeout to prevent infinite loading
    signal: AbortSignal.timeout(15000),
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `ByteMeDeals API error: ${response.status}`;
    if (errorMsg.toLowerCase().includes('balance') || errorMsg.toLowerCase().includes('insufficient')) {
      throw new Error('PROVIDER_INSUFFICIENT_BALANCE');
    }
    throw new Error(errorMsg);
  }

  return data;
}

export const byteMeDealsClient = {
  /**
   * Retrieve current account balance.
   */
  async getBalance() {
    return request('/balance');
  },

  /**
   * Purchase a data bundle.
   * @param network MTN, VOD (for Telecel), or ATM (for AirtelTigo)
   * @param planId Internal ID of the data plan
   * @param phone Recipient mobile number
   * @param requestId Unique reference for idempotency
   */
  async purchaseData(network: 'MTN' | 'VOD' | 'ATM', planId: number, phone: string, requestId: string) {
    return request('/purchase', {
      method: 'POST',
      body: JSON.stringify({
        network,
        plan_id: planId,
        phone,
        request_id: requestId,
      }),
    });
  },

  /**
   * Check the status of an order.
   */
  async getStatus(reference: string) {
    return request(`/status/${reference}`);
  }
};
