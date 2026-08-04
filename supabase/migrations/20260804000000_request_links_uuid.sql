-- Let an accepted request point at the rows it actually became.
--
-- `desktop_patient_id` and `desktop_appointment_id` were bigint because in the
-- original design accepting a request created nothing in this database: the
-- doctor's app pulled the accepted row, wrote the patient and the appointment
-- into doctor.db, and stamped these two columns with the SQLite ids it had just
-- issued. Integers, because SQLite row ids are integers.
--
-- 20260801000000_shared_front_desk moved patients and appointments into
-- Postgres with uuid primary keys, and POST /api/requests/[id]/accept now
-- creates both here — but it kept writing their ids into the bigint columns.
-- Postgres rejects every such update with "invalid input syntax for type
-- bigint", which the route reports as:
--
--   "Le rendez-vous a bien été créé, mais la demande n'a pas pu être marquée
--    comme acceptée."
--
-- Which was exactly true, and permanent: the patient and the appointment were
-- real, only the bookkeeping update failed, so the request stayed en_attente
-- for ever and re-validating it would have booked the same person twice.
--
-- The names go too. Nothing about these is "desktop" any more — they are plain
-- foreign keys into this schema, and the doctor's app does not read this table
-- at all now.
--
-- EVERY STEP BELOW IS CONDITIONAL, and that is not decoration. Supabase's SQL
-- editor runs a script without wrapping it in a transaction, so a failure
-- halfway leaves the earlier statements applied — as happened here: the renames
-- stuck, the type change did not, and re-running hit "column
-- desktop_patient_id does not exist" before reaching the part that still had
-- work to do. Written this way, the file can be run against a database in any
-- of those states and finishes the job from wherever it actually is.

-- The original insert policy pinned every review and sync column to its
-- pristine value, these two included — and Postgres will not alter the type of
-- a column any policy so much as mentions.
--
-- 20260731030000_public_intake already dropped it: submissions stopped going
-- from the browser to PostgREST and started going through POST
-- /api/public/requests, which calls submit_appointment_request() — security
-- definer, so `anon` needs no privilege on this table and has held none since.
-- It survives on at least one database, so drop it here too rather than leave
-- the schema depending on which migrations a given project actually ran.
--
-- This only ever permitted a direct INSERT of a pristine pending row. Removing
-- it takes a write path away; it opens nothing.
drop policy if exists "anyone can submit a request" on public.appointment_requests;

-- ─── 1. names ────────────────────────────────────────────────────────────────

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointment_requests'
      and column_name = 'desktop_patient_id'
  ) then
    alter table public.appointment_requests
      rename column desktop_patient_id to patient_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointment_requests'
      and column_name = 'desktop_appointment_id'
  ) then
    alter table public.appointment_requests
      rename column desktop_appointment_id to appointment_id;
  end if;
end $$;

-- ─── 2. types ────────────────────────────────────────────────────────────────
-- No cast exists from bigint to uuid, and none is wanted: any value in there is
-- a doctor.db row id from the old handshake and means nothing in this schema.
-- Only the link is dropped — status, slot, notes and reviewer are untouched.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointment_requests'
      and column_name = 'patient_id'
      and data_type <> 'uuid'
  ) then
    alter table public.appointment_requests
      alter column patient_id type uuid using null::uuid;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointment_requests'
      and column_name = 'appointment_id'
      and data_type <> 'uuid'
  ) then
    alter table public.appointment_requests
      alter column appointment_id type uuid using null::uuid;
  end if;
end $$;

-- ─── 3. foreign keys ─────────────────────────────────────────────────────────
-- `on delete set null`, never cascade: a request is the record of what was
-- asked and what was decided. Deleting the appointment it produced must not
-- erase the fact that someone asked for it.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.appointment_requests'::regclass
      and conname = 'appointment_requests_patient_fk'
  ) then
    alter table public.appointment_requests
      add constraint appointment_requests_patient_fk
        foreign key (patient_id) references public.patients (id)
        on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.appointment_requests'::regclass
      and conname = 'appointment_requests_appointment_fk'
  ) then
    alter table public.appointment_requests
      add constraint appointment_requests_appointment_fk
        foreign key (appointment_id) references public.appointments (id)
        on delete set null;
  end if;
end $$;

comment on column public.appointment_requests.patient_id is
  'The patient this request became, once accepted. Null while pending.';
comment on column public.appointment_requests.appointment_id is
  'The appointment this request became, once accepted. Null while pending.';
