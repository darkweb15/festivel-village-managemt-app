-- =============================================================================
-- Optional starter row.
--
-- This creates ONLY the single festival_settings record the app reads its
-- configuration from. No demo events, donations, members or photos are seeded —
-- every one of those should be entered by the committee through /admin so the
-- app never shows invented information.
--
-- Edit the values below (or leave them blank and fill them in from
-- /admin/settings once you are signed in).
-- =============================================================================

insert into public.festival_settings (
  id,
  festival_name,
  festival_year,
  tagline,
  invocation,
  donation_goal
)
values (
  true,
  -- The hero renders "<festival_name> <year>"; the long form
  -- "Lingagudem Vinayaka Chavithi 2026" is carried by the app header instead.
  'Vinayaka Chavithi',
  2026,
  'Our Village • Our Youth • Our Ganesha',
  '|| GANAPATHI BAPPA MORYA ||',
  0
)
on conflict (id) do nothing;
