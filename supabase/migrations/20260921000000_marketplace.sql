-- The annuaire: every kind of health establishment, not just doctors.
--
-- Until now the public side knew exactly one shape — `doctors` — with one
-- practitioner per row and one way to book (slots pulled live from the
-- desktop app). Pharmacies, laboratories, clinics and opticians had nowhere
-- to exist, and a clinic with twenty practitioners could not be expressed at
-- all.
--
-- The shape here is deliberately ONE table with a `kind` column rather than
-- one table per trade. What actually differs between a pharmacy and a
-- cardiologist is three things — which services they offer, how you reach
-- them, and which blocks their profile renders — and all three are data.
-- Twelve near-identical tables would buy nothing and cost every join.
--
-- `doctors` is left untouched and still backs the existing pages. This
-- migration backfills from it and links the two with `legacy_doctor_id`, so
-- the app can move page by page instead of in one jump.

create extension if not exists pg_trgm;
-- Needed by the exclusion constraint on duty_shifts: GiST has no `=` operator
-- for uuid without it, so `provider_id with =` would not compile.
create extension if not exists btree_gist;

-- ─── Vocabulary ──────────────────────────────────────────────────────────────

do $$ begin
  create type public.provider_kind as enum (
    'medecin',        -- cabinet privé, un praticien
    'clinique',
    'hopital',
    'pharmacie',
    'parapharmacie',
    'laboratoire',
    'imagerie',
    'dentiste',
    'kinesitherapie',
    'opticien',
    'infirmier',
    'sage_femme'
  );
exception when duplicate_object then null; end $$;

/*
 * How a patient reaches this establishment. This is the field that decides
 * what the public profile renders, so it is not cosmetic:
 *
 *   agenda   — real slots, pulled from the DoctorY desktop app over the
 *              pairing link. Only establishments that have paired a machine
 *              can sit here; nothing else can honestly show a time.
 *   demande  — no published agenda. The visitor says when they can, the
 *              establishment answers from its console. The default, because
 *              it needs no installation.
 *   aucune   — nothing to book. Hours, duty shifts, directions, phone. This
 *              is the right answer for pharmacies, not a degraded one.
 */
do $$ begin
  create type public.booking_mode as enum ('agenda', 'demande', 'aucune');
exception when duplicate_object then null; end $$;

/*
 * Where a row came from. An annuaire that will be seeded from a bought
 * pharmacy dataset must be able to tell an imported row from one its owner
 * wrote, or nobody can safely correct either.
 */
do $$ begin
  create type public.provider_source as enum ('manuel', 'import', 'revendique');
exception when duplicate_object then null; end $$;

/* Monetisation. `verifie` and `sponsorise` are paid; `gratuit` is the floor
   every establishment keeps for ever, so the annuaire stays complete. */
do $$ begin
  create type public.provider_plan as enum ('gratuit', 'verifie', 'sponsorise');
exception when duplicate_object then null; end $$;

-- ─── Specialties ─────────────────────────────────────────────────────────────

