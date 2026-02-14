-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
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

-- Users Table (Extends auth.users or standalone, assuming standalone public table linked to auth)
CREATE TABLE users (
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
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Management Committee Table
CREATE TABLE management_committee (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
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
    owner_id UUID REFERENCES users(id),
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
    expense_date DATE DEFAULT CURRENT_DATE,
    approved_by UUID REFERENCES users(id),
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Channels Table
CREATE TABLE chat_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type channel_type NOT NULL,
    participants JSONB DEFAULT '[]',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages Table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    message_text TEXT,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Complaints Table
CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raised_by UUID REFERENCES users(id),
    category TEXT,
    subject TEXT NOT NULL,
    description TEXT,
    status complaint_status DEFAULT 'open',
    priority complaint_priority DEFAULT 'medium',
    assigned_to UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Voting Table
CREATE TABLE voting (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
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
    user_id UUID REFERENCES users(id),
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
    registered_by UUID REFERENCES users(id), -- security or resident
    approved_by UUID REFERENCES users(id), -- resident
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

-- Booking Facilities Table
CREATE TABLE booking_facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type facility_type NOT NULL,
    capacity INTEGER,
    hourly_rate NUMERIC DEFAULT 0,
    booking_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings Table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES booking_facilities(id),
    booked_by UUID REFERENCES users(id),
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status booking_status DEFAULT 'pending',
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    payment_amount NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_society_profile_updated_at BEFORE UPDATE ON society_profile FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE booking_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Start with permissive for development, then tighten)
-- For now, allow authenticated users to view most things, and insert/update based on logic (TBD)
-- Note: Real RLS policies should be much more granular based on roles.

-- Users can read their own profile
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);

-- Everyone can view society profile
CREATE POLICY "Everyone can view society profile" ON society_profile FOR SELECT USING (true);

-- Residents can view units
CREATE POLICY "Residents can view units" ON units FOR SELECT USING (auth.role() = 'authenticated');

