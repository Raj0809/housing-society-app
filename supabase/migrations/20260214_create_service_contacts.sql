-- Create service_contacts table
create table if not exists service_contacts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text not null,
  phone_number text not null,
  category text not null default 'Service', -- 'Emergency', 'Management', 'Service'
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table service_contacts enable row level security;

-- Policies
create policy "Public contacts are viewable by everyone"
  on service_contacts for select
  using (true);

create policy "Admins can insert contacts"
  on service_contacts for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('app_admin', 'management', 'super_admin')
    )
  );

create policy "Admins can update contacts"
  on service_contacts for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('app_admin', 'management', 'super_admin')
    )
  );

create policy "Admins can delete contacts"
  on service_contacts for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('app_admin', 'management', 'super_admin')
    )
  );
