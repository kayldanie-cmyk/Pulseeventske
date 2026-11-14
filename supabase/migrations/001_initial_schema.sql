-- Pulse Events KE: initial schema
-- Run with: supabase db push

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  category text not null,
  description text,
  venue text not null,
  date_start timestamptz not null,
  date_end timestamptz,
  hue real default 0,
  promoted boolean default false,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  name text not null,
  price integer not null,
  capacity integer,
  sold integer default 0,
  perks text[]
);

create table if not exists tickets (
  id text primary key,
  event_id uuid references events(id),
  tier_id uuid references tiers(id),
  email text not null,
  phone text not null,
  hash text not null,
  status text default 'pending',
  mpesa_receipt text,
  issued_at timestamptz default now()
);

create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  package text not null,
  email text not null,
  status text default 'pending',
  amount integer not null,
  created_at timestamptz default now()
);
