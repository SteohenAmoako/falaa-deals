
/**
 * @fileOverview Dakazina API Client
 * Handles orders and status checks using the specific reseller API schema.
 * All credentials are pulled strictly from environment variables.
 */

const BASE_URL = process.env.DATAKAZINA_BASE_URL;
const API_KEY = process.env.DATAKAZINA_API_KEY;

async function request(path: string, options: RequestInit = {}) {
  if (!API_KEY || !BASE_URL) {
    throw new Error('Dakazina API configuration (KEY or BASE_URL) is missing in environment variables');
  }

  const response = await fetch(`${BASE_URL.replace(/\/+$/, '')}${path}`, {
    ...options,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(data.message || `Dakazina API error: ${response.status}`);
  }

  return data;
}

export const dakazinaClient = {
  /**
   * Purchase a single data package
   * @param recipient Phone number in 024... format
   * @param networkId 1 (MTN), 2 (Telecel), 3 (AirtelTigo)
   * @param sharedBundle Size in GB (integer)
   * @param reference Our unique internal reference
   */
  async buyDataPackage(recipient: string, networkId: number, sharedBundle: number, reference: string) {
    return request('/buy-data-package', {
      method: 'POST',
      body: JSON.stringify({
        recipient_msisdn: recipient,
        network_id: networkId,
        shared_bundle: sharedBundle,
        incoming_api_ref: reference,
      }),
    });
  },

  async getPackages() {
    return request('/data-packages');
  }
};
