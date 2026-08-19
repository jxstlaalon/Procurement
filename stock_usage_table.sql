-- Stock Usage table: tracks all stock movements (decreases + restocking)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS stock_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES inventory(id),
  item_name TEXT NOT NULL,
  item_code TEXT,
  unit TEXT,
  quantity INTEGER NOT NULL,
  direction TEXT NOT NULL DEFAULT 'decrease',
  reason TEXT NOT NULL,
  usage_month TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stock_usage ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'stock_usage_select' AND tablename = 'stock_usage') THEN
    CREATE POLICY "stock_usage_select" ON stock_usage FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'stock_usage_insert' AND tablename = 'stock_usage') THEN
    CREATE POLICY "stock_usage_insert" ON stock_usage FOR INSERT WITH CHECK (true);
  END IF;
END $$;
