-- Doctor → establishment mirror, again — this time null-safe.
--
-- 20260922020000 copies the doctor's profile onto the provider backfilled
-- from it. But the `providers` / `practitioners` text columns are NOT NULL
-- (default ''), while the same columns on `doctors` may hold NULL — a doctor
-- with no bio or no photo yet. One such row made the catch-up UPDATE raise,
-- which rolls back the whole script, trigger included: the public profile
-- kept showing its imported phone number while the settings page showed the
-- doctor's own.
--
-- Same function, same trigger, same catch-up — every text value now goes
-- through coalesce(…, ''). Safe to run whether or not 20260922020000 ever
-- succeeded.

create or replace function public.mirror_doctor_to_provider()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.providers p
  set
    name           = trim(coalesce(nullif(trim(new.title), ''), 'Dr') || ' ' || coalesce(new.full_name, '')),
    bio            = coalesce(new.bio, ''),
    photo_url      = coalesce(new.photo_url, ''),
    address        = coalesce(new.address, ''),
    city           = coalesce(new.city, ''),
    phone          = coalesce(new.phone, ''),
    email          = coalesce(new.email, ''),
    latitude       = new.latitude,
    longitude      = new.longitude,
    is_published   = coalesce(new.is_published, false),
    remote_api_url = coalesce(new.remote_api_url, ''),
    remote_seen_at = new.remote_seen_at
  where p.legacy_doctor_id = new.id;

  update public.practitioners x
  set
    title          = coalesce(nullif(trim(new.title), ''), 'Dr'),
    full_name      = coalesce(new.full_name, ''),
    bio            = coalesce(new.bio, ''),
    photo_url      = coalesce(new.photo_url, ''),
    is_published   = coalesce(new.is_published, false),
    remote_api_url = coalesce(new.remote_api_url, ''),
    remote_seen_at = new.remote_seen_at
  where x.legacy_doctor_id = new.id;

  return new;
end;
$$;

comment on function public.mirror_doctor_to_provider() is
  'Copies the inherited fields of a doctors row onto the provider backfilled from it (null-safe).';

drop trigger if exists doctors_mirror_to_provider on public.doctors;
create trigger doctors_mirror_to_provider
  after update on public.doctors
  for each row
  when (
    old.title is distinct from new.title
    or old.full_name is distinct from new.full_name
    or old.bio is distinct from new.bio
    or old.photo_url is distinct from new.photo_url
    or old.address is distinct from new.address
    or old.city is distinct from new.city
    or old.phone is distinct from new.phone
    or old.email is distinct from new.email
    or old.latitude is distinct from new.latitude
    or old.longitude is distinct from new.longitude
    or old.is_published is distinct from new.is_published
    or old.remote_api_url is distinct from new.remote_api_url
  )
  execute function public.mirror_doctor_to_provider();

-- Catch up every linked establishment now.
update public.providers p
set
  name           = trim(coalesce(nullif(trim(d.title), ''), 'Dr') || ' ' || coalesce(d.full_name, '')),
  bio            = coalesce(d.bio, ''),
  photo_url      = coalesce(d.photo_url, ''),
  address        = coalesce(d.address, ''),
  city           = coalesce(d.city, ''),
  phone          = coalesce(d.phone, ''),
  email          = coalesce(d.email, ''),
  latitude       = d.latitude,
  longitude      = d.longitude,
  is_published   = coalesce(d.is_published, false),
  remote_api_url = coalesce(d.remote_api_url, ''),
  remote_seen_at = d.remote_seen_at
from public.doctors d
where p.legacy_doctor_id = d.id;

update public.practitioners x
set
  title          = coalesce(nullif(trim(d.title), ''), 'Dr'),
  full_name      = coalesce(d.full_name, ''),
  bio            = coalesce(d.bio, ''),
  photo_url      = coalesce(d.photo_url, ''),
  is_published   = coalesce(d.is_published, false),
  remote_api_url = coalesce(d.remote_api_url, ''),
  remote_seen_at = d.remote_seen_at
from public.doctors d
where x.legacy_doctor_id = d.id;
