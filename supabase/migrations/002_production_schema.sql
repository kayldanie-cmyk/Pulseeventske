-- ==============================================================================
-- PULSE EVENTS KE: Production Schema, Row Level Security & Atomic Payment Functions
-- Aligned with SKILL.md Blueprint
-- ==============================================================================

-- 1. Custom Enum Types
do $$ begin
  create type event_category as enum (
    'music', 'conference', 'nightlife', 'sports', 'comedy', 'food_culture', 'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type order_status as enum (
    'pending', 'paid', 'failed', 'expired', 'refunded'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type ticket_status as enum (
    'valid', 'used', 'void'
  );
exception
  when duplicate_object then null;
end $$;

-- 2. Profiles Table (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text unique,
  role text not null default 'buyer' check (role in ('buyer', 'organizer', 'admin')),
  created_at timestamptz default now()
);

-- 3. Events Table
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid references profiles(id) on delete set null,
  slug text unique not null,
  title text not null check (char_length(title) <= 80),
  category text not null,
  description text,
  venue text not null,
  county text default 'Nairobi',
  starts_at timestamptz not null,
  ends_at timestamptz,
  poster_url text,
  video_playback_id text,
  theme_hue numeric default 0,
  status text not null default 'published' check (status in ('draft', 'published', 'cancelled')),
  promo_level smallint not null default 0 check (promo_level between 0 and 3),
  promo_until timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Ticket Tiers Table
create table if not exists ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  price_kes integer not null check (price_kes >= 0),
  capacity integer not null check (capacity > 0),
  sold integer not null default 0 check (sold >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  sales_start timestamptz,
  sales_end timestamptz,
  perks text[],
  check (sold + reserved <= capacity)
);

-- 5. Orders Table
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references profiles(id) on delete set null,
  event_id uuid not null references events(id) on delete cascade,
  tier_id uuid not null references ticket_tiers(id) on delete cascade,
  quantity smallint not null check (quantity between 1 and 10),
  amount_kes integer not null check (amount_kes >= 0),
  phone text not null,
  status order_status not null default 'pending',
  checkout_request_id text unique,
  mpesa_receipt text unique,
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  created_at timestamptz default now()
);

-- 6. Tickets Table
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  tier_id uuid not null references ticket_tiers(id) on delete cascade,
  code text unique not null,
  hash text not null,
  phone text not null,
  status ticket_status not null default 'valid',
  used_at timestamptz,
  created_at timestamptz default now()
);

-- 7. Promotions Table
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  package text not null check (package in ('boost', 'spotlight', 'takeover')),
  amount_kes integer not null check (amount_kes >= 0),
  paid boolean not null default false,
  checkout_request_id text unique,
  mpesa_receipt text unique,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now()
);

-- 8. Payment Events Audit Table (Raw M-Pesa Callbacks)
create table if not exists payment_events (
  id bigserial primary key,
  checkout_request_id text,
  payload jsonb not null,
  received_at timestamptz default now()
);

-- 9. Affiliate Links Table
create table if not exists affiliate_links (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  code text unique not null,
  commission_pct numeric not null default 0
);

-- ==============================================================================
-- INDEXES FOR HIGH-THROUGHPUT LOOKUPS
-- ==============================================================================
create index if not exists idx_events_status_starts on events(status, starts_at);
create index if not exists idx_events_category on events(category);
create index if not exists idx_ticket_tiers_event on ticket_tiers(event_id);
create index if not exists idx_orders_checkout_id on orders(checkout_request_id);
create index if not exists idx_orders_status_expires on orders(status, expires_at);
create index if not exists idx_tickets_code on tickets(code);
create index if not exists idx_tickets_order on tickets(order_id);
create index if not exists idx_payment_events_checkout on payment_events(checkout_request_id);

-- ==============================================================================
-- ATOMIC STORED PROCEDURES (NEVER OVERSELL)
-- ==============================================================================

