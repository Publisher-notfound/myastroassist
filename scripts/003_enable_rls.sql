-- Enable Row Level Security (RLS) for all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations for authenticated users
-- Since this is a single-user app, we'll allow all operations for any authenticated user

-- Contacts policies
CREATE POLICY "Allow all operations on contacts" ON contacts
  FOR ALL USING (true) WITH CHECK (true);

-- Service types policies  
CREATE POLICY "Allow all operations on service_types" ON service_types
  FOR ALL USING (true) WITH CHECK (true);

-- Services policies
CREATE POLICY "Allow all operations on services" ON services
  FOR ALL USING (true) WITH CHECK (true);
