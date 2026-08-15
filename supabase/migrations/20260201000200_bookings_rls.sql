-- =============================================================================
-- RLS for the Phase 2/3 tables.
--
-- pooja_bookings holds names and phone numbers, so anonymous visitors get no
-- direct access at all — not even INSERT. Bookings are created solely through
-- public.book_pooja_slot(), which enforces capacity, and are read back through
-- public.get_booking_by_ref(), which requires the phone number as well as the
-- reference. Aggregate availability comes from the pooja_availability view.
-- =============================================================================

alter table public.pooja_bookings        enable row level security;
alter table public.volunteer_assignments enable row level security;
alter table public.ai_action_logs        enable row level security;

-- -----------------------------------------------------------------------------
-- pooja_bookings — committee only, from the client's point of view
-- -----------------------------------------------------------------------------

drop policy if exists pooja_bookings_admin_read on public.pooja_bookings;
create policy pooja_bookings_admin_read on public.pooja_bookings
  for select to authenticated
  using (public.can_edit());

drop policy if exists pooja_bookings_admin_write on public.pooja_bookings;
create policy pooja_bookings_admin_write on public.pooja_bookings
  for all to authenticated
  using (public.can_edit()) with check (public.can_edit());

revoke all on public.pooja_bookings from anon;

-- -----------------------------------------------------------------------------
-- volunteer_assignments — public may see who is on duty, not the private notes
-- -----------------------------------------------------------------------------

drop policy if exists volunteer_assignments_read on public.volunteer_assignments;
create policy volunteer_assignments_read on public.volunteer_assignments
  for select to anon, authenticated
  using (status = 'assigned' or public.can_edit());

drop policy if exists volunteer_assignments_write on public.volunteer_assignments;
create policy volunteer_assignments_write on public.volunteer_assignments
  for all to authenticated
  using (public.can_edit()) with check (public.can_edit());

revoke select on public.volunteer_assignments from anon;
grant select (id, volunteer_id, event_id, pooja_id, role, duty_date, status, created_at)
  on public.volunteer_assignments to anon;

-- -----------------------------------------------------------------------------
-- ai_action_logs — write via log_ai_action() only; read is committee only
-- -----------------------------------------------------------------------------

drop policy if exists ai_action_logs_admin_read on public.ai_action_logs;
create policy ai_action_logs_admin_read on public.ai_action_logs
  for select to authenticated
  using (public.can_edit());

drop policy if exists ai_action_logs_admin_write on public.ai_action_logs;
create policy ai_action_logs_admin_write on public.ai_action_logs
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.ai_action_logs from anon;

-- -----------------------------------------------------------------------------
-- The new pooja_schedule columns are covered by the existing published-read
-- policy. Re-assert the anon column grants for the tables whose shape changed,
-- so newly added private columns are not accidentally world-readable.
-- -----------------------------------------------------------------------------

revoke select on public.pooja_schedule from anon;
grant select (id, title, description, pooja_date, start_time, end_time,
              priest_name, is_daily, is_published, display_order,
              max_couples, booking_enabled, booking_opens_at, booking_closes_at,
              special_instructions, status, created_at)
  on public.pooja_schedule to anon;

revoke select on public.events from anon;
grant select (id, title, description, event_date, start_time, end_time, day_part,
              venue, category, image_url, is_cultural, is_featured, is_published,
              max_capacity, booking_enabled, status, created_at)
  on public.events to anon;
