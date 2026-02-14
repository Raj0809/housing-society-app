-- Consolidated Schema for Housing Society App (2026-02-14)
-- Includes base schema (2025) and all 2026 enhancements.
-- Tables renamed to match application usage: 'users' -> 'profiles', 'booking_facilities' -> 'facilities'

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('app_admin', 'management', 'administration', 'resident', 'security', 'other');
    CREATE TYPE society_type AS ENUM ('villa', 'single_block', 'multi_block');
    CREATE TYPE committee_position AS ENUM ('president', 'secretary', 'treasurer', 'member');
    CREATE TYPE unit_type AS ENUM ('villa', 'flat');
    CREATE TYPE utility_type AS ENUM ('electricity', 'water', 'gas');
    CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
    CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high');
    CREATE TYPE channel_type AS ENUM ('society_wide', 'block', 'private');
    CREATE TYPE voting_status AS ENUM ('draft', 'active', 'closed');
    CREATE TYPE facility_type AS ENUM ('hall', 'tennis', 'shuttle', 'pickleball', 'swimming', 'room');
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Profiles Table (formerly users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role user_role DEFAULT 'resident',
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Society Profile Table
CREATE TABLE society_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type society_type NOT NULL,
    address TEXT,
    total_units INTEGER,
    established_date DATE,
    registration_number TEXT,
    logo_url TEXT,
    gstin TEXT,
    is_gst_registered BOOLEAN DEFAULT false,
    default_gst_rate NUMERIC DEFAULT 18.0,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Management Committee Table
CREATE TABLE management_committee (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    position committee_position NOT NULL,
    term_start DATE,
    term_end DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Units Table
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES society_profile(id),
    unit_number TEXT NOT NULL,
    block_name TEXT,
    floor_number INTEGER,
    unit_type unit_type NOT NULL,
    area_sqft NUMERIC,
    owner_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Fees Table
CREATE TABLE maintenance_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id),
    amount NUMERIC NOT NULL,
    due_date DATE,
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'overdue')),
    payment_date DATE,
    payment_method TEXT,
    transaction_id TEXT,
    taxable_amount NUMERIC,
    cgst_amount NUMERIC DEFAULT 0,
    sgst_amount NUMERIC DEFAULT 0,
    igst_amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC,
    fee_type TEXT, -- e.g. 'monthly', 'facility_booking', 'cancellation_charge'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Utility Charges Table
CREATE TABLE utility_charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id),
    utility_type utility_type NOT NULL,
    billing_period_start DATE,
    billing_period_end DATE,
    previous_reading NUMERIC,
    current_reading NUMERIC,
    units_consumed NUMERIC,
    rate_per_unit NUMERIC,
    total_amount NUMERIC,
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses Table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC NOT NULL,
    taxable_amount NUMERIC,
    cgst_amount NUMERIC DEFAULT 0,
    sgst_amount NUMERIC DEFAULT 0,
    igst_amount NUMERIC DEFAULT 0,
    expense_date DATE DEFAULT CURRENT_DATE,
    approved_by UUID REFERENCES profiles(id),
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Channels Table
CREATE TABLE chat_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type channel_type NOT NULL,
    participants JSONB DEFAULT '[]',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages Table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id),
    message_text TEXT,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Complaints Table
CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raised_by UUID REFERENCES profiles(id),
    category TEXT,
    subject TEXT NOT NULL,
    description TEXT,
    status complaint_status DEFAULT 'open',
    priority complaint_priority DEFAULT 'medium',
    assigned_to UUID REFERENCES profiles(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Voting Table
CREATE TABLE voting (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES profiles(id),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status voting_status DEFAULT 'draft',
    options JSONB NOT NULL,
    results JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes Table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voting_id UUID REFERENCES voting(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    selected_option TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(voting_id, user_id)
);

-- Visitors Table
CREATE TABLE visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    visiting_unit_id UUID REFERENCES units(id),
    check_in TIMESTAMPTZ DEFAULT NOW(),
    check_out TIMESTAMPTZ,
    purpose TEXT,
    registered_by UUID REFERENCES profiles(id), -- security or resident
    approved_by UUID REFERENCES profiles(id), -- resident
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles Table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id),
    vehicle_type TEXT,
    registration_number TEXT NOT NULL,
    make_model TEXT,
    color TEXT,
    parking_slot TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Facilities Table (formerly booking_facilities)
CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type facility_type NOT NULL,
    capacity INTEGER,
    hourly_rate NUMERIC DEFAULT 0,
    booking_rules JSONB DEFAULT '{}',
    per_person_applicable BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings Table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES facilities(id),
    booked_by UUID REFERENCES profiles(id),
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status booking_status DEFAULT 'pending',
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    payment_amount NUMERIC,
    number_of_persons INTEGER DEFAULT 1,
    invoice_id UUID REFERENCES maintenance_fees(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_invoice_id ON bookings(invoice_id);

-- Booking Cancellations Table
CREATE TABLE booking_cancellations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    request_reason TEXT,
    requested_by UUID REFERENCES profiles(id),
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_response TEXT,
    cancellation_charges NUMERIC DEFAULT 0,
    reviewed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Contacts Table
create table if not exists service_contacts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text not null,
  phone_number text not null,
  category text not null default 'Service',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create trigger to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_society_profile_updated_at BEFORE UPDATE ON society_profile FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_booking_cancellations_updated_at BEFORE UPDATE ON booking_cancellations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE society_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_committee ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_contacts ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
-- Profiles
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Everyone can view society profile" ON society_profile FOR SELECT USING (true);
CREATE POLICY "Residents can view units" ON units FOR SELECT USING (auth.role() = 'authenticated');
-- Service Contacts
create policy "Public contacts are viewable by everyone" on service_contacts for select using (true);
create policy "Admins can insert contacts" on service_contacts for insert with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('app_admin', 'management')));
create policy "Admins can update contacts" on service_contacts for update using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('app_admin', 'management')));
create policy "Admins can delete contacts" on service_contacts for delete using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('app_admin', 'management')));

-- Trigger to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'resident');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger exists before creating
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;
