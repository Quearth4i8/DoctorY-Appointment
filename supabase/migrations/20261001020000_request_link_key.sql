-- Requests belong to the linking code they arrived under.
--
-- Pasting a linking code nobody holds is treated as a fresh install of the
-- app for the same practice (link_doctor_endpoint → 'registered'): the
-- practice keeps its id, so its requests stayed — including those received
-- while the PREVIOUS app was linked, with "déjà patient · vérifié" checked
-- against that app's patient files.
--
-- Each request now records a fingerprint of the practice's linking code at
-- the time it arrived, and the inbox shows only the requests whose
-- fingerprint matches the code linked NOW. So:
--
--   switch to a new app   → the old app's requests are hidden
--   switch back           → they reappear exactly as they were, and the new
--                           app's are hidden — not deleted
--
-- A fingerprint (sha256), never the code itself: the code is the secret that
-- pairs the desktop app, and it stays readable by nobody.
--
-- Safe to run on a database that already ran the earlier version of this
-- file (which used an incrementing counter instead): its triggers are dropped.

create extension if not exists pgcrypto with schema extensions;

-- ─── earlier version, superseded ─────────────────────────────────────────────
drop trigger if exists doctors_bump_link_epoch on public.doctors;
drop function if exists public.bump_link_epoch();
drop trigger if exists appointment_requests_stamp_epoch on public.appointment_requests;
drop function if exists public.stamp_request_link_epoch();

-- ─── the practice's current fingerprint ─────────────────────────────────────
alter table public.doctors
  add column if not exists link_key text not null default '';

comment on column public.doctors.link_key is
  'sha256 of remote_token (the linking code), kept in step by trigger. Empty when no code is set.';

create or replace function public.sync_doctor_link_key()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  new.link_key := case
    when coalesce(new.remote_token, '') = '' then ''
    else encode(digest(new.remote_token, 'sha256'), 'hex')
  end;
  return new;
end;
$$;

drop trigger if exists doctors_sync_link_key on public.doctors;
create trigger doctors_sync_link_key
  before insert or update of remote_token on public.doctors
  for each row
  execute function public.sync_doctor_link_key();

update public.doctors
set link_key = case
  when coalesce(remote_token, '') = '' then ''
  else encode(extensions.digest(remote_token, 'sha256'), 'hex')
end;

-- Staff may read the fingerprint (not the code) to filter their inbox.
grant select (link_key) on public.doctors to authenticated;

-- ─── each request's fingerprint ─────────────────────────────────────────────
alter table public.appointment_requests
  add column if not exists link_key text;

comment on column public.appointment_requests.link_key is
  'The practice''s link_key when the request arrived. The inbox shows requests matching the current one.';

-- Existing requests: there is no record of which code was linked when they
-- arrived, so they are attributed to the current one.
update public.appointment_requests r
set link_key = d.link_key
from public.doctors d
where r.doctor_id = d.id
  and r.link_key is null;

create or replace function public.stamp_request_link_key()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.doctor_id is not null then
    select link_key into new.link_key from public.doctors where id = new.doctor_id;
  end if;
  return new;
end;
$$;

drop trigger if exists appointment_requests_stamp_link_key on public.appointment_requests;
create trigger appointment_requests_stamp_link_key
  before insert on public.appointment_requests
  for each row
  execute function public.stamp_request_link_key();

create index if not exists appointment_requests_link_idx
  on public.appointment_requests (doctor_id, link_key, created_at desc);
