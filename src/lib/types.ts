
export type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  reference_code: string;
  wallet_balance: number;
  is_admin: boolean;
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

export type RahitaluToken = {
  id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  updated_at: string;
};

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
