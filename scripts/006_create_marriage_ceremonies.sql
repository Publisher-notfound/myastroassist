-- Marriage ceremonies management system
-- Allows multiple ceremonies within one marriage service

CREATE TABLE marriage_ceremonies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marriage_service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  ceremony_name TEXT NOT NULL,
  ceremony_date DATE NOT NULL,
  ceremony_time TIME NOT NULL,
  duration INTEGER, -- duration in minutes
  payment_amount DECIMAL(10,2),
  payment_status TEXT CHECK (payment_status IN ('paid', 'unpaid')) DEFAULT 'unpaid',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ceremony name suggestions for autocomplete
CREATE TABLE marriage_ceremony_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ceremony_name TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE marriage_ceremonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE marriage_ceremony_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all operations on marriage_ceremonies" ON marriage_ceremonies
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on marriage_ceremony_suggestions" ON marriage_ceremony_suggestions
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_marriage_ceremonies_service_id ON marriage_ceremonies(marriage_service_id);
CREATE INDEX idx_marriage_ceremonies_date ON marriage_ceremonies(ceremony_date);
CREATE INDEX idx_marriage_ceremonies_name ON marriage_ceremony_suggestions(ceremony_name);

-- Function to update ceremony suggestion usage
CREATE OR REPLACE FUNCTION update_ceremony_suggestion_usage(p_ceremony_name TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO marriage_ceremony_suggestions (ceremony_name, usage_count, last_used)
  VALUES (p_ceremony_name, 1, NOW())
  ON CONFLICT (ceremony_name)
  DO UPDATE SET
    usage_count = marriage_ceremony_suggestions.usage_count + 1,
    last_used = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get ceremony suggestions ordered by usage
CREATE OR REPLACE FUNCTION get_ceremony_suggestions()
RETURNS TABLE (ceremony_name TEXT, usage_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mcs.ceremony_name,
    mcs.usage_count
  FROM marriage_ceremony_suggestions mcs
  ORDER BY mcs.usage_count DESC, mcs.last_used DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_marriage_ceremonies_updated_at
  BEFORE UPDATE ON marriage_ceremonies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
