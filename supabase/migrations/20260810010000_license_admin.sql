-- Admin operations on license_keys / license_activations.
--
-- The website never gets a service-role key (see .env's own warning: "Never
-- put it in Vercel") — every privileged path here goes through a SECURITY
-- DEFINER function gated by a shared secret instead, the same shape as
-- get_doctor_endpoint(). A leak of that secret exposes license data only,
-- never the rest of the database.
--
-- Set the secret once, from the SQL editor (never from the app):
--   select public.set_app_secret('admin_api_secret', '<value>');
-- and put the same value in the website's ADMIN_API_SECRET env var.

create extension if not exists pgcrypto with schema extensions;

create or replace function public._check_admin_secret(p_admin_secret text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_expected text;
begin
  select value_hash into v_expected from app_secrets where name = 'admin_api_secret';

  if v_expected is null
     or v_expected <> encode(digest(coalesce(p_admin_secret, ''), 'sha256'), 'hex') then
    raise exception 'FORBIDDEN';
  end if;
end;
$$;

revoke all on function public._check_admin_secret(text) from public, anon, authenticated;

-- ─── list ─────────────────────────────────────────────────────────────────────

create or replace function public.admin_list_licenses(p_admin_secret text)
returns table (
  key              text,
  label            text,
  max_activations  int,
  expires_at       timestamptz,
  revoked          boolean,
  created_at       timestamptz,
  activation_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_secret(p_admin_secret);

  return query
  select
    k.key, k.label, k.max_activations, k.expires_at, k.revoked, k.created_at,
    count(a.id)
  from license_keys k
  left join license_activations a on a.license_key = k.key
  group by k.key
  order by k.created_at desc;
end;
$$;

revoke all on function public.admin_list_licenses(text) from public;
grant execute on function public.admin_list_licenses(text) to anon;

-- p_key = null lists every activation across every key (for the dashboard's
-- growth chart); a specific key scopes to that key's machines.
create or replace function public.admin_list_activations(p_admin_secret text, p_key text default null)
returns table (
  id                  uuid,
  license_key         text,
  machine_fingerprint text,
  hostname            text,
  activated_at        timestamptz,
  last_seen_at        timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_secret(p_admin_secret);

  return query
  select a.id, a.license_key, a.machine_fingerprint, a.hostname, a.activated_at, a.last_seen_at
  from license_activations a
  where p_key is null or a.license_key = p_key
  order by a.activated_at asc;
end;
$$;

revoke all on function public.admin_list_activations(text, text) from public;
grant execute on function public.admin_list_activations(text, text) to anon;

-- ─── create ───────────────────────────────────────────────────────────────────

-- Excludes 0/O/1/I/L, same alphabet as the offline generator script, so a key
-- typed by hand from either source is equally hard to misread.
create or replace function public._random_license_key()
returns text
language plpgsql
set search_path = public, extensions
as $$
declare
  alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  result   text := 'DOCTY';
  i        int;
begin
  for g in 1..4 loop
    result := result || '-';
    for i in 1..5 loop
      result := result || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % 32), 1);
    end loop;
  end loop;
  return result;
end;
$$;

create or replace function public.admin_create_license(
  p_admin_secret    text,
  p_label           text default '',
  p_max_activations int  default 2,
  p_expires_at      timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_key text;
begin
  perform public._check_admin_secret(p_admin_secret);

  loop
    v_key := public._random_license_key();
    exit when not exists (select 1 from license_keys where key = v_key);
  end loop;

  insert into license_keys (key, label, max_activations, expires_at)
  values (v_key, coalesce(p_label, ''), greatest(1, coalesce(p_max_activations, 2)), p_expires_at);

  return v_key;
end;
$$;

revoke all on function public.admin_create_license(text, text, int, timestamptz) from public;
grant execute on function public.admin_create_license(text, text, int, timestamptz) to anon;

-- ─── update / delete ────────────────────────────────────────────────────────

create or replace function public.admin_update_license(
  p_admin_secret    text,
  p_key             text,
  p_max_activations int,
  p_expires_at      timestamptz,
  p_revoked         boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_secret(p_admin_secret);

  update license_keys
  set max_activations = greatest(1, coalesce(p_max_activations, max_activations)),
      expires_at = p_expires_at,
      revoked = coalesce(p_revoked, revoked)
  where key = p_key;

  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.admin_update_license(text, text, int, timestamptz, boolean) from public;
grant execute on function public.admin_update_license(text, text, int, timestamptz, boolean) to anon;

create or replace function public.admin_delete_license(p_admin_secret text, p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_secret(p_admin_secret);
  delete from license_keys where key = p_key;
end;
$$;

revoke all on function public.admin_delete_license(text, text) from public;
grant execute on function public.admin_delete_license(text, text) to anon;

-- Frees one machine slot (e.g. a doctor replaced a PC) without touching the
-- key's other activation or its limit.
create or replace function public.admin_release_activation(p_admin_secret text, p_activation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_secret(p_admin_secret);
  delete from license_activations where id = p_activation_id;
end;
$$;

revoke all on function public.admin_release_activation(text, uuid) from public;
grant execute on function public.admin_release_activation(text, uuid) to anon;
