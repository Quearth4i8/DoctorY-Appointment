-- ═══════════════════════════════════════════════════════════════════════════
-- Cabinet — online appointment requests
--
-- Supabase holds ONLY the public-facing layer:
--   • staff                — who is allowed to sign in and review requests
--   • appointment_requests — RDV requests submitted from the public web form
--
-- No medical data ever lands here. The doctor's SQLite database stays the
-- system of record: once the secretary accepts a request, the desktop app pulls
-- it in and stamps back the local ids.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── staff ───────────────────────────────────────────────────────────────────
-- An allowlist on top of auth.users. Creating an auth user is not enough to see
-- anything: is_staff() below is what every read/write policy checks.

create table if not exists public.staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'secretary' check (role in ('secretary', 'doctor')),
  full_name  text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.staff is
  'Allowlist of users permitted to review appointment requests.';

-- security definer so the policies below can read staff without recursing
-- through staff''s own RLS.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

alter table public.staff enable row level security;

drop policy if exists "staff read own row" on public.staff;
create policy "staff read own row"
  on public.staff for select
  to authenticated
  using (user_id = auth.uid());

-- No insert/update/delete policy: membership is managed from the Supabase
-- dashboard or with the service role key, never from the app.

-- ─── appointment_requests ────────────────────────────────────────────────────

create table if not exists public.appointment_requests (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- What the patient typed on the public form.
  last_name  text not null,
  first_name text not null default '',
  phone      text not null,
  gender     text not null default '' check (gender in ('', 'M', 'F')),
  age        integer check (age is null or (age between 0 and 130)),
  reason     text not null default '',
  preferred_at timestamptz,                    -- slot the patient asked for

  -- The secretary's review.
  status     text not null default 'en_attente'
             check (status in ('en_attente', 'accepte', 'refuse')),
  reviewed_by  uuid references auth.users (id) on delete set null,
  reviewed_at  timestamptz,
  scheduled_at timestamptz,                    -- slot actually granted
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 480),
  staff_notes  text not null default '',

  -- Handshake with the doctor's desktop app. It pulls accepted rows where
  -- desktop_synced_at is null, writes them into doctor.db, then stamps these.
  desktop_synced_at      timestamptz,
  desktop_patient_id     bigint,
  desktop_appointment_id bigint,

  -- An accepted request always carries the slot it was accepted for.
  constraint accepted_has_slot
    check (status <> 'accepte' or scheduled_at is not null)
);

comment on table public.appointment_requests is
  'Public RDV requests awaiting the secretary''s decision. No medical data.';

create index if not exists appointment_requests_pending_idx
  on public.appointment_requests (created_at desc)
  where status = 'en_attente';

-- Drives the desktop app''s "what do I still have to import?" query.
create index if not exists appointment_requests_to_sync_idx
  on public.appointment_requests (reviewed_at)
  where status = 'accepte' and desktop_synced_at is null;

alter table public.appointment_requests enable row level security;

-- Anyone on the internet may submit a request — but only a pristine, pending
-- one. Every review and sync column is pinned here so a submitter can never
-- self-approve, book a slot, or forge a synced row.
drop policy if exists "anyone can submit a request" on public.appointment_requests;
create policy "anyone can submit a request"
  on public.appointment_requests for insert
  to anon, authenticated
  with check (
    status = 'en_attente'
    and reviewed_by is null
    and reviewed_at is null
    and scheduled_at is null
    and staff_notes = ''
    and desktop_synced_at is null
    and desktop_patient_id is null
    and desktop_appointment_id is null
    and length(btrim(last_name)) between 1 and 80
    and length(btrim(phone)) between 6 and 30
    and length(reason) <= 500
  );

-- Deliberately no SELECT policy for anon: a visitor cannot read back the
-- requests table, not even the row they just inserted.

drop policy if exists "staff read requests" on public.appointment_requests;
create policy "staff read requests"
  on public.appointment_requests for select
  to authenticated
  using (public.is_staff());

drop policy if exists "staff review requests" on public.appointment_requests;
create policy "staff review requests"
  on public.appointment_requests for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "staff delete requests" on public.appointment_requests;
create policy "staff delete requests"
  on public.appointment_requests for delete
  to authenticated
  using (public.is_staff());

-- ─── grants ──────────────────────────────────────────────────────────────────
-- Supabase's default privileges hand anon full DML on new public tables, so a
-- plain `grant` is additive and leaves anon holding select/update/delete that
-- only RLS is refusing. Revoke first, then grant exactly what is needed: anon
-- may insert a request and nothing else, at the privilege level as well as the
-- policy level.

revoke all on public.appointment_requests from anon;
grant insert on public.appointment_requests to anon;

revoke all on public.staff from anon;

grant select, insert, update, delete on public.appointment_requests to authenticated;
grant select on public.staff to authenticated;

-- ─── realtime ────────────────────────────────────────────────────────────────
-- Lets the secretary''s inbox light up the moment a request arrives.
do $$
begin
  alter publication supabase_realtime add table public.appointment_requests;
exception
  when duplicate_object then null;
end
$$;
