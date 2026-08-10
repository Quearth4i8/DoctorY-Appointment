-- License keys: each key may be activated on at most a fixed number of
-- distinct machines. Enforcement lives here, not in the desktop app, because
-- a check the app makes about itself cannot stop the same key being copied
-- onto a third, fourth, fifth PC — only a server both installs must reach can.
--
-- The desktop app is single-tenant per install (one doctor's data per
-- doctor.db), so a key is not tied to any row in `doctors`. You (the
-- operator) generate a key offline, hand it to a doctor, and the app proves
-- the machine it runs on is one of the machines that key is allowed on.

create table if not exists public.license_keys (
  key             text primary key,
  label           text not null default '',   -- your own note, e.g. the doctor's name
  max_activations int  not null default 2,
  expires_at      timestamptz,
  revoked         boolean not null default false,
  created_at      timestamptz not null default now()
);

comment on table public.license_keys is
  'Issued offline (see api/scripts/generate_license_key.py in the desktop repo). Never exposed to anon directly — only through activate_license().';

create table if not exists public.license_activations (
  id                  uuid primary key default gen_random_uuid(),
  license_key         text not null references public.license_keys(key) on delete cascade,
  machine_fingerprint text not null,
  hostname            text,
  activated_at        timestamptz not null default now(),
  last_seen_at        timestamptz not null default now(),
  unique (license_key, machine_fingerprint)
);

alter table public.license_keys enable row level security;
alter table public.license_activations enable row level security;

-- No policies on either table: both are reachable only through the SECURITY
-- DEFINER function below, never through a direct anon/authenticated grant.
revoke all on public.license_keys from anon, authenticated;
revoke all on public.license_activations from anon, authenticated;

/**
 * Called by the desktop app on every startup that has a network connection.
 *
 * Idempotent for a machine already on the key's activation list — it just
 * refreshes last_seen_at and returns ok, so the same call serves both the
 * first activation and every later revalidation. A machine not yet on the
 * list is added only while there is room under max_activations; once full,
 * every further distinct machine is refused.
 */
create or replace function public.activate_license(
  p_key         text,
  p_fingerprint text,
  p_hostname    text default null
)
returns table (ok boolean, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key   record;
  v_count int;
begin
  select * into v_key from license_keys where key = btrim(coalesce(p_key, ''));

  if not found then
    raise exception 'INVALID_KEY';
  end if;

  if v_key.revoked then
    raise exception 'REVOKED';
  end if;

  if v_key.expires_at is not null and now() > v_key.expires_at then
    raise exception 'EXPIRED';
  end if;

  update license_activations
     set last_seen_at = now(),
         hostname = coalesce(p_hostname, hostname)
   where license_key = v_key.key and machine_fingerprint = p_fingerprint;

  if found then
    return query select true, v_key.expires_at;
    return;
  end if;

  select count(*) into v_count from license_activations where license_key = v_key.key;

  if v_count >= v_key.max_activations then
    raise exception 'ACTIVATION_LIMIT';
  end if;

  insert into license_activations (license_key, machine_fingerprint, hostname)
  values (v_key.key, p_fingerprint, p_hostname);

  return query select true, v_key.expires_at;
end;
$$;

revoke all on function public.activate_license(text, text, text) from public;
grant execute on function public.activate_license(text, text, text) to anon;
