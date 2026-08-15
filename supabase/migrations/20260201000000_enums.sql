-- =============================================================================
-- Enum additions for pooja booking + announcement priority.
--
-- Kept in its own migration because Postgres will not let a newly added enum
-- label be *used* in the same transaction that added it.
-- =============================================================================

alter type public.announcement_category add value if not exists 'important';

do $$ begin
  create type public.booking_status as enum (
    'pending', 'confirmed', 'cancelled', 'rescheduled', 'completed', 'no_show'
  );
exception when duplicate_object then null; end $$;
