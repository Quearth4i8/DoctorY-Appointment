-- Keep a backfilled establishment in step with the profile it came from.
--
-- `doctors` is still the edit surface: the settings page writes there, and the
-- marketplace migration copied each row into `providers` once. Once. So the
-- day a doctor changed their photo or moved address, the annuaire kept showing
-- what was true at migration time — visibly wrong, and wrong in a way nobody
-- would think to check, because the settings page dutifully showed the new
-- value the whole time.
--
-- A trigger rather than a second write in the form: there are already two code
-- paths that update `doctors` and there will be more, and every one of them
-- would have to remember. This cannot be forgotten.
--
-- Deliberately one-way and partial. It syncs only the fields `providers`
-- inherited, and only for rows still linked by `legacy_doctor_id` — anything
-- an establishment has been given since (its kind, its booking mode, its
-- opening hours, its plan) is its own and is never touched.

create or replace function public.mirror_doctor_to_provider()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.providers p
  set
    name         = trim(coalesce(new.title, 'Dr') || ' ' || new.full_name),
    bio          = new.bio,
    photo_url    = new.photo_url,
    address      = new.address,
    city         = new.city,
    phone        = new.phone,
    email        = new.email,
    latitude     = new.latitude,
    longitude    = new.longitude,
    is_published = new.is_published,
    -- The tunnel address moves with the desktop app; a stale one here means
    -- the public calendar points at a machine that is no longer listening.
    remote_api_url = new.remote_api_url,
    remote_seen_at = new.remote_seen_at
  where p.legacy_doctor_id = new.id;

  -- The practitioner row carries the person, so it follows the same way.
  update public.practitioners x
  set
    title        = coalesce(nullif(trim(new.title), ''), 'Dr'),
    full_name    = new.full_name,
    bio          = new.bio,
    photo_url    = new.photo_url,
    is_published = new.is_published,
    remote_api_url = new.remote_api_url,
    remote_seen_at = new.remote_seen_at
  where x.legacy_doctor_id = new.id;

  return new;
end;
$$;

comment on function public.mirror_doctor_to_provider() is
  'Copies the inherited fields of a doctors row onto the provider backfilled from it.';

/*
 * `remote_seen_at` is rewritten by the desktop app every time it announces
 * itself, which would otherwise fire this on a heartbeat. The WHEN clause
 * keeps it to updates that actually change something worth mirroring.
 */
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

-- Catch up anything that already drifted since the marketplace migration ran.
update public.providers p
set
  name         = trim(coalesce(d.title, 'Dr') || ' ' || d.full_name),
  bio          = d.bio,
  photo_url    = d.photo_url,
  address      = d.address,
  city         = d.city,
  phone        = d.phone,
  email        = d.email,
  latitude     = d.latitude,
  longitude    = d.longitude,
  is_published = d.is_published,
  remote_api_url = d.remote_api_url,
  remote_seen_at = d.remote_seen_at
from public.doctors d
where p.legacy_doctor_id = d.id;

update public.practitioners x
set
  title        = coalesce(nullif(trim(d.title), ''), 'Dr'),
  full_name    = d.full_name,
  bio          = d.bio,
  photo_url    = d.photo_url,
  is_published = d.is_published,
  remote_api_url = d.remote_api_url,
  remote_seen_at = d.remote_seen_at
from public.doctors d
where x.legacy_doctor_id = d.id;
