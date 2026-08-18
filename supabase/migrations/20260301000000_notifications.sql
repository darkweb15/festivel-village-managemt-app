-- =============================================================================
-- notifications
--
-- A real feed of things the committee actually changed. Rows are written only
-- by database triggers on the source tables, never by the application — so a
-- notification cannot be invented, and cannot drift from the content it points
-- at. Publishing an announcement IS what creates its notification.
--
-- Nothing private lives here. Bookings, donations, donor names and phone
-- numbers are deliberately absent: this table is world-readable, and a booking
-- update belongs to one couple, not to the village. Booking notifications need
-- the reference + phone gate that /book/lookup already enforces.
--
-- Language: the table stores committee-authored text exactly as written, plus
-- structured facts in `meta`. The framing a reader sees ("Pooja timing
-- changed") comes from the app's dictionary in their chosen language. A schema
-- cannot translate what an admin typed, so it does not pretend to.
--
-- Run after 20260201000200_bookings_rls.sql
-- =============================================================================

do $$ begin
  create type public.notification_kind as enum
    ('announcement', 'notice', 'pooja', 'event');
exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  kind         public.notification_kind not null,

  -- Committee-authored, stored as typed. Denormalised on purpose: the feed
  -- renders without joining four tables, and stays readable in the instant
  -- between a source row changing and its trigger firing.
  subject      text not null,
  detail       text,

  -- Structured facts the UI formats and localises itself, e.g.
  --   {"reason":"rescheduled","pooja_date":"2026-08-25","start_time":"18:30:00"}
  -- Never put display sentences in here; that is the dictionary's job.
  meta         jsonb not null default '{}'::jsonb,

  -- Where tapping the notification goes. Always a public route.
  href         text not null,

  -- Provenance, so a retracted source can take its notifications with it.
  -- Not granted to anon; internal bookkeeping only.
  source_table text not null,
  source_id    uuid not null,

  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists notifications_feed_idx
  on public.notifications (published_at desc);

create index if not exists notifications_source_idx
  on public.notifications (source_table, source_id);

-- =============================================================================
-- Announcements -> notifications
--
-- Fires when an announcement becomes visible to the village, not merely when a
-- row appears: a draft saved with is_published = false notifies nobody.
-- =============================================================================

create or replace function public.notify_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Retracted or deleted: take the notification with it, so the village is
  -- never left holding a notice the committee has withdrawn.
  if tg_op = 'DELETE' then
    delete from public.notifications
     where source_table = 'announcements' and source_id = old.id;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.is_published and not new.is_published then
    delete from public.notifications
     where source_table = 'announcements' and source_id = new.id;
    return new;
  end if;

  -- Only on the transition into published, and only once per announcement.
  if new.is_published
     and (tg_op = 'INSERT' or not old.is_published)
     and not exists (
       select 1 from public.notifications
        where source_table = 'announcements' and source_id = new.id
     )
  then
    insert into public.notifications (kind, subject, detail, meta, href, source_table, source_id, published_at)
    values (
      -- Explicit cast: a CASE of bare literals resolves to text, and text does
      -- not assign to an enum column without one.
      (case when new.category = 'important' then 'notice' else 'announcement' end)
        ::public.notification_kind,
      new.title,
      -- A first line of context, not the whole body.
      nullif(left(regexp_replace(new.body, '\s+', ' ', 'g'), 140), ''),
      jsonb_build_object('reason', 'published', 'category', new.category::text),
      '/announcements#announcement-' || new.id,
      'announcements',
      new.id,
      new.published_at
    );
  end if;

  return new;
end;
$$;

drop trigger if exists announcements_notify on public.announcements;
create trigger announcements_notify
  after insert or update or delete on public.announcements
  for each row execute function public.notify_announcement();

-- =============================================================================
-- Pooja schedule -> notifications
--
-- Two things are worth telling people about: a new pooja appearing, and the
-- time of an existing one moving. Editing a description is not news.
-- =============================================================================

create or replace function public.notify_pooja_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.notifications
     where source_table = 'pooja_schedule' and source_id = old.id;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.is_published and not new.is_published then
    delete from public.notifications
     where source_table = 'pooja_schedule' and source_id = new.id;
    return new;
  end if;

  if not new.is_published then
    return new;
  end if;

  -- Newly published pooja.
  if (tg_op = 'INSERT' or not old.is_published)
     and not exists (
       select 1 from public.notifications
        where source_table = 'pooja_schedule' and source_id = new.id
     )
  then
    insert into public.notifications (kind, subject, meta, href, source_table, source_id)
    values (
      'pooja',
      new.title,
      jsonb_build_object(
        'reason', 'added',
        'pooja_date', new.pooja_date,
        'start_time', new.start_time
      ),
      '/pooja#pooja-' || new.id,
      'pooja_schedule',
      new.id
    );
    return new;
  end if;

  -- Moved. A repeat move is a repeat notification: it is genuinely new news.
  if tg_op = 'UPDATE'
     and (old.pooja_date is distinct from new.pooja_date
          or old.start_time is distinct from new.start_time)
  then
    insert into public.notifications (kind, subject, meta, href, source_table, source_id)
    values (
      'pooja',
      new.title,
      jsonb_build_object(
        'reason', 'rescheduled',
        'pooja_date', new.pooja_date,
        'start_time', new.start_time,
        'previous_date', old.pooja_date,
        'previous_time', old.start_time
      ),
      '/pooja#pooja-' || new.id,
      'pooja_schedule',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists pooja_schedule_notify on public.pooja_schedule;
create trigger pooja_schedule_notify
  after insert or update or delete on public.pooja_schedule
  for each row execute function public.notify_pooja_schedule();

-- =============================================================================
-- Events -> notifications
-- =============================================================================

create or replace function public.notify_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.notifications
     where source_table = 'events' and source_id = old.id;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.is_published and not new.is_published then
    delete from public.notifications
     where source_table = 'events' and source_id = new.id;
    return new;
  end if;

  if not new.is_published then
    return new;
  end if;

  if (tg_op = 'INSERT' or not old.is_published)
     and not exists (
       select 1 from public.notifications
        where source_table = 'events' and source_id = new.id
     )
  then
    insert into public.notifications (kind, subject, detail, meta, href, source_table, source_id)
    values (
      'event',
      new.title,
      new.venue,
      jsonb_build_object(
        'reason', 'added',
        'event_date', new.event_date,
        'start_time', new.start_time
      ),
      '/events#event-' || new.id,
      'events',
      new.id
    );
    return new;
  end if;

  if tg_op = 'UPDATE'
     and (old.event_date is distinct from new.event_date
          or old.start_time is distinct from new.start_time)
  then
    insert into public.notifications (kind, subject, detail, meta, href, source_table, source_id)
    values (
      'event',
      new.title,
      new.venue,
      jsonb_build_object(
        'reason', 'rescheduled',
        'event_date', new.event_date,
        'start_time', new.start_time,
        'previous_date', old.event_date,
        'previous_time', old.start_time
      ),
      '/events#event-' || new.id,
      'events',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists events_notify on public.events;
create trigger events_notify
  after insert or update or delete on public.events
  for each row execute function public.notify_event();

-- =============================================================================
-- Row Level Security
--
-- World-readable by design: these are public notices. Writes are closed to
-- everyone — the triggers above are the only writer, and they run as definer.
-- =============================================================================

alter table public.notifications enable row level security;

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications
  for select to anon, authenticated
  using (true);

-- Editors may clear a notification by hand; nobody may forge one, because
-- INSERT is not granted to any client role.
drop policy if exists notifications_admin_delete on public.notifications;
create policy notifications_admin_delete on public.notifications
  for delete to authenticated
  using (public.can_edit());

revoke all on public.notifications from anon, authenticated;

-- source_table and source_id stay internal: readers get what to show and where
-- to go, not the committee's bookkeeping.
grant select (id, kind, subject, detail, meta, href, published_at, created_at)
  on public.notifications to anon, authenticated;
grant delete on public.notifications to authenticated;
