
/**
 * @fileOverview Dakazina API Client
 * Handles orders, status checks, and data package purchases.
 */

const BASE_URL = process.env.DAKAZINA_BASE_URL || 'https://dakazina.com/api/v1';
const API_TOKEN = process.env.DAKAZINA_API_TOKEN;

async function request(path: string, options: RequestInit = {}) {
  if (!API_TOKEN) {
    throw new Error('Dakazina API token is not configured');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
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
  async buyDataPackage(recipient: string, networkId: number, packageId: string) {
    return request('/buy-data-package', {
      method: 'POST',
      body: JSON.stringify({
        recipient,
        network_id: networkId,
        package_id: packageId,
      }),
    });
  },

  async getOrderStatus(orderCode: string) {
    return request(`/order-status/${orderCode}`);
  },

  async getPackages() {
    return request('/data-packages');
  }
};
