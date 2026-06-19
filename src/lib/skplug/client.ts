/**
 * @fileOverview SK Plug API Client
 * Handles orders, status checks, bundle fetching, and webhook registration.
 */

const BASE_URL = process.env.SKPLUG_BASE_URL || 'https://skdataplug.com/api/v1';
const API_TOKEN = process.env.SKPLUG_API_TOKEN;

async function request(path: string, options: RequestInit = {}) {
  if (!API_TOKEN) {
    throw new Error('SK Plug API token is not configured');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `SK Plug API error: ${response.status}`);
  }

  return response.json();
}

export const skPlugClient = {
  async getBundles() {
    return request('/bundles/');
  },

  async placeOrder(recipient: string, network: string, gbSize: string) {
    return request('/order/', {
      method: 'POST',
      body: JSON.stringify({ recipient, network, gb_size: gbSize }),
    });
  },

  async getOrderStatus(orderId: string) {
    return request(`/status/${orderId}/`);
  },

  async getOrders() {
    return request('/orders/');
  },

  async getCallbackUrl() {
    return request('/callback/');
  },

  async registerCallbackUrl(callbackUrl: string) {
    return request('/callback/', {
      method: 'POST',
      body: JSON.stringify({ callback_url: callbackUrl }),
    });
  },
};
