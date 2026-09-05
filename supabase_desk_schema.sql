-- ==========================================================
-- APE BROKER DESK — SUPABASE POSTGRESQL SCHEMA & RLS POLICIES
-- Target database: Supabase (Robinhood EVM indexing cache)
-- ==========================================================

-- 1. Desks Table (1 NFT = 1 Desk)
CREATE TABLE IF NOT EXISTS public.apebroker_desks (
  token_id INT PRIMARY KEY,
  owner VARCHAR(64) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  boost_count SMALLINT NOT NULL DEFAULT 0,
  base_weight INT NOT NULL DEFAULT 100,
  current_weight INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Desk Boost Events
CREATE TABLE IF NOT EXISTS public.apebroker_desk_boosts (
  id BIGSERIAL PRIMARY KEY,
  token_id INT NOT NULL REFERENCES public.apebroker_desks(token_id) ON DELETE CASCADE,
  owner VARCHAR(64) NOT NULL,
  boost_number SMALLINT NOT NULL,
  cost NUMERIC NOT NULL,
  weight_before INT NOT NULL,
  weight_after INT NOT NULL,
  tx_hash VARCHAR(128) NOT NULL,
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Reward Deposit Events (Admin Native ETH Deposits)
CREATE TABLE IF NOT EXISTS public.apebroker_reward_deposits (
  id BIGSERIAL PRIMARY KEY,
  depositor VARCHAR(64) NOT NULL,
  amount_eth NUMERIC NOT NULL,
  epoch BIGINT NOT NULL,
  tx_hash VARCHAR(128) NOT NULL,
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Reward Claims (Single, Batch All, or Historical Claims)
CREATE TABLE IF NOT EXISTS public.apebroker_reward_claims (
  id BIGSERIAL PRIMARY KEY,
  token_id INT,
  claimer VARCHAR(64) NOT NULL,
  amount_eth NUMERIC NOT NULL,
  claim_type VARCHAR(32) NOT NULL DEFAULT 'single',
  tx_hash VARCHAR(128) NOT NULL,
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Protocol Fee Claims (Admin $APEBROKE claims to Treasury)
CREATE TABLE IF NOT EXISTS public.apebroker_protocol_fee_claims (
  id BIGSERIAL PRIMARY KEY,
  treasury VARCHAR(64) NOT NULL,
  amount_apebroke NUMERIC NOT NULL,
  tx_hash VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.apebroker_desks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apebroker_desk_boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apebroker_reward_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apebroker_reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apebroker_protocol_fee_claims ENABLE ROW LEVEL SECURITY;

-- Public Read & Insert Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'apebroker_desks' AND policyname = 'Public read apebroker_desks') THEN
    CREATE POLICY "Public read apebroker_desks" ON public.apebroker_desks FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'apebroker_desks' AND policyname = 'Public insert/update apebroker_desks') THEN
    CREATE POLICY "Public insert/update apebroker_desks" ON public.apebroker_desks FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'apebroker_desk_boosts' AND policyname = 'Public read apebroker_desk_boosts') THEN
    CREATE POLICY "Public read apebroker_desk_boosts" ON public.apebroker_desk_boosts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'apebroker_desk_boosts' AND policyname = 'Public insert apebroker_desk_boosts') THEN
    CREATE POLICY "Public insert apebroker_desk_boosts" ON public.apebroker_desk_boosts FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'apebroker_reward_deposits' AND policyname = 'Public read apebroker_reward_deposits') THEN
    CREATE POLICY "Public read apebroker_reward_deposits" ON public.apebroker_reward_deposits FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'apebroker_reward_deposits' AND policyname = 'Public insert apebroker_reward_deposits') THEN
    CREATE POLICY "Public insert apebroker_reward_deposits" ON public.apebroker_reward_deposits FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'apebroker_reward_claims' AND policyname = 'Public read apebroker_reward_claims') THEN
    CREATE POLICY "Public read apebroker_reward_claims" ON public.apebroker_reward_claims FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'apebroker_reward_claims' AND policyname = 'Public insert apebroker_reward_claims') THEN
    CREATE POLICY "Public insert apebroker_reward_claims" ON public.apebroker_reward_claims FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'apebroker_protocol_fee_claims' AND policyname = 'Public read apebroker_protocol_fee_claims') THEN
    CREATE POLICY "Public read apebroker_protocol_fee_claims" ON public.apebroker_protocol_fee_claims FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'apebroker_protocol_fee_claims' AND policyname = 'Public insert apebroker_protocol_fee_claims') THEN
    CREATE POLICY "Public insert apebroker_protocol_fee_claims" ON public.apebroker_protocol_fee_claims FOR INSERT WITH CHECK (true);
  END IF;
END $$;
