-- =============================================================================
-- Phase 2/3 — Pooja management, couple bookings, volunteer assignments and the
-- AI action log.
--
-- The important part of this file is public.book_pooja_slot(). Capacity is
-- enforced by taking a row lock on the pooja before counting existing bookings,
-- so two people racing for the last slot are serialised by Postgres and the
-- second one is told the pooja just filled up. The frontend availability check
-- is a convenience only — it is never the thing that protects capacity.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extend pooja_schedule with booking configuration
-- -----------------------------------------------------------------------------

alter table public.pooja_schedule
  add column if not exists max_couples          integer not null default 0,
  add column if not exists booking_enabled      boolean not null default false,
  add column if not exists booking_opens_at     timestamptz,
  add column if not exists booking_closes_at    timestamptz,
  add column if not exists special_instructions text,
  add column if not exists status               text not null default 'scheduled';

do $$ begin
  alter table public.pooja_schedule
    add constraint pooja_schedule_status_check
    check (status in ('scheduled', 'cancelled', 'completed'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.pooja_schedule
    add constraint pooja_schedule_capacity_check check (max_couples >= 0);
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Extend events with capacity / status
-- -----------------------------------------------------------------------------

alter table public.events
  add column if not exists max_capacity    integer,
  add column if not exists booking_enabled boolean not null default false,
  add column if not exists status          text not null default 'scheduled';

do $$ begin
  alter table public.events
    add constraint events_status_check
    check (status in ('scheduled', 'cancelled', 'completed', 'postponed'));
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Announcement priority
-- -----------------------------------------------------------------------------

alter table public.announcements
  add column if not exists priority text not null default 'normal';

do $$ begin
  alter table public.announcements
    add constraint announcements_priority_check
    check (priority in ('low', 'normal', 'high', 'urgent'));
exception when duplicate_object then null; end $$;

-- =============================================================================
-- pooja_bookings
-- =============================================================================

create sequence if not exists public.booking_ref_seq start 1;

create or replace function public.next_booking_ref(p_year integer)
returns text
language sql
volatile
as $$
  select 'SK' || p_year::text || '-'
         || lpad(nextval('public.booking_ref_seq')::text, 4, '0');
$$;

create table if not exists public.pooja_bookings (
  id               uuid primary key default gen_random_uuid(),
  booking_ref      text not null unique,
  pooja_id         uuid not null references public.pooja_schedule (id) on delete restrict,
  partner1_name    text not null,
  partner2_name    text,
  gotram           text,
  phone            text not null,
  email            text,
  notes            text,
  status           public.booking_status not null default 'confirmed',
  source           text not null default 'public_form',   -- public_form | ai_agent | admin
  cancelled_at     timestamptz,
  cancel_reason    text,
  rescheduled_from uuid references public.pooja_bookings (id) on delete set null,
  created_by       uuid references public.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint pooja_bookings_partner1_len check (char_length(trim(partner1_name)) between 2 and 80),
  constraint pooja_bookings_phone_len check (char_length(trim(phone)) between 7 and 20)
);

create index if not exists pooja_bookings_pooja_idx
  on public.pooja_bookings (pooja_id, status);
create index if not exists pooja_bookings_ref_idx
  on public.pooja_bookings (booking_ref);
create index if not exists pooja_bookings_created_idx
  on public.pooja_bookings (created_at desc);

drop trigger if exists pooja_bookings_touch on public.pooja_bookings;
create trigger pooja_bookings_touch before update on public.pooja_bookings
  for each row execute function public.touch_updated_at();

-- Stamp cancellation time whenever a booking moves to cancelled.
create or replace function public.stamp_booking_cancellation()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'cancelled' and coalesce(old.status::text, '') <> 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  elsif new.status <> 'cancelled' then
    new.cancelled_at := null;
    new.cancel_reason := null;
  end if;
  return new;
end;
$$;

drop trigger if exists pooja_bookings_cancellation on public.pooja_bookings;
create trigger pooja_bookings_cancellation before update on public.pooja_bookings
  for each row execute function public.stamp_booking_cancellation();

-- =============================================================================
-- volunteer_assignments
-- =============================================================================

create table if not exists public.volunteer_assignments (
  id           uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.volunteers (id) on delete cascade,
  event_id     uuid references public.events (id) on delete cascade,
  pooja_id     uuid references public.pooja_schedule (id) on delete cascade,
  role         text not null default 'General',
  duty_date    date,
  notes        text,
  status       text not null default 'assigned',
  assigned_by  uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint volunteer_assignments_status_check
    check (status in ('assigned', 'completed', 'cancelled'))
);

create index if not exists volunteer_assignments_volunteer_idx
  on public.volunteer_assignments (volunteer_id);
create index if not exists volunteer_assignments_date_idx
  on public.volunteer_assignments (duty_date);

drop trigger if exists volunteer_assignments_touch on public.volunteer_assignments;
create trigger volunteer_assignments_touch before update on public.volunteer_assignments
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- ai_action_logs — audit trail for every agent tool call
-- =============================================================================

create table if not exists public.ai_action_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_type  text not null default 'public',   -- public | admin | system
  actor_id    uuid references public.users (id) on delete set null,
  session_id  text,
  surface     text,                             -- assistant | copilot
  tool_name   text not null,
  arguments   jsonb not null default '{}'::jsonb,
  success     boolean not null default true,
  error       text,
  object_type text,
  object_id   text,
  duration_ms integer,
  model       text,
  created_at  timestamptz not null default now(),
  constraint ai_action_logs_actor_type_check
    check (actor_type in ('public', 'admin', 'system'))
);

create index if not exists ai_action_logs_created_idx
  on public.ai_action_logs (created_at desc);
create index if not exists ai_action_logs_tool_idx
  on public.ai_action_logs (tool_name, created_at desc);

-- Writable by anyone (the public assistant must be auditable too) but only
-- through this function, which pins the columns that may be set. Reading the
-- log stays admin-only via RLS.
create or replace function public.log_ai_action(
  p_actor_type  text,
  p_session_id  text,
  p_surface     text,
  p_tool_name   text,
  p_arguments   jsonb,
  p_success     boolean,
  p_error       text,
  p_object_type text,
  p_object_id   text,
  p_duration_ms integer,
  p_model       text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.ai_action_logs (
    actor_type, actor_id, session_id, surface, tool_name, arguments,
    success, error, object_type, object_id, duration_ms, model
  ) values (
    case when p_actor_type in ('public','admin','system') then p_actor_type else 'public' end,
    auth.uid(),
    left(coalesce(p_session_id, ''), 64),
    left(coalesce(p_surface, ''), 32),
    left(p_tool_name, 64),
    coalesce(p_arguments, '{}'::jsonb),
    coalesce(p_success, true),
    left(p_error, 500),
    left(p_object_type, 64),
    left(p_object_id, 64),
    p_duration_ms,
    left(p_model, 64)
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.log_ai_action(text,text,text,text,jsonb,boolean,text,text,text,integer,text) from public;
grant execute on function public.log_ai_action(text,text,text,text,jsonb,boolean,text,text,text,integer,text)
  to anon, authenticated;

-- =============================================================================
-- pooja_availability — aggregate counts only, safe for anonymous visitors
--
-- A security-definer view: it can count rows in pooja_bookings (which anon
-- cannot read) without ever exposing a couple's name or phone number.
-- =============================================================================

drop view if exists public.pooja_availability;
create view public.pooja_availability
with (security_invoker = false) as
select
  p.id                                   as pooja_id,
  p.title,
  p.description,
  p.pooja_date,
  p.start_time,
  p.end_time,
  p.priest_name,
  p.special_instructions,
  p.status,
  p.booking_enabled,
  p.max_couples,
  p.booking_opens_at,
  p.booking_closes_at,
  coalesce(b.booked, 0)::int             as booked,
  greatest(p.max_couples - coalesce(b.booked, 0), 0)::int as available,
  (
    p.is_published
    and p.status = 'scheduled'
    and p.booking_enabled
    and p.max_couples > 0
    and coalesce(b.booked, 0) < p.max_couples
    and p.pooja_date >= current_date
    and (p.booking_opens_at is null or now() >= p.booking_opens_at)
    and (p.booking_closes_at is null or now() <= p.booking_closes_at)
  )                                      as is_bookable
from public.pooja_schedule p
left join (
  select pooja_id, count(*) as booked
    from public.pooja_bookings
   where status in ('pending', 'confirmed', 'rescheduled', 'completed')
   group by pooja_id
) b on b.pooja_id = p.id
where p.is_published;

grant select on public.pooja_availability to anon, authenticated;

-- =============================================================================
-- book_pooja_slot — the only way a booking is ever created
-- =============================================================================

create or replace function public.book_pooja_slot(
  p_pooja_id  uuid,
  p_partner1  text,
  p_partner2  text default null,
  p_phone     text default null,
  p_gotram    text default null,
  p_email     text default null,
  p_notes     text default null,
  p_source    text default 'public_form'
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pooja  public.pooja_schedule%rowtype;
  v_booked integer;
  v_ref    text;
  v_id     uuid;
  v_phone  text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
begin
  if coalesce(trim(p_partner1), '') = '' then
    return json_build_object('ok', false, 'code', 'invalid_input',
      'message', 'Please provide the first name.');
  end if;

  if char_length(trim(p_partner1)) > 80
     or char_length(coalesce(trim(p_partner2), '')) > 80 then
    return json_build_object('ok', false, 'code', 'invalid_input',
      'message', 'Names must be 80 characters or fewer.');
  end if;

  if v_phone !~ '^\+?[0-9]{7,15}$' then
    return json_build_object('ok', false, 'code', 'invalid_input',
      'message', 'Please provide a valid contact phone number.');
  end if;

  -- Row lock. Any other transaction booking this same pooja waits here, so the
  -- count below can never be read concurrently by two winners.
  select * into v_pooja
    from public.pooja_schedule
   where id = p_pooja_id
   for update;

  if not found then
    return json_build_object('ok', false, 'code', 'not_found',
      'message', 'That pooja could not be found.');
  end if;

  if not v_pooja.is_published or v_pooja.status <> 'scheduled' then
    return json_build_object('ok', false, 'code', 'unavailable',
      'message', 'That pooja is not currently open for booking.');
  end if;

  if not v_pooja.booking_enabled or coalesce(v_pooja.max_couples, 0) <= 0 then
    return json_build_object('ok', false, 'code', 'booking_disabled',
      'message', 'Booking is not enabled for this pooja.');
  end if;

  if v_pooja.pooja_date < current_date then
    return json_build_object('ok', false, 'code', 'past',
      'message', 'That pooja has already taken place.');
  end if;

  if v_pooja.booking_opens_at is not null and now() < v_pooja.booking_opens_at then
    return json_build_object('ok', false, 'code', 'not_open_yet',
      'message', 'Booking for this pooja has not opened yet.',
      'opens_at', v_pooja.booking_opens_at);
  end if;

  if v_pooja.booking_closes_at is not null and now() > v_pooja.booking_closes_at then
    return json_build_object('ok', false, 'code', 'closed',
      'message', 'Booking for this pooja has closed.');
  end if;

  -- Duplicate check first: if this caller already holds a slot, telling them
  -- "you already have a booking" is more useful than "we are full", and it is
  -- true regardless of remaining capacity.
  if exists (
    select 1 from public.pooja_bookings
     where pooja_id = p_pooja_id
       and regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(v_phone, '[^0-9]', '', 'g')
       and status in ('pending', 'confirmed', 'rescheduled')
  ) then
    return json_build_object('ok', false, 'code', 'duplicate',
      'message', 'This phone number already has a booking for this pooja.');
  end if;

  select count(*) into v_booked
    from public.pooja_bookings
   where pooja_id = p_pooja_id
     and status in ('pending', 'confirmed', 'rescheduled', 'completed');

  if v_booked >= v_pooja.max_couples then
    return json_build_object('ok', false, 'code', 'full', 'available', 0,
      'message', 'All slots for this pooja have just been taken.');
  end if;

  v_ref := public.next_booking_ref(extract(year from v_pooja.pooja_date)::int);

  insert into public.pooja_bookings (
    booking_ref, pooja_id, partner1_name, partner2_name, gotram,
    phone, email, notes, status, source, created_by
  ) values (
    v_ref, p_pooja_id, trim(p_partner1),
    nullif(trim(coalesce(p_partner2, '')), ''),
    nullif(trim(coalesce(p_gotram, '')), ''),
    v_phone,
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    'confirmed',
    case when p_source in ('public_form', 'ai_agent', 'admin') then p_source else 'public_form' end,
    auth.uid()
  )
  returning id into v_id;

  return json_build_object(
    'ok', true,
    'booking_id', v_id,
    'booking_ref', v_ref,
    'status', 'confirmed',
    'pooja_id', v_pooja.id,
    'pooja_title', v_pooja.title,
    'pooja_date', v_pooja.pooja_date,
    'start_time', v_pooja.start_time,
    'partner1_name', trim(p_partner1),
    'partner2_name', nullif(trim(coalesce(p_partner2, '')), ''),
    'available_after', v_pooja.max_couples - v_booked - 1
  );
end;
$$;

revoke all on function public.book_pooja_slot(uuid,text,text,text,text,text,text,text) from public;
grant execute on function public.book_pooja_slot(uuid,text,text,text,text,text,text,text)
  to anon, authenticated;

-- =============================================================================
-- Booking lookup + cancellation for the person who made the booking.
-- Both require the booking reference AND the phone number, so a reference alone
-- cannot be used to enumerate other people's bookings.
-- =============================================================================

create or replace function public.get_booking_by_ref(p_booking_ref text, p_phone text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v json;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  select json_build_object(
      'ok', true,
      'booking_ref', b.booking_ref,
      'status', b.status,
      'partner1_name', b.partner1_name,
      'partner2_name', b.partner2_name,
      'gotram', b.gotram,
      'pooja_title', p.title,
      'pooja_date', p.pooja_date,
      'start_time', p.start_time,
      'end_time', p.end_time,
      'special_instructions', p.special_instructions,
      'created_at', b.created_at
    ) into v
    from public.pooja_bookings b
    join public.pooja_schedule p on p.id = b.pooja_id
   where upper(b.booking_ref) = upper(trim(p_booking_ref))
     and regexp_replace(b.phone, '[^0-9]', '', 'g') = v_phone;

  if v is null then
    return json_build_object('ok', false, 'code', 'not_found',
      'message', 'No booking matches that reference and phone number.');
  end if;
  return v;
end;
$$;

revoke all on function public.get_booking_by_ref(text,text) from public;
grant execute on function public.get_booking_by_ref(text,text) to anon, authenticated;

create or replace function public.cancel_pooja_booking(
  p_booking_ref text,
  p_phone       text,
  p_reason      text default null
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id     uuid;
  v_status public.booking_status;
  v_date   date;
  v_phone  text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  select b.id, b.status, p.pooja_date into v_id, v_status, v_date
    from public.pooja_bookings b
    join public.pooja_schedule p on p.id = b.pooja_id
   where upper(b.booking_ref) = upper(trim(p_booking_ref))
     and regexp_replace(b.phone, '[^0-9]', '', 'g') = v_phone
   for update of b;

  if v_id is null then
    return json_build_object('ok', false, 'code', 'not_found',
      'message', 'No booking matches that reference and phone number.');
  end if;

  if v_status = 'cancelled' then
    return json_build_object('ok', false, 'code', 'already_cancelled',
      'message', 'That booking is already cancelled.');
  end if;

  if v_status in ('completed', 'no_show') then
    return json_build_object('ok', false, 'code', 'not_cancellable',
      'message', 'That booking can no longer be cancelled. Please contact the committee.');
  end if;

  if v_date < current_date then
    return json_build_object('ok', false, 'code', 'past',
      'message', 'That pooja has already taken place.');
  end if;

  update public.pooja_bookings
     set status = 'cancelled', cancel_reason = left(nullif(trim(coalesce(p_reason, '')), ''), 300)
   where id = v_id;

  return json_build_object('ok', true, 'booking_ref', upper(trim(p_booking_ref)),
    'status', 'cancelled', 'message', 'Booking cancelled. The slot is now available again.');
end;
$$;

revoke all on function public.cancel_pooja_booking(text,text,text) from public;
grant execute on function public.cancel_pooja_booking(text,text,text) to anon, authenticated;

-- =============================================================================
-- Admin booking summary (authorised inside the function)
-- =============================================================================

create or replace function public.admin_booking_summary()
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
    'today',      (select count(*) from public.pooja_bookings b join public.pooja_schedule p on p.id = b.pooja_id
                    where p.pooja_date = current_date and b.status in ('pending','confirmed','rescheduled')),
    'tomorrow',   (select count(*) from public.pooja_bookings b join public.pooja_schedule p on p.id = b.pooja_id
                    where p.pooja_date = current_date + 1 and b.status in ('pending','confirmed','rescheduled')),
    'upcoming',   (select count(*) from public.pooja_bookings b join public.pooja_schedule p on p.id = b.pooja_id
                    where p.pooja_date >= current_date and b.status in ('pending','confirmed','rescheduled')),
    'confirmed',  (select count(*) from public.pooja_bookings where status = 'confirmed'),
    'pending',    (select count(*) from public.pooja_bookings where status = 'pending'),
    'cancelled',  (select count(*) from public.pooja_bookings where status = 'cancelled'),
    'total_slots',(select coalesce(sum(max_couples), 0) from public.pooja_schedule
                    where is_published and status = 'scheduled' and booking_enabled and pooja_date >= current_date),
    'slots_left', (select coalesce(sum(available), 0) from public.pooja_availability
                    where is_bookable),
    'unassigned_volunteers',
                  (select count(*) from public.volunteers v
                    where v.is_active
                      and not exists (select 1 from public.volunteer_assignments a
                                       where a.volunteer_id = v.id and a.status = 'assigned'))
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_booking_summary() from public;
grant execute on function public.admin_booking_summary() to authenticated;
