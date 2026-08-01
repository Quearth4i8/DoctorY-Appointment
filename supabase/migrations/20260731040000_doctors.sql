-- Public-facing doctor profiles.
--
-- One doctor today, but the profile lives in a table rather than in the page
-- source so adding a second is data entry, not a deploy.
--
-- PRIVACY: this table holds only what a doctor would put on a plaque or a
-- website — name, specialty, address, opening hours, tariffs. It deliberately
-- does NOT hold the agenda. Consultation hours are published; appointments are
-- not, so nothing here can reveal who is being seen or when.

create table if not exists public.doctors (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null default 'Dr',
  full_name    text not null,
  specialty    text not null default '',
  bio          text not null default '',
  photo_url    text not null default '',

  address      text not null default '',
  city         text not null default '',
  phone        text not null default '',
  email        text not null default '',

  -- [{"day":1,"ranges":[["08:00","13:00"],["15:00","18:00"]]}, …]  1 = Monday.
  -- A day with no entry, or an empty ranges array, reads as closed.
  hours        jsonb not null default '[]'::jsonb,

  -- [{"label":"Consultation","amount":50,"note":""}, …] — currency is per
  -- deployment, not per row.
  tariffs      jsonb not null default '[]'::jsonb,

  -- Nothing is visible to the public until someone deliberately publishes it.
  is_published boolean not null default false,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.doctors is
  'Public profile: identity, contact, consultation hours, tariffs. Never the agenda.';

-- Which doctor a public request is for. Nullable, because requests created
-- before this column existed have no doctor, and a single-doctor practice does
-- not need one.
alter table public.appointment_requests
  add column if not exists doctor_id uuid references public.doctors (id) on delete set null;

create index if not exists doctors_published_idx
  on public.doctors (is_published, full_name);

alter table public.doctors enable row level security;

-- Anyone on the internet may read a PUBLISHED profile. Unpublished drafts stay
-- invisible until they are ready.
drop policy if exists "public reads published doctors" on public.doctors;
create policy "public reads published doctors"
  on public.doctors for select
  to anon, authenticated
  using (is_published = true);

-- Staff see everything, including drafts, and are the only writers.
drop policy if exists "staff read all doctors" on public.doctors;
create policy "staff read all doctors"
  on public.doctors for select
  to authenticated
  using (public.is_staff());

drop policy if exists "staff write doctors" on public.doctors;
create policy "staff write doctors"
  on public.doctors for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- anon may read, never write.
revoke all on public.doctors from anon;
grant select on public.doctors to anon;
grant select, insert, update, delete on public.doctors to authenticated;

-- Keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists doctors_touch_updated_at on public.doctors;
create trigger doctors_touch_updated_at
  before update on public.doctors
  for each row execute function public.touch_updated_at();

-- Seed the practice's own profile as an unpublished draft, so the settings
-- page has something to edit. Fill it in, then flip is_published.
insert into public.doctors (slug, full_name, specialty, is_published, hours, tariffs)
values (
  'medecin',
  'Nom du médecin',
  'Médecine générale',
  false,
  '[{"day":1,"ranges":[["08:00","13:00"],["15:00","18:00"]]},
    {"day":2,"ranges":[["08:00","13:00"],["15:00","18:00"]]},
    {"day":3,"ranges":[["08:00","13:00"],["15:00","18:00"]]},
    {"day":4,"ranges":[["08:00","13:00"],["15:00","18:00"]]},
    {"day":5,"ranges":[["08:00","13:00"],["15:00","18:00"]]},
    {"day":6,"ranges":[["08:00","13:00"]]}]'::jsonb,
  '[{"label":"Consultation","amount":50,"note":""},
    {"label":"Contrôle","amount":30,"note":""}]'::jsonb
)
on conflict (slug) do nothing;
