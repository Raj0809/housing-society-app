-- Add invoice_id to bookings to link them to maintenance_fees
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES maintenance_fees(id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_bookings_invoice_id ON bookings(invoice_id);