-- A closed taxonomy rather than the free-text `doctors.specialty`: search has
-- to match "cardio" and "cardiologue" to the same thing, and a filter list
-- cannot be built from strings people typed by hand.
create table if not exists public.specialties (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  label      text not null,
  -- Alternate spellings and the Arabic label, folded into search.
  synonyms   text[] not null default '{}',
  -- Which kinds of establishment may claim it, so the form never offers
  -- "cardiologie" to a parapharmacie.
  kinds      public.provider_kind[] not null default '{}',
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

comment on table public.specialties is
  'Closed specialty taxonomy with synonyms, used by both search and the filters.';

-- ─── Providers ───────────────────────────────────────────────────────────────

create table if not exists public.providers (
  id           uuid primary key default gen_random_uuid(),
  kind         public.provider_kind not null,
  slug         text unique not null,

  name         text not null,
  legal_name   text not null default '',
  bio          text not null default '',
  photo_url    text not null default '',
  logo_url     text not null default '',

  address      text not null default '',
  city         text not null default '',
  postcode     text not null default '',
  governorate  text not null default '',
  latitude     double precision,
  longitude    double precision,

  phone        text not null default '',
  phone_alt    text not null default '',
  email        text not null default '',
  website      text not null default '',

  -- ["fr","ar","en"] — drives the "langues parlées" filter.
  languages    text[] not null default '{fr}',

  booking_mode public.booking_mode not null default 'demande',

  -- Practical facts patients filter on. Flat booleans rather than a JSON blob
  -- because every one of them is a `where` clause on the results page.
  accepts_cnam      boolean not null default false,
  third_party_payer boolean not null default false,
  wheelchair_access boolean not null default false,
  accepts_new_patients boolean not null default true,
  open_24_7         boolean not null default false,
  has_emergency     boolean not null default false,

  -- Provenance and trust.
  source       public.provider_source not null default 'manuel',
  external_ref text not null default '',
  verified_at  timestamptz,
  claimed_by   uuid references auth.users (id) on delete set null,
  claimed_at   timestamptz,

  -- Monetisation. `plan_expires_at` is what search actually reads: a lapsed
  -- subscription must stop buying placement the day it lapses, without a job
  -- having to run.
  plan            public.provider_plan not null default 'gratuit',
  plan_expires_at timestamptz,
  -- Manual tiebreak inside the sponsored band. Lower sorts first.
  sponsor_rank    int not null default 0,

  is_published boolean not null default false,

  -- The desktop app's current tunnel address, for `booking_mode = 'agenda'`.
  -- Moved off `doctors` so a clinic with several paired machines can hold one
  -- per practitioner instead of one per building.
  remote_api_url text not null default '',
  remote_seen_at timestamptz,

  -- One-way link back to the row this was backfilled from, so the old pages
  -- and the new ones can be reconciled while both exist.
  legacy_doctor_id uuid references public.doctors (id) on delete set null,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.providers is
  'Every health establishment in the annuaire. Public facts only — never an agenda.';
comment on column public.providers.booking_mode is
  'Decides what the public profile renders. agenda = live slots, demande = request form, aucune = info only.';
comment on column public.providers.plan_expires_at is
  'Read by search: a lapsed plan loses placement immediately, with no job to run.';

/*
 * What search matches against.
 *
 * Generated rather than maintained by a trigger, so it cannot drift from the
 * row. `coalesce` throughout because a null anywhere would null the whole
 * concatenation and silently drop the establishment out of every result.
 */
alter table public.providers
  add column if not exists search_text text
  generated always as (
    coalesce(name, '') || ' ' ||
    coalesce(legal_name, '') || ' ' ||
    coalesce(city, '') || ' ' ||
    coalesce(governorate, '') || ' ' ||
    coalesce(address, '')
  ) stored;

create index if not exists providers_search_trgm_idx
  on public.providers using gin (search_text gin_trgm_ops);

-- The results page always filters on these three together.
create index if not exists providers_kind_published_idx
  on public.providers (kind, is_published, city);

-- Bounding-box prefilter before the distance sort; see distance_km below.
create index if not exists providers_geo_idx
  on public.providers (latitude, longitude)
  where latitude is not null and longitude is not null;

create index if not exists providers_plan_idx
  on public.providers (plan, plan_expires_at)
  where is_published;

-- ─── Practitioners ───────────────────────────────────────────────────────────

-- A clinic has sixty of these, a cabinet has one, a pharmacy has none. This
-- is the row an appointment is actually made with.
create table if not exists public.practitioners (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references public.providers (id) on delete cascade,
  slug         text not null,

  title        text not null default 'Dr',
  full_name    text not null,
  bio          text not null default '',
  photo_url    text not null default '',
  languages    text[] not null default '{fr}',

  -- A practitioner can be paired even when the establishment is not: in a
  -- clinic, one cardiologist may run the desktop app while the rest do not.
  booking_mode   public.booking_mode not null default 'demande',
  remote_api_url text not null default '',
  remote_seen_at timestamptz,

  accepts_new_patients boolean not null default true,
  is_published boolean not null default false,
  sort_order   int not null default 100,

  legacy_doctor_id uuid references public.doctors (id) on delete set null,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Unique per establishment, not globally: two clinics may both have a
  -- "dr-ben-amor", and the public URL is /medecins/<provider>/<practitioner>.
  unique (provider_id, slug)
);

create index if not exists practitioners_provider_idx
  on public.practitioners (provider_id, is_published, sort_order);

-- ─── Specialty links ─────────────────────────────────────────────────────────

create table if not exists public.provider_specialties (
  provider_id     uuid not null references public.providers (id) on delete cascade,
  specialty_id    uuid not null references public.specialties (id) on delete cascade,
  practitioner_id uuid references public.practitioners (id) on delete cascade,
  primary key (provider_id, specialty_id, practitioner_id)
);

-- A null practitioner_id means "the establishment offers this", which is the
-- pharmacy and laboratory case. Postgres treats nulls as distinct in a unique
-- index, so without this a provider-level specialty could be inserted twice.
create unique index if not exists provider_specialties_house_idx
  on public.provider_specialties (provider_id, specialty_id)
  where practitioner_id is null;

create index if not exists provider_specialties_lookup_idx
  on public.provider_specialties (specialty_id, provider_id);

-- ─── Services ────────────────────────────────────────────────────────────────

-- What you actually come for, with its price. Replaces `doctors.tariffs`
-- (a JSON blob nothing could search) so "bilan lipidique" is findable across
-- every laboratory in the country.
create table if not exists public.services (
  id              uuid primary key default gen_random_uuid(),
  provider_id     uuid not null references public.providers (id) on delete cascade,
  practitioner_id uuid references public.practitioners (id) on delete cascade,

  label       text not null,
  -- Trade code where one exists: an NGAP/NABM style code for an analysis, a
  -- local reference otherwise. Not unique — two labs price the same code.
  code        text not null default '',
  category    text not null default '',
  note        text not null default '',

  -- Millimes, not dinars: storing 45.5 as a float and totalling a basket of
  -- them is how you end up displaying 96.99999 DT.
  amount_millimes int,
  duration_minutes int,

  -- Analyses only: "à jeun 12 h", and how long the result takes.
  preparation text not null default '',
  result_delay_hours int,

  is_published boolean not null default true,
  sort_order  int not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists services_provider_idx
  on public.services (provider_id, is_published, sort_order);
create index if not exists services_label_trgm_idx
  on public.services using gin (label gin_trgm_ops);

-- ─── Opening hours ───────────────────────────────────────────────────────────

-- Out of `doctors.hours` (jsonb) and into rows, because "ouvert maintenant"
-- is a filter on the results page and you cannot index a JSON blob for it.
-- One row per continuous range: a day with a lunch break has two.
create table if not exists public.opening_hours (
  id              uuid primary key default gen_random_uuid(),
  provider_id     uuid not null references public.providers (id) on delete cascade,
  practitioner_id uuid references public.practitioners (id) on delete cascade,
  -- 1 = Monday … 7 = Sunday, matching the existing DayHours convention.
  weekday    smallint not null check (weekday between 1 and 7),
  opens_at   time not null,
  closes_at  time not null,
  check (closes_at > opens_at),
  created_at timestamptz not null default now()
);

create index if not exists opening_hours_lookup_idx
  on public.opening_hours (provider_id, weekday);

-- ─── Duty shifts (gardes) ────────────────────────────────────────────────────

/*
 * Pharmacies de garde.
 *
 * Stored as an explicit datetime range rather than a date plus a flag,
 * because a night shift runs from 20:00 on one day to 08:00 on the next and
 * "which pharmacy is on duty right now" is asked at 02:00 more often than at
 * any other hour. A range makes that `where now() <@ during`; a date column
 * makes it a special case nobody gets right.
 */
create table if not exists public.duty_shifts (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  -- Two plain columns rather than a range column: the range is what the
  -- overlap constraint needs, but PostgREST cannot express containment on a
  -- range from the client, and "who is on duty right now" has to be answerable
  -- as an ordinary filter. The constraint below builds the range it needs.
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  check (ends_at > starts_at),
  kind        text not null default 'nuit' check (kind in ('nuit', 'jour', 'ferie')),
  -- Where the roster came from, since these are published weekly by the
  -- regional council and will mostly arrive by import.
  source      public.provider_source not null default 'import',
  note        text not null default '',
  created_at  timestamptz not null default now(),

  -- One establishment cannot be on duty twice over the same hours. Catching
  -- that here matters because the rosters arrive by import, and a re-import
  -- that silently doubled every shift would be invisible until a patient
  -- drove to a closed pharmacy.
  exclude using gist (
    provider_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
);

comment on table public.duty_shifts is
  'On-duty rosters. Two instants, not a date: night shifts cross midnight.';

create index if not exists duty_shifts_window_idx
  on public.duty_shifts (starts_at, ends_at);

-- ─── Membership ──────────────────────────────────────────────────────────────

/*
 * Who may manage an establishment.
 *
 * The existing `staff` table binds a user to one doctor, which cannot express
 * "this person runs a cabinet and a pharmacy" — and that is the ordinary case
 * for a family that owns both. Membership is many-to-many from the start;
 * `staff` stays as it is and keeps serving the single-practice console.
 */
create table if not exists public.provider_members (
  provider_id uuid not null references public.providers (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'secretaire'
                check (role in ('proprietaire', 'gerant', 'secretaire')),
  created_at  timestamptz not null default now(),
  primary key (provider_id, user_id)
);

create index if not exists provider_members_user_idx
  on public.provider_members (user_id);

/*
 * True when the caller may write this establishment.
 *
 * SECURITY DEFINER on purpose: the policies on `providers` call this, and a
 * plain query against `provider_members` from inside one of those policies
 * would itself be filtered by `provider_members`' own policies — which would
 * then need to read `providers`. That mutual recursion is what makes Postgres
 * refuse the query outright. Reading the membership with the definer's rights
 * breaks the cycle. `search_path` is pinned so the function cannot be
 * redirected at a table someone else controls.
 */
create or replace function public.manages_provider(target uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.provider_members m
    where m.provider_id = target and m.user_id = auth.uid()
  );
$$;

revoke all on function public.manages_provider(uuid) from public;
grant execute on function public.manages_provider(uuid) to authenticated;

-- ─── Subscriptions ───────────────────────────────────────────────────────────

/*
 * The billing ledger. `providers.plan` is what search reads; this is the
 * history behind it — one row per paid period, never updated in place, so a
 * dispute about what was charged has an answer.
 */
create table if not exists public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  plan        public.provider_plan not null,
  status      text not null default 'active'
                check (status in ('active', 'annulee', 'impayee', 'expiree')),
  period_start timestamptz not null default now(),
  period_end   timestamptz not null,
  amount_millimes int not null default 0,
  currency    text not null default 'TND',
  -- Whatever the payment processor calls this charge.
  external_ref text not null default '',
  note        text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists subscriptions_provider_idx
  on public.subscriptions (provider_id, period_end desc);

-- ─── Reports ─────────────────────────────────────────────────────────────────

-- An annuaire seeded from imported data is wrong somewhere on day one. This
-- is the only way a visitor can say so, and the back-office's work queue.
create table if not exists public.provider_reports (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  reason      text not null
                check (reason in ('horaires', 'adresse', 'telephone', 'ferme', 'garde', 'autre')),
  detail      text not null default '',
  contact     text not null default '',
  status      text not null default 'nouveau'
                check (status in ('nouveau', 'traite', 'rejete')),
  created_at  timestamptz not null default now()
);

create index if not exists provider_reports_open_idx
  on public.provider_reports (status, created_at desc);

-- ─── Distance ────────────────────────────────────────────────────────────────

/*
 * Great-circle distance in kilometres.
 *
 * Plain trigonometry rather than PostGIS or earthdistance: neither extension
 * is needed for "sort 40 results by how far they are", and requiring one is a
 * deployment problem for no accuracy that matters at city scale.
 *
 * IMMUTABLE so it can be used in an index expression later if the result set
 * ever outgrows a bounding-box prefilter.
 */
create or replace function public.distance_km(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
)
returns double precision
language sql
immutable
parallel safe
as $$
  select case
    when lat1 is null or lon1 is null or lat2 is null or lon2 is null then null
    else 6371 * 2 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians(lon2 - lon1) / 2), 2)
    ))
  end;
$$;

-- ─── updated_at ──────────────────────────────────────────────────────────────

drop trigger if exists providers_touch_updated_at on public.providers;
create trigger providers_touch_updated_at
  before update on public.providers
  for each row execute function public.touch_updated_at();

drop trigger if exists practitioners_touch_updated_at on public.practitioners;
create trigger practitioners_touch_updated_at
  before update on public.practitioners
  for each row execute function public.touch_updated_at();

drop trigger if exists services_touch_updated_at on public.services;
create trigger services_touch_updated_at
  before update on public.services
  for each row execute function public.touch_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table public.specialties          enable row level security;
alter table public.providers            enable row level security;
alter table public.practitioners        enable row level security;
alter table public.provider_specialties enable row level security;
alter table public.services             enable row level security;
alter table public.opening_hours        enable row level security;
alter table public.duty_shifts          enable row level security;
alter table public.provider_members     enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.provider_reports     enable row level security;

-- The taxonomy is public and read-only to everyone but staff.
drop policy if exists "anyone reads specialties" on public.specialties;
create policy "anyone reads specialties"
  on public.specialties for select to anon, authenticated using (true);

drop policy if exists "staff write specialties" on public.specialties;
create policy "staff write specialties"
  on public.specialties for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Published establishments are the annuaire. Drafts are invisible.
drop policy if exists "public reads published providers" on public.providers;
create policy "public reads published providers"
  on public.providers for select to anon, authenticated
  using (is_published = true);

drop policy if exists "members read own provider" on public.providers;
create policy "members read own provider"
  on public.providers for select to authenticated
  using (public.manages_provider(id) or public.is_staff());

drop policy if exists "members write own provider" on public.providers;
create policy "members write own provider"
  on public.providers for update to authenticated
  using (public.manages_provider(id) or public.is_staff())
  with check (public.manages_provider(id) or public.is_staff());

-- Creating and deleting an establishment stays with the operator: a member is
-- attached to a provider that already exists, and self-service signup goes
-- through a claim, not an insert.
drop policy if exists "staff create providers" on public.providers;
create policy "staff create providers"
  on public.providers for insert to authenticated
  with check (public.is_staff());

drop policy if exists "staff delete providers" on public.providers;
create policy "staff delete providers"
  on public.providers for delete to authenticated
  using (public.is_staff());

/*
 * Children of a provider all follow the same two rules: the public sees a row
 * whose parent is published, and a member sees and writes everything under a
 * provider they manage.
 */
do $$
declare
  t text;
  own_flag text;
begin
  foreach t in array array[
    'practitioners', 'provider_specialties', 'services', 'opening_hours', 'duty_shifts'
  ] loop
    -- practitioners and services carry their own is_published flag; the rest
    -- are visible whenever their parent is.
    own_flag := case
      when t in ('practitioners', 'services') then format(' and public.%I.is_published', t)
      else ''
    end;

    execute format($f$
      drop policy if exists "public reads %1$s" on public.%1$s;
      create policy "public reads %1$s"
        on public.%1$s for select to anon, authenticated
        using (exists (
          select 1 from public.providers p
          where p.id = public.%1$s.provider_id and p.is_published
        )%2$s);
    $f$, t, own_flag);

    execute format($f$
      drop policy if exists "members manage %1$s" on public.%1$s;
      create policy "members manage %1$s"
        on public.%1$s for all to authenticated
        using (public.manages_provider(provider_id) or public.is_staff())
        with check (public.manages_provider(provider_id) or public.is_staff());
    $f$, t);
  end loop;
end $$;

-- Membership: you may see the rows that name you. Only the operator grants it.
drop policy if exists "read own memberships" on public.provider_members;
create policy "read own memberships"
  on public.provider_members for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists "staff write memberships" on public.provider_members;
create policy "staff write memberships"
  on public.provider_members for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Billing is between the establishment and the operator. Never public.
drop policy if exists "members read own subscriptions" on public.subscriptions;
create policy "members read own subscriptions"
  on public.subscriptions for select to authenticated
  using (public.manages_provider(provider_id) or public.is_staff());

drop policy if exists "staff write subscriptions" on public.subscriptions;
create policy "staff write subscriptions"
  on public.subscriptions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Anyone may report an error; nobody but staff may read the queue. A visitor
-- who could read reports could enumerate which establishments are disputed.
drop policy if exists "anyone reports" on public.provider_reports;
create policy "anyone reports"
  on public.provider_reports for insert to anon, authenticated
  with check (status = 'nouveau');

drop policy if exists "staff handle reports" on public.provider_reports;
create policy "staff handle reports"
  on public.provider_reports for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ─── Grants ──────────────────────────────────────────────────────────────────
--
-- Privileges are set to match the policies, so a future policy mistake cannot
-- by itself open a write. anon reads the annuaire and may insert one thing.

revoke all on public.specialties          from anon;
revoke all on public.providers            from anon;
revoke all on public.practitioners        from anon;
revoke all on public.provider_specialties from anon;
revoke all on public.services             from anon;
revoke all on public.opening_hours        from anon;
revoke all on public.duty_shifts          from anon;
revoke all on public.provider_members     from anon;
revoke all on public.subscriptions        from anon;
revoke all on public.provider_reports     from anon;

grant select on public.specialties          to anon;
grant select on public.providers            to anon;
grant select on public.practitioners        to anon;
grant select on public.provider_specialties to anon;
grant select on public.services             to anon;
grant select on public.opening_hours        to anon;
grant select on public.duty_shifts          to anon;
grant insert on public.provider_reports     to anon;

grant select, insert, update, delete on public.specialties          to authenticated;
grant select, insert, update, delete on public.providers            to authenticated;
grant select, insert, update, delete on public.practitioners        to authenticated;
grant select, insert, update, delete on public.provider_specialties to authenticated;
grant select, insert, update, delete on public.services             to authenticated;
grant select, insert, update, delete on public.opening_hours        to authenticated;
grant select, insert, update, delete on public.duty_shifts          to authenticated;
grant select, insert, update, delete on public.provider_members     to authenticated;
grant select, insert, update, delete on public.subscriptions        to authenticated;
grant select, insert, update, delete on public.provider_reports     to authenticated;

grant execute on function public.distance_km(
  double precision, double precision, double precision, double precision
) to anon, authenticated;

-- ─── Seed: the specialty taxonomy ────────────────────────────────────────────

insert into public.specialties (slug, label, synonyms, kinds, sort_order) values
  ('medecine-generale', 'Médecine générale', array['generaliste','omnipraticien','طب عام'], array['medecin','clinique','hopital']::public.provider_kind[], 10),
  ('cardiologie',       'Cardiologie',       array['cardio','cardiologue','أمراض القلب'],   array['medecin','clinique','hopital']::public.provider_kind[], 20),
  ('pediatrie',         'Pédiatrie',         array['pediatre','طب الأطفال'],                 array['medecin','clinique','hopital']::public.provider_kind[], 30),
  ('gynecologie',       'Gynécologie',       array['gyneco','gynecologue','أمراض النساء'],   array['medecin','clinique','hopital']::public.provider_kind[], 40),
  ('ophtalmologie',     'Ophtalmologie',     array['ophtalmo','ophtalmologue','طب العيون'],  array['medecin','clinique','hopital']::public.provider_kind[], 50),
  ('dermatologie',      'Dermatologie',      array['dermato','dermatologue','الجلدية'],      array['medecin','clinique','hopital']::public.provider_kind[], 60),
  ('orl',               'ORL',               array['oto-rhino','otorhinolaryngologie'],      array['medecin','clinique','hopital']::public.provider_kind[], 70),
  ('radiologie',        'Radiologie',        array['imagerie','scanner','irm','أشعة'],       array['imagerie','clinique','hopital']::public.provider_kind[], 80),
  ('biologie-medicale', 'Biologie médicale', array['analyses','laboratoire','تحاليل'],       array['laboratoire','clinique','hopital']::public.provider_kind[], 90),
  ('chirurgie-dentaire','Chirurgie dentaire',array['dentiste','طب الأسنان'],                 array['dentiste','clinique']::public.provider_kind[], 100),
  ('kinesitherapie',    'Kinésithérapie',    array['kine','physiotherapie'],                 array['kinesitherapie','clinique','hopital']::public.provider_kind[], 110),
  ('pharmacie',         'Pharmacie',         array['pharmacien','صيدلية'],                   array['pharmacie']::public.provider_kind[], 120),
  ('parapharmacie',     'Parapharmacie',     array['cosmetique','para'],                     array['parapharmacie']::public.provider_kind[], 130),
  ('optique',           'Optique',           array['opticien','lunettes','بصريات'],          array['opticien']::public.provider_kind[], 140),
  ('soins-infirmiers',  'Soins infirmiers',  array['infirmier','infirmiere','تمريض'],        array['infirmier']::public.provider_kind[], 150),
  ('sage-femme',        'Sage-femme',        array['maieutique','قابلة'],                    array['sage_femme','clinique','hopital']::public.provider_kind[], 160)
on conflict (slug) do nothing;

-- ─── Backfill from `doctors` ─────────────────────────────────────────────────
--
-- Every existing profile becomes one establishment plus one practitioner, so
-- nothing that was published disappears the moment the new pages go live.
-- `on conflict do nothing` keyed on legacy_doctor_id makes this re-runnable.

insert into public.providers (
  kind, slug, name, bio, photo_url, address, city, phone, email,
  latitude, longitude, booking_mode, is_published,
  remote_api_url, remote_seen_at, source, legacy_doctor_id
)
select
  'medecin'::public.provider_kind,
  d.slug,
  trim(coalesce(d.title, 'Dr') || ' ' || d.full_name),
  d.bio, d.photo_url, d.address, d.city, d.phone, d.email,
  d.latitude, d.longitude,
  -- Everything already on the platform is paired with a desktop app; that is
  -- what the whole product was until now.
  'agenda'::public.booking_mode,
  d.is_published,
  d.remote_api_url, d.remote_seen_at,
  'manuel'::public.provider_source,
  d.id
from public.doctors d
where not exists (
  select 1 from public.providers p where p.legacy_doctor_id = d.id
);

insert into public.practitioners (
  provider_id, slug, title, full_name, bio, photo_url,
  booking_mode, remote_api_url, remote_seen_at, is_published, legacy_doctor_id
)
select
  p.id, d.slug, coalesce(nullif(trim(d.title), ''), 'Dr'), d.full_name,
  d.bio, d.photo_url,
  'agenda'::public.booking_mode, d.remote_api_url, d.remote_seen_at,
  d.is_published, d.id
from public.doctors d
join public.providers p on p.legacy_doctor_id = d.id
where not exists (
  select 1 from public.practitioners x where x.legacy_doctor_id = d.id
);

-- Opening hours out of the jsonb blob and into rows.
insert into public.opening_hours (provider_id, weekday, opens_at, closes_at)
select
  p.id,
  (day_entry ->> 'day')::smallint,
  (range_entry ->> 0)::time,
  (range_entry ->> 1)::time
from public.doctors d
join public.providers p on p.legacy_doctor_id = d.id
cross join lateral jsonb_array_elements(d.hours) as day_entry
cross join lateral jsonb_array_elements(day_entry -> 'ranges') as range_entry
where jsonb_typeof(d.hours) = 'array'
  and (range_entry ->> 1)::time > (range_entry ->> 0)::time
  and not exists (
    select 1 from public.opening_hours oh where oh.provider_id = p.id
  );

-- Tariffs out of the jsonb blob and into services.
insert into public.services (provider_id, label, amount_millimes, note, sort_order)
select
  p.id,
  coalesce(t ->> 'label', 'Consultation'),
  -- Tariffs were stored in dinars; services are in millimes.
  round(coalesce((t ->> 'amount')::numeric, 0) * 1000)::int,
  coalesce(t ->> 'note', ''),
  (row_number() over (partition by p.id))::int * 10
from public.doctors d
join public.providers p on p.legacy_doctor_id = d.id
cross join lateral jsonb_array_elements(d.tariffs) as t
where jsonb_typeof(d.tariffs) = 'array'
  and not exists (
    select 1 from public.services s where s.provider_id = p.id
  );

-- The free-text specialty, matched to the taxonomy where it lines up. A
-- profile whose specialty was typed as something unrecognised keeps the text
-- on `doctors` and simply gets no link — better than inventing one.
insert into public.provider_specialties (provider_id, specialty_id, practitioner_id)
select distinct p.id, s.id, null::uuid
from public.doctors d
join public.providers p on p.legacy_doctor_id = d.id
join public.specialties s
  on lower(trim(d.specialty)) = lower(s.label)
  or lower(trim(d.specialty)) = any (s.synonyms)
where coalesce(d.specialty, '') <> ''
on conflict do nothing;
