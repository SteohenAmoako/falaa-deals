
-- 1. Profiles Table: Stores user balance and reference codes
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL, 
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  reference_code TEXT UNIQUE NOT NULL,
  wallet_balance DECIMAL(12, 2) DEFAULT 0.00,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Wallet Transactions: Logs all credits and debits
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT CHECK (type IN ('credit', 'debit')) NOT NULL,
  reference TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Rahitalu Orders: Tracks data bundle purchases
CREATE TABLE rahitalu_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  gig TEXT NOT NULL,
  sell_price_ghs DECIMAL(12, 2) NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'delivered', 'failed')) DEFAULT 'pending',
  upstream_status TEXT,
  delivered_gb DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Rahitalu Token: Caches the API access token (internal use)
CREATE TABLE rahitalu_token (
  id INTEGER PRIMARY KEY DEFAULT 1,
  access_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

-- 5. Seed a test user (important for prototype login)
-- The dashboard currently fetches the first profile it finds.
INSERT INTO profiles (user_id, full_name, phone, reference_code, wallet_balance)
VALUES (
  'd9b2f6f2-1234-5678-9012-34567890abcd',
  'John Doe',
  '0241234567',
  'FD-TEST',
  100.00
) ON CONFLICT DO NOTHING;
