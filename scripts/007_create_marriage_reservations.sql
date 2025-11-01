-- Marriage reservations management
-- Dedicated table for marriage ceremony reservations (different from regular reservations)

CREATE TABLE marriage_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL,
  notes TEXT,
  status TEXT CHECK (status IN ('active', 'cancelled')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE marriage_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all operations on marriage_reservations" ON marriage_reservations
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_marriage_reservations_contact_id ON marriage_reservations(contact_id);
CREATE INDEX idx_marriage_reservations_date ON marriage_reservations(reservation_date);
CREATE INDEX idx_marriage_reservations_status ON marriage_reservations(status);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_marriage_reservations_updated_at
  BEFORE UPDATE ON marriage_reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
