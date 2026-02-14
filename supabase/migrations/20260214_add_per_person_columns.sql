-- Add per-person flag to facilities
ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS per_person_applicable BOOLEAN DEFAULT false;

-- Add number of persons to bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS number_of_persons INTEGER DEFAULT 1;

-- Add updated_at trigger for facilities if not exists (optional, good practice)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_facilities_updated_at') THEN
        CREATE TRIGGER update_facilities_updated_at 
        BEFORE UPDATE ON facilities 
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;
