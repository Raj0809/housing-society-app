-- Booking Cancellations Table
CREATE TABLE booking_cancellations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    request_reason TEXT,
    requested_by UUID REFERENCES users(id),
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_response TEXT,
    cancellation_charges NUMERIC DEFAULT 0,
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER update_booking_cancellations_updated_at BEFORE UPDATE ON booking_cancellations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS
ALTER TABLE booking_cancellations ENABLE ROW LEVEL SECURITY;

-- Note: Invoices are handled via existing 'maintenance_fees' table with fee_type='facility_booking'
