/**
 * @fileOverview Dakazina API Client
 * Handles orders and status checks using the specific reseller API schema.
 */

const BASE_URL = process.env.DAKAZINA_BASE_URL || 'https://reseller.dakazinabusinessconsult.com/api/v1';
const API_KEY = process.env.DAKAZINA_API_KEY || 'dk_2uU6jK7JfGEPZrTvqzUXv9ZK3JJ3D9mO';

async function request(path: string, options: RequestInit = {}) {
  if (!API_KEY) {
    throw new Error('Dakazina API key is not configured');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  
  // Some endpoints might return empty bodies but 200/201 status
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
