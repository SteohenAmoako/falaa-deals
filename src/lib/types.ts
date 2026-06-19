
export type UserRole = 'api_user' | 'falaa' | 'base';

export type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  reference_code: string;
  wallet_balance: number;
  is_admin: boolean;
  role: UserRole;
  created_at: string;
};

export type WalletTransaction = {
  id: string;
  user_id: string;
  amount: number;
  type: 'credit' | 'debit';
  reference: string;
  status: 'pending' | 'success' | 'failed';
  description: string;
  created_at: string;
};

export type Bundle = {
  id: string;
  provider: 'skplug' | 'rahitalu';
  provider_bundle_id: string;
  network: string;
  gb_size: number;
  label: string;
  cost_price_ghs: number;
  is_active: boolean;
  sell_price_ghs?: number; // Populated based on role
};

export type RahitaluOrder = {
  id: string;
  user_id: string;
  phone: string;
  plan_id: string;
  gig: string;
  sell_price_ghs: number;
  reference: string;
  status: 'pending' | 'processing' | 'delivered' | 'failed';
  upstream_status: string;
  delivered_gb: number;
  created_at: string;
};

// Legacy hardcoded plans - keeping for temporary compatibility during transition
export const PLANS = [
  {
    id: '6a282f0167c07f8445745e7b',
    name: 'Plan A',
    size: '3.4GB',
    price: 8,
    description: 'MTN High-Speed Data'
  },
  {
    id: '6a282eb267c07f8445745dcc',
    name: 'Plan B',
    size: '5.1GB',
    price: 14,
    description: 'MTN High-Speed Data'
  }
];
