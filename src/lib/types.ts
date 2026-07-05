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
  provider: 'skplug' | 'rahitalu' | 'dakazina' | 'bytemedeals' | 'diceconsult';
  provider_bundle_id: string;
  network: string;
  gb_size: number;
  label: string;
  cost_price_ghs: number;
  is_active: boolean;
  sell_price_ghs?: number;
};

export type Order = {
  id: string;
  customer_id: string;
  store_id: string | null;
  package_id: number;
  network_id: number;
  phone_number: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'delivered' | 'failed';
  created_at: string;
  updated_at: string;
  actual_cost: number;
  reseller_profit: number;
  platform_profit: number | null;
  payment_reference: string | null;
  customer_phone: string;
  dakazina_order_id: string | null;
};
