-- Add GST fields to society_profile
ALTER TABLE society_profile
ADD COLUMN IF NOT EXISTS gstin TEXT,
ADD COLUMN IF NOT EXISTS is_gst_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS default_gst_rate NUMERIC DEFAULT 18.0;

-- Update consolidated schema reference (for future installs)
COMMENT ON COLUMN society_profile.gstin IS 'GST Identification Number';
