-- Where the doctor actually is, so the public page can show a map.
--
-- Coordinates rather than a provider-specific embed URL: they render on any
-- map (OpenStreetMap needs no API key), and a directions link to Google or
-- Apple Maps can be built from them without storing anything vendor-shaped.

alter table public.doctors
  add column if not exists latitude  double precision
    check (latitude is null or latitude between -90 and 90),
  add column if not exists longitude double precision
    check (longitude is null or longitude between -180 and 180);

comment on column public.doctors.latitude is
  'Optional. Set together with longitude, or the map is hidden.';
