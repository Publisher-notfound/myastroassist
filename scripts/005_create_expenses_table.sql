-- Create expenses table for expense tracking system
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'bank', 'other')),
  notes TEXT,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations on expenses" ON expenses
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_title ON expenses(title);
CREATE INDEX idx_expenses_category_date ON expenses(category, expense_date);

-- Create a function to get unique titles by category
CREATE OR REPLACE FUNCTION get_expense_titles_by_category(p_category TEXT)
RETURNS TABLE (title TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DISTINCT e.title,
    COUNT(*) as count
  FROM expenses e
  WHERE LOWER(e.category) = LOWER(p_category)
  AND e.title IS NOT NULL
  AND e.title != ''
  GROUP BY e.title
  ORDER BY count DESC, e.title;
END;
$$ LANGUAGE plpgsql;
