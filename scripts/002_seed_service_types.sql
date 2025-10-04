-- Insert default service types
INSERT INTO service_types (name) VALUES
  ('Consultation'),
  ('Havan'),
  ('Pooja'),
  ('Kundali Reading'),
  ('Gemstone Consultation'),
  ('Vastu Consultation'),
  ('Matchmaking'),
  ('Marriage Ceremony'),
  ('Others')
ON CONFLICT (name) DO NOTHING;
