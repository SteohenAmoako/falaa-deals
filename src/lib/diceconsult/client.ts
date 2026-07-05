/**
 * @fileOverview DiceConsult API Client
 * Handles orders and balance checks using the unified API router.
 */

const BASE_URL = process.env.DICECONSULT_BASE_URL || 'https://diceconsultgh.com/api/api_router.php';
const API_KEY = process.env.DICECONSULT_API_KEY;

async function request(options: RequestInit = {}) {
  if (!API_KEY) {
    throw new Error('DiceConsult API key is not configured');
  }

  const response = await fetch(BASE_URL, {
    ...options,
    headers: {
      'X-API-KEY': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  
  if (!response.ok || (data.success === false)) {
    // Distinguish between validation errors and balance errors
    const errorMsg = data.message || `DiceConsult API error: ${response.status}`;
    if (errorMsg.toLowerCase().includes('insufficient balance') || errorMsg.toLowerCase().includes('top up')) {
      throw new Error('PROVIDER_INSUFFICIENT_BALANCE');
    }
    throw new Error(errorMsg);
  }

  return data;
}

export const diceConsultClient = {
  /**
   * Purchase a data bundle.
   * @param network MTN, Telecel, iShare, BigTime
   * @param phone Recipient phone number
   * @param bundle Bundle size (e.g., "1GB", "2GB")
   */
  async purchaseData(network: string, phone: string, bundle: string) {
    return request({
      method: 'POST',
      body: JSON.stringify({
        network,
        phone,
        bundle
      }),
    });
  }
};
