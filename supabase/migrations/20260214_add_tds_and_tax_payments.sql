-- Add TDS columns to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tds_percentage NUMERIC DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tds_amount NUMERIC DEFAULT 0;

-- Create tax_payments table
CREATE TABLE IF NOT EXISTS tax_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    tax_type TEXT NOT NULL CHECK (tax_type IN ('TDS', 'GST')),
    amount_paid NUMERIC NOT NULL,
    payment_date DATE NOT NULL,
    reference_number TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add simple RLS policies for tax_payments (assuming public access for now or authenticated)
ALTER TABLE tax_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for all users" ON tax_payments
    FOR ALL USING (true) WITH CHECK (true);
