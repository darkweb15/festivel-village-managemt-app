-- =============================================================================
-- Row Level Security
--
-- Principle: anonymous visitors read only what the committee has published.
-- Every write is gated on public.can_edit() / public.is_admin().
-- Run after 20260101000000_init.sql
-- =============================================================================

alter table public.users               enable row level security;
alter table public.festival_settings   enable row level security;
alter table public.committee_members   enable row level security;
alter table public.events              enable row level security;
alter table public.pooja_schedule      enable row level security;
alter table public.announcements       enable row level security;
alter table public.donations           enable row level security;
alter table public.expenses            enable row level security;
alter table public.gallery             enable row level security;
alter table public.volunteers          enable row level security;
alter table public.sponsors            enable row level security;
alter table public.contact_information enable row level security;

-- -----------------------------------------------------------------------------
-- users — you may read your own row; only admins see or change the roster.
-- Nobody can change their own role through the API.
-- -----------------------------------------------------------------------------

drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists users_admin_write on public.users;
create policy users_admin_write on public.users
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- festival_settings — world readable, admin writable.
-- -----------------------------------------------------------------------------

drop policy if exists festival_settings_read on public.festival_settings;
create policy festival_settings_read on public.festival_settings
  for select to anon, authenticated using (true);

drop policy if exists festival_settings_write on public.festival_settings;
create policy festival_settings_write on public.festival_settings
  for all to authenticated
  using (public.can_edit()) with check (public.can_edit());

-- -----------------------------------------------------------------------------
-- Published-content tables: read the active/published rows, editors write.
-- -----------------------------------------------------------------------------

drop policy if exists committee_members_read on public.committee_members;
create policy committee_members_read on public.committee_members
  for select to anon, authenticated using (is_active or public.can_edit());

drop policy if exists committee_members_write on public.committee_members;
create policy committee_members_write on public.committee_members
  for all to authenticated
  using (public.can_edit()) with check (public.can_edit());

drop policy if exists events_read on public.events;
create policy events_read on public.events
  for select to anon, authenticated using (is_published or public.can_edit());

drop policy if exists events_write on public.events;
create policy events_write on public.events
  for all to authenticated
  using (public.can_edit()) with check (public.can_edit());

drop policy if exists pooja_schedule_read on public.pooja_schedule;
create policy pooja_schedule_read on public.pooja_schedule
  for select to anon, authenticated using (is_published or public.can_edit());

drop policy if exists pooja_schedule_write on public.pooja_schedule;
create policy pooja_schedule_write on public.pooja_schedule
  for all to authenticated
  using (public.can_edit()) with check (public.can_edit());

drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements
  for select to anon, authenticated
  using ((is_published and published_at <= now()) or public.can_edit());

drop policy if exists announcements_write on public.announcements;
create policy announcements_write on public.announcements
  for all to authenticated
  using (public.can_edit()) with check (public.can_edit());

drop policy if exists gallery_read on public.gallery;
create policy gallery_read on public.gallery
  for select to anon, authenticated using (is_published or public.can_edit());

drop policy if exists gallery_write on public.gallery;
create policy gallery_write on public.gallery
  for all to authenticated
  using (public.can_edit()) with check (public.can_edit());

drop policy if exists sponsors_read on public.sponsors;
create policy sponsors_read on public.sponsors
  for select to anon, authenticated using (is_active or public.can_edit());

drop policy if exists sponsors_write on public.sponsors;
create policy sponsors_write on public.sponsors
  for all to authenticated
  using (public.can_edit()) with check (public.can_edit());

drop policy if exists contact_information_read on public.contact_information;
create policy contact_information_read on public.contact_information
  for select to anon, authenticated using (is_active or public.can_edit());

drop policy if exists contact_information_write on public.contact_information;
create policy contact_information_write on public.contact_information
  for all to authenticated
  using (public.can_edit()) with check (public.can_edit());

-- -----------------------------------------------------------------------------
-- volunteers — phone numbers stay private; the public list is name + team only,
-- enforced by the column grants below plus is_public.
-- -----------------------------------------------------------------------------

drop policy if exists volunteers_read on public.volunteers;
create policy volunteers_read on public.volunteers
  for select to anon, authenticated
  using ((is_active and is_public) or public.can_edit());

drop policy if exists volunteers_write on public.volunteers;
create policy volunteers_write on public.volunteers
  for all to authenticated
  using (public.can_edit()) with check (public.can_edit());

revoke select on public.volunteers from anon;
grant select (id, name, team, availability, is_active, is_public, created_at)
  on public.volunteers to anon;

-- -----------------------------------------------------------------------------
-- donations
--
-- Anonymous visitors:
--   * may INSERT a self-reported donation, forced to status 'pending'
--   * may SELECT only donations the committee has verified and marked public
--   * never see donor_phone, notes or the verification audit columns
--
-- Nothing here verifies a payment. Verification is a manual committee action.
-- -----------------------------------------------------------------------------

drop policy if exists donations_public_read on public.donations;
create policy donations_public_read on public.donations
  for select to anon, authenticated
  using ((status = 'verified' and is_public) or public.can_edit());

drop policy if exists donations_public_submit on public.donations;
create policy donations_public_submit on public.donations
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and source = 'public_form'
    and verified_by is null
    and verified_at is null
    and amount > 0
    and amount <= 1000000
    and char_length(trim(donor_name)) between 2 and 80
  );

drop policy if exists donations_admin_write on public.donations;
create policy donations_admin_write on public.donations
  for all to authenticated
  using (public.can_edit()) with check (public.can_edit());

revoke select, insert on public.donations from anon;
grant select (id, donor_name, amount, donation_date, payment_method, status,
              is_anonymous, is_public, created_at)
  on public.donations to anon;
grant insert (donor_name, donor_phone, amount, donation_date, payment_method,
              transaction_ref, notes, status, is_anonymous, source)
  on public.donations to anon;

-- -----------------------------------------------------------------------------
-- expenses — the public sees what was spent on what, for transparency.
-- Vendor, receipts and internal notes stay with the committee.
-- -----------------------------------------------------------------------------

drop policy if exists expenses_read on public.expenses;
create policy expenses_read on public.expenses
  for select to anon, authenticated
  using (is_public or public.can_edit());

drop policy if exists expenses_write on public.expenses;
create policy expenses_write on public.expenses
  for all to authenticated
  using (public.can_edit()) with check (public.can_edit());

revoke select on public.expenses from anon;
grant select (id, title, category, amount, expense_date, is_public, created_at)
  on public.expenses to anon;

-- =============================================================================
-- Storage buckets for committee uploads
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('members', 'members', true)
on conflict (id) do nothing;

-- Receipts are deliberately private — committee eyes only.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists storage_public_read on storage.objects;
create policy storage_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('gallery', 'members'));

drop policy if exists storage_editor_write on storage.objects;
create policy storage_editor_write on storage.objects
  for all to authenticated
  using (bucket_id in ('gallery', 'members', 'receipts') and public.can_edit())
  with check (bucket_id in ('gallery', 'members', 'receipts') and public.can_edit());
