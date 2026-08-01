-- Pairing keys: one desktop installation ↔ one doctor, for any number of them.
--
-- Each installation generates its own key. The secretary pastes it once into
-- Paramètres, which binds it to her doctor. From then on the desktop app
-- registers its tunnel address using only that key, so the app needs no slug,
-- no id and no per-doctor build — the key IS the identity.
--
-- The key is a credential: it opens the doctor's API. So it is never readable
-- by anon or by signed-in staff (see the column grants at the bottom); the
-- website obtains it through get_doctor_endpoint(), which demands a secret only
-- the server knows.

alter table public.doctors
  add column if not exists remote_token text not null default '';

comment on column public.doctors.remote_token is
  'Pairing key of the doctor''s desktop app. Server-only — never grant this column.';

-- ─── the server''s own secret ────────────────────────────────────────────────
-- Lets the website read endpoint credentials without a service-role key, whose
-- blast radius would be the entire database.

create table if not exists public.app_secrets (
  name       text primary key,
  value_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;
-- No policy at all: unreachable except from SECURITY DEFINER functions.
revoke all on public.app_secrets from anon, authenticated;

create or replace function public.set_app_secret(p_name text, p_value text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  insert into app_secrets (name, value_hash)
  values (p_name, encode(digest(p_value, 'sha256'), 'hex'))
  on conflict (name) do update
    set value_hash = excluded.value_hash, updated_at = now();
$$;

-- Only callable from the SQL editor / service role, never from the app.
revoke all on function public.set_app_secret(text, text) from public, anon, authenticated;

-- ─── secretary pairs her doctor ──────────────────────────────────────────────

/**
 * Binds a pairing key to the caller's doctor.
 *
 * Restricted to the doctor the signed-in staff member actually works for, so a
 * secretary cannot re-point another practice at a key she controls.
 */
create or replace function public.link_doctor_endpoint(p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor uuid := public.staff_doctor_id();
  v_key    text := btrim(coalesce(p_key, ''));
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;

  if length(v_key) < 16 then
    raise exception 'INVALID_KEY';
  end if;

  -- Unbound staff (single-practice setups) fall back to the only doctor there is.
  if v_doctor is null then
    select id into v_doctor from doctors order by created_at limit 1;
  end if;

  if v_doctor is null then
    raise exception 'NO_DOCTOR';
  end if;

  -- The same key must not drive two practices.
  if exists (select 1 from doctors where remote_token = v_key and id <> v_doctor) then
    raise exception 'KEY_IN_USE';
  end if;

  update doctors
  set remote_token = v_key,
      remote_api_url = '',      -- forget the old address; the app re-registers
      remote_seen_at = null
  where id = v_doctor;
end;
$$;

revoke all on function public.link_doctor_endpoint(text) from public;
grant execute on function public.link_doctor_endpoint(text) to authenticated;

-- ─── desktop app registers its address ───────────────────────────────────────

-- Replaces the slug-based version: the key alone identifies the doctor now.
drop function if exists public.register_doctor_endpoint(text, text, text);

create or replace function public.register_doctor_endpoint(
  p_token text,
  p_url   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if coalesce(p_url, '') !~ '^https://[a-zA-Z0-9.-]+' then
    raise exception 'INVALID_URL';
  end if;

  select id into v_id
  from doctors
  where remote_token <> '' and remote_token = btrim(coalesce(p_token, ''));

  if v_id is null then
    raise exception 'UNKNOWN_KEY';
  end if;

  update doctors
  set remote_api_url = p_url,
      remote_seen_at = now()
  where id = v_id;
end;
$$;

revoke all on function public.register_doctor_endpoint(text, text) from public;
grant execute on function public.register_doctor_endpoint(text, text) to anon, authenticated;

-- ─── website reads one doctor''s endpoint ────────────────────────────────────

/**
 * Address + key for a single doctor, for the website's server only.
 *
 * Gated by a shared secret rather than a service-role key: the worst a leak of
 * this secret can do is expose endpoint credentials, not the whole database.
 */
create or replace function public.get_doctor_endpoint(
  p_doctor_id     uuid,
  p_server_secret text
)
returns table (api_url text, api_token text, seen_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_expected text;
begin
  select value_hash into v_expected from app_secrets where name = 'server_api_secret';

  if v_expected is null
     or v_expected <> encode(digest(coalesce(p_server_secret, ''), 'sha256'), 'hex') then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select d.remote_api_url, d.remote_token, d.remote_seen_at
  from doctors d
  where d.id = p_doctor_id;
end;
$$;

revoke all on function public.get_doctor_endpoint(uuid, text) from public;
grant execute on function public.get_doctor_endpoint(uuid, text) to anon, authenticated;

-- ─── grants ──────────────────────────────────────────────────────────────────
-- remote_token is deliberately absent from both lists: no client role may read
-- it, only the SECURITY DEFINER functions above.

revoke select on public.doctors from anon, authenticated;

grant select (
  id, slug, title, full_name, specialty, bio, photo_url,
  address, city, phone, email, latitude, longitude,
  hours, tariffs, is_published, remote_api_url, remote_seen_at
) on public.doctors to anon;

grant select (
  id, slug, title, full_name, specialty, bio, photo_url,
  address, city, phone, email, latitude, longitude,
  hours, tariffs, is_published, remote_api_url, remote_seen_at,
  remote_token_hash, created_at
) on public.doctors to authenticated;

grant insert, update, delete on public.doctors to authenticated;