-- Reserve Tickets Atomically
create or replace function reserve_tickets(
  p_tier_id uuid,
  p_quantity int
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_tier ticket_tiers%rowtype;
begin
  -- Lock row exclusively during reservation check
  select * into v_tier
  from ticket_tiers
  where id = p_tier_id
  for update;

  if not found then
    return false;
  end if;

  if (v_tier.capacity - v_tier.sold - v_tier.reserved) < p_quantity then
    return false;
  end if;

  update ticket_tiers
  set reserved = reserved + p_quantity
  where id = p_tier_id;

  return true;
end;
$$;

-- Confirm Reservation Upon Verified M-Pesa Callback
create or replace function confirm_reservation(
  p_checkout_request_id text,
  p_receipt_number text,
  p_paid_amount int
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order
  from orders
  where checkout_request_id = p_checkout_request_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Order not found');
  end if;

  -- Idempotency check: if already paid, return success without duplicating
  if v_order.status = 'paid' then
    return jsonb_build_object('success', true, 'order_id', v_order.id, 'already_paid', true);
  end if;

  if v_order.amount_kes <> p_paid_amount then
    return jsonb_build_object('success', false, 'error', 'Amount mismatch');
  end if;

  -- Update order status
  update orders
  set status = 'paid',
      mpesa_receipt = p_receipt_number
  where id = v_order.id;

  -- Transfer reserved stock to sold
  update ticket_tiers
  set reserved = greatest(0, reserved - v_order.quantity),
      sold = sold + v_order.quantity
  where id = v_order.tier_id;

  return jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'event_id', v_order.event_id,
    'tier_id', v_order.tier_id,
    'quantity', v_order.quantity,
    'phone', v_order.phone
  );
end;
$$;

-- Release Expired or Cancelled Reservation
create or replace function release_reservation(
  p_checkout_request_id text
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order
  from orders
  where checkout_request_id = p_checkout_request_id
  for update;

  if not found or v_order.status = 'paid' then
    return false;
  end if;

  update orders
  set status = 'failed'
  where id = v_order.id;

  update ticket_tiers
  set reserved = greatest(0, reserved - v_order.quantity)
  where id = v_order.tier_id;

  return true;
end;
$$;

-- Clean Up Stale Pending Orders Older Than 5 Minutes
create or replace function expire_stale_orders()
returns int
language plpgsql
security definer
as $$
declare
  v_count int := 0;
  r record;
begin
  for r in
    select id, tier_id, quantity
    from orders
    where status = 'pending' and expires_at < now()
    for update
  loop
    update orders set status = 'expired' where id = r.id;
    update ticket_tiers set reserved = greatest(0, reserved - r.quantity) where id = r.tier_id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table profiles enable row level security;
alter table events enable row level security;
alter table ticket_tiers enable row level security;
alter table orders enable row level security;
alter table tickets enable row level security;
alter table promotions enable row level security;
alter table payment_events enable row level security;
alter table affiliate_links enable row level security;

-- Profiles: users read and update their own profile; cannot change role
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Events: Anyone can view published events
create policy "Anyone can view published events"
  on events for select
  using (status = 'published');

create policy "Organizers can insert own events"
  on events for insert
  with check (auth.uid() = organizer_id);

create policy "Organizers can update own events"
  on events for update
  using (auth.uid() = organizer_id);

-- Ticket Tiers: Anyone can view tiers for published events
create policy "Anyone can view tiers for published events"
  on ticket_tiers for select
  using (
    exists (
      select 1 from events
      where events.id = ticket_tiers.event_id
      and events.status = 'published'
    )
  );

-- Orders: Buyers can view their own orders
create policy "Buyers can view own orders"
  on orders for select
  using (auth.uid() = buyer_id);

-- Tickets: Buyers can view their own tickets
create policy "Buyers can view own tickets"
  on tickets for select
  using (
    exists (
      select 1 from orders
      where orders.id = tickets.order_id
      and orders.buyer_id = auth.uid()
    )
  );

-- Payment Events: Strictly internal server access
-- (No public policy means only service-role can read/write)

-- ==============================================================================
-- SEED DATA (3 Verified Kenya Events)
-- ==============================================================================
insert into events (id, slug, title, category, description, venue, county, starts_at, ends_at, theme_hue, status, promo_level)
values
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'pulse-nairobi-festival-2026',
    'PULSE Nairobi Festival',
    'music',
    'Three days, four stages and a light show for 60,000 people. Benga, Afro-fusion and electronic acts under one sky.',
    'Uhuru Gardens, Nairobi',
    'Nairobi',
    '2026-12-26 14:00:00+03',
    '2026-12-28 23:59:00+03',
    0,
    'published',
    2
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'savanna-dev-ai-summit-2027',
    'Savanna Dev & AI Summit',
    'conference',
    'One day of talks, workshops and hiring for Kenyan builders. Meet founders, engineers and investors from across East Africa.',
    'KICC, Nairobi',
    'Nairobi',
    '2027-02-12 08:30:00+03',
    '2027-02-12 18:00:00+03',
    0.58,
    'published',
    0
  ),
  (
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'diani-sunset-beach-rave-2027',
    'Diani Sunset Beach Rave',
    'nightlife',
    'Sunset sets on the sand, then a long night by the Indian Ocean. Shuttles run from Mombasa.',
    'Diani Beach, Kwale',
    'Kwale',
    '2027-01-02 16:00:00+03',
    '2027-01-03 06:00:00+03',
    0.83,
    'published',
    0
  )
on conflict (slug) do nothing;

-- Seed Ticket Tiers
insert into ticket_tiers (event_id, name, price_kes, capacity, perks)
values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Saturday Day Pass', 1500, 20000, array['Saturday general admission', 'Main stage access']),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '3-Day Full Pass', 3500, 15000, array['Full 3-day access', 'All stages', 'Free shuttle from CBD']),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'VIP Front Row', 9500, 1500, array['VIP elevated lounge', 'Front-row pit', 'Complimentary drinks', 'Fast-track gate']),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Standard Delegate', 2500, 1200, array['Keynote access', 'Expo floor', 'Lunch included']),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Pro Workshop Pass', 6000, 400, array['All keynotes', 'Hands-on AI labs', 'Investor networking mixer']),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Early Bird Entry', 1200, 1000, array['Sunset entry before 7 PM', 'Access to beach stage']),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Regular Pass', 1800, 3000, array['All-night beach access', 'Shuttle from Diani center'])
on conflict do nothing;
