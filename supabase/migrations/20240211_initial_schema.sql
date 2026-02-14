-- Create Enums
CREATE TYPE user_role AS ENUM ('app_admin', 'management', 'administration', 'resident', 'security', 'other');
CREATE TYPE society_type AS ENUM ('villa', 'single_block', 'multi_block');
CREATE TYPE unit_type AS ENUM ('villa', 'flat');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue');
CREATE TYPE utility_type AS ENUM ('electricity', 'water', 'gas');
CREATE TYPE channel_type AS ENUM ('society_wide', 'block', 'private');
CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE voting_status AS ENUM ('draft', 'active', 'closed');
CREATE TYPE facility_type AS ENUM ('hall', 'tennis', 'shuttle', 'pickleball', 'swimming', 'room');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- Create Users Table (extends auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role user_role DEFAULT 'resident',
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create Society Profile
CREATE TABLE public.society_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type society_type NOT NULL,
    address TEXT,
    total_units INTEGER,
    established_date DATE,
    registration_number TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create Units
CREATE TABLE public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    society_id UUID REFERENCES public.society_profile(id),
    unit_number TEXT NOT NULL,
    block_name TEXT,
    floor_number INTEGER,
    unit_type unit_type DEFAULT 'flat',
    area_sqft DECIMAL,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create Maintenance Fees
CREATE TABLE public.maintenance_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES public.units(id),
    amount DECIMAL NOT NULL,
    due_date DATE NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method TEXT,
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create Utility Charges
CREATE TABLE public.utility_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES public.units(id),
    utility_type utility_type NOT NULL,
    billing_period_start DATE,
    billing_period_end DATE,
    previous_reading DECIMAL,
    current_reading DECIMAL,
    units_consumed DECIMAL,
    rate_per_unit DECIMAL,
    total_amount DECIMAL,
    payment_status payment_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create Expenses
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    description TEXT,
    amount DECIMAL NOT NULL,
    expense_date DATE NOT NULL,
    approved_by UUID REFERENCES public.users(id),
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Communication Tables
CREATE TABLE public.chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type channel_type DEFAULT 'society_wide',
    participants JSONB, -- Array of user_ids
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id),
    message_text TEXT,
    attachments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raised_by UUID REFERENCES public.users(id),
    category TEXT,
    subject TEXT NOT NULL,
    description TEXT,
    status complaint_status DEFAULT 'open',
    priority complaint_priority DEFAULT 'medium',
    assigned_to UUID REFERENCES public.users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.voting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.users(id),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status voting_status DEFAULT 'draft',
    options JSONB, -- Array of option objects
    results JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voting_id UUID REFERENCES public.voting(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    selected_option TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(voting_id, user_id)
);

-- Facility Management
CREATE TABLE public.visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    visiting_unit_id UUID REFERENCES public.units(id),
    check_in TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    check_out TIMESTAMP WITH TIME ZONE,
    purpose TEXT,
    registered_by UUID REFERENCES public.users(id), -- Security
    approved_by UUID REFERENCES public.users(id) -- Resident
);

CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES public.units(id),
    vehicle_type TEXT,
    registration_number TEXT UNIQUE NOT NULL,
    make_model TEXT,
    color TEXT,
    parking_slot TEXT,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE public.booking_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type facility_type NOT NULL,
    capacity INTEGER,
    hourly_rate DECIMAL,
    booking_rules JSONB,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES public.booking_facilities(id),
    booked_by UUID REFERENCES public.users(id),
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status booking_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    payment_amount DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Initial RLS Policies (Basic)
CREATE POLICY "Users viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert themselves" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Trigger to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'resident');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
