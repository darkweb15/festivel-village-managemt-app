-- =============================================================================
-- Sri Vinayaka Grama Committee — schema
-- Run this first, then 20260101000100_rls.sql
-- =============================================================================

create extension if not exists "pgcrypto";

-- Reusable updated_at trigger ------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Enums -----------------------------------------------------------------------

do $$ begin
  create type public.user_role as enum ('admin', 'editor', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.donation_status as enum ('pending', 'verified', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.announcement_category as enum ('pooja', 'events', 'general');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.media_type as enum ('photo', 'video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sponsor_tier as enum ('platinum', 'gold', 'silver', 'supporter');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- users — mirrors auth.users, carries the committee role
-- =============================================================================

create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.user_role not null default 'viewer',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists users_role_idx on public.users (role) where is_active;

drop trigger if exists users_touch on public.users;
create trigger users_touch before update on public.users
  for each row execute function public.touch_updated_at();

-- Every new auth user gets a row, defaulting to the powerless 'viewer' role.
-- Promotion to 'admin' is a deliberate manual action (see README).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Role helpers used by every RLS policy. SECURITY DEFINER so that reading the
-- caller's own role does not itself require a policy (avoids recursion).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.is_active and u.role = 'admin'
  );
$$;

create or replace function public.can_edit()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.is_active and u.role in ('admin', 'editor')
  );
$$;

-- =============================================================================
-- festival_settings — single row of committee-editable festival config
-- =============================================================================

create table if not exists public.festival_settings (
  id                 boolean primary key default true,
  festival_name      text not null default 'Vinayaka Chavithi',
  festival_year      integer not null default extract(year from now()),
  tagline            text,
  invocation         text default '|| GANAPATHI BAPPA MORYA ||',
  about              text,
  start_date         date,
  end_date           date,
  donation_goal      numeric(12, 2) not null default 0,
  upi_id             text,
  upi_payee_name     text,
  live_darshan_url   text,
  nimajjanam_date    date,
  nimajjanam_time    time,
  nimajjanam_route   text,
  venue_name         text,
  venue_address      text,
  latitude           numeric(9, 6),
  longitude          numeric(9, 6),
  map_embed_url      text,
  directions_url     text,
  hero_image_url     text,
  updated_at         timestamptz not null default now(),
  -- Enforces exactly one settings row.
  constraint festival_settings_singleton check (id)
);

drop trigger if exists festival_settings_touch on public.festival_settings;
create trigger festival_settings_touch before update on public.festival_settings
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- committee_members
-- =============================================================================

create table if not exists public.committee_members (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  position      text not null,
  phone         text,
  email         text,
  photo_url     text,
  bio           text,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists committee_members_order_idx
  on public.committee_members (display_order, name) where is_active;

drop trigger if exists committee_members_touch on public.committee_members;
create trigger committee_members_touch before update on public.committee_members
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- events
-- =============================================================================

create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  event_date   date not null,
  start_time   time,
  end_time     time,
  day_part     text,                     -- "Morning" / "Evening" / "Afternoon"
  venue        text,
  category     text not null default 'general',
  image_url    text,
  is_cultural  boolean not null default false,
  is_featured  boolean not null default false,
  is_published boolean not null default true,
  created_by   uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists events_date_idx
  on public.events (event_date, start_time) where is_published;

drop trigger if exists events_touch on public.events;
create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- pooja_schedule
-- =============================================================================

create table if not exists public.pooja_schedule (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  pooja_date    date not null,
  start_time    time not null,
  end_time      time,
  priest_name   text,
  is_daily      boolean not null default false,
  is_published  boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pooja_schedule_date_idx
  on public.pooja_schedule (pooja_date, start_time) where is_published;

drop trigger if exists pooja_schedule_touch on public.pooja_schedule;
create trigger pooja_schedule_touch before update on public.pooja_schedule
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- announcements
-- =============================================================================

create table if not exists public.announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  category     public.announcement_category not null default 'general',
  is_pinned    boolean not null default false,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_by   uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists announcements_feed_idx
  on public.announcements (is_pinned desc, published_at desc) where is_published;

drop trigger if exists announcements_touch on public.announcements;
create trigger announcements_touch before update on public.announcements
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- donations
--
-- Rows created by the public donation form land as 'pending'. Nothing in this
-- application verifies a UPI payment; a committee member must confirm the
-- transfer in their bank/UPI app and then set status = 'verified'.
-- =============================================================================

create table if not exists public.donations (
  id             uuid primary key default gen_random_uuid(),
  donor_name     text not null,
  donor_phone    text,
  amount         numeric(12, 2) not null check (amount > 0),
  donation_date  date not null default current_date,
  payment_method text not null default 'upi',
  transaction_ref text,
  notes          text,
  status         public.donation_status not null default 'pending',
  is_anonymous   boolean not null default false,
  is_public      boolean not null default true,
  source         text not null default 'public_form',  -- or 'admin'
  verified_by    uuid references public.users (id) on delete set null,
  verified_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists donations_status_idx
  on public.donations (status, donation_date desc);
create index if not exists donations_public_idx
  on public.donations (donation_date desc)
  where status = 'verified' and is_public;

drop trigger if exists donations_touch on public.donations;
create trigger donations_touch before update on public.donations
  for each row execute function public.touch_updated_at();

-- Stamp who verified a donation and when, whenever status flips to 'verified'.
create or replace function public.stamp_donation_verification()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'verified' and coalesce(old.status, 'pending') is distinct from 'verified' then
    new.verified_by := coalesce(new.verified_by, auth.uid());
    new.verified_at := coalesce(new.verified_at, now());
  elsif new.status <> 'verified' then
    new.verified_by := null;
    new.verified_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists donations_verification on public.donations;
create trigger donations_verification before insert or update on public.donations
  for each row execute function public.stamp_donation_verification();

-- =============================================================================
-- expenses
-- =============================================================================

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  category     text not null default 'general',
  amount       numeric(12, 2) not null check (amount > 0),
  expense_date date not null default current_date,
  vendor       text,
  notes        text,
  receipt_url  text,
  is_public    boolean not null default true,
  recorded_by  uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists expenses_date_idx on public.expenses (expense_date desc);

drop trigger if exists expenses_touch on public.expenses;
create trigger expenses_touch before update on public.expenses
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- gallery
-- =============================================================================

create table if not exists public.gallery (
  id            uuid primary key default gen_random_uuid(),
  title         text,
  caption       text,
  media_type    public.media_type not null default 'photo',
  url           text not null,
  thumbnail_url text,
  album         text not null default 'Festival Moments',
  width         integer,
  height        integer,
  is_highlight  boolean not null default false,
  is_published  boolean not null default true,
  display_order integer not null default 0,
  uploaded_by   uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists gallery_feed_idx
  on public.gallery (media_type, display_order, created_at desc) where is_published;

drop trigger if exists gallery_touch on public.gallery;
create trigger gallery_touch before update on public.gallery
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- volunteers
-- =============================================================================

create table if not exists public.volunteers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  phone        text,
  team         text not null default 'General',
  availability text,
  notes        text,
  is_active    boolean not null default true,
  is_public    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists volunteers_team_idx on public.volunteers (team, name) where is_active;

drop trigger if exists volunteers_touch on public.volunteers;
create trigger volunteers_touch before update on public.volunteers
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- sponsors
-- =============================================================================

create table if not exists public.sponsors (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  tier                public.sponsor_tier not null default 'supporter',
  logo_url            text,
  website_url         text,
  contribution_amount numeric(12, 2),
  display_order       integer not null default 0,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists sponsors_order_idx
  on public.sponsors (tier, display_order) where is_active;

drop trigger if exists sponsors_touch on public.sponsors;
create trigger sponsors_touch before update on public.sponsors
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- contact_information
-- =============================================================================

create table if not exists public.contact_information (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,            -- "President", "Emergency"
  contact_name  text,
  phone         text not null,
  email         text,
  is_emergency  boolean not null default false,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists contact_information_order_idx
  on public.contact_information (display_order) where is_active;

drop trigger if exists contact_information_touch on public.contact_information;
create trigger contact_information_touch before update on public.contact_information
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- public_stats() — aggregates the public transparency figures in one call.
--
-- SECURITY DEFINER so anonymous visitors get correct totals without being able
-- to read individual donation or expense rows.
-- =============================================================================

create or replace function public.public_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'total_donations', coalesce((
      select sum(amount) from public.donations where status = 'verified'
    ), 0),
    'donor_count', (
      select count(distinct lower(trim(donor_name)))
      from public.donations where status = 'verified'
    ),
    'transaction_count', (
      select count(*) from public.donations where status = 'verified'
    ),
    'top_donation', coalesce((
      select max(amount) from public.donations where status = 'verified'
    ), 0),
    'total_expenses', coalesce((
      select sum(amount) from public.expenses where is_public
    ), 0),
    'donation_goal', coalesce((
      select donation_goal from public.festival_settings where id
    ), 0),
    'volunteer_count', (
      select count(*) from public.volunteers where is_active
    )
  );
$$;

revoke all on function public.public_stats() from public;
grant execute on function public.public_stats() to anon, authenticated;

-- Admin-only figures (includes unverified/pending and non-public rows).
create or replace function public.admin_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.can_edit() then
    raise exception 'not authorised';
  end if;

  select json_build_object(
    'total_donations', coalesce((select sum(amount) from public.donations where status = 'verified'), 0),
    'pending_donations', coalesce((select sum(amount) from public.donations where status = 'pending'), 0),
    'pending_count', (select count(*) from public.donations where status = 'pending'),
    'total_expenses', coalesce((select sum(amount) from public.expenses), 0),
    'donor_count', (select count(distinct lower(trim(donor_name))) from public.donations where status = 'verified'),
    'volunteer_count', (select count(*) from public.volunteers where is_active),
    'upcoming_events', (select count(*) from public.events where event_date >= current_date and is_published),
    'donation_goal', coalesce((select donation_goal from public.festival_settings where id), 0)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_stats() from public;
grant execute on function public.admin_stats() to authenticated;
