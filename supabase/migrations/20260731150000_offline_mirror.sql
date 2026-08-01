-- Read-only mirror, so the secretary can work while the doctor's PC is off.
--
-- doctor.db stays the system of record. This is a cached copy the desktop app
-- pushes whenever it is online, and the website falls back to when it cannot
-- reach the practice. Nothing here is ever written by the website: everything
-- the secretary changes still goes to doctor.db, which is why she needs the PC
-- awake to *modify* anything, only not to *look*.
--
-- WHAT IS MIRRORED: exactly the projection the secretary can already see —
-- identity, contact and administrative fields. Consultations, notes, blood
-- groups, habits, treatments, documents and CNAM forms are never pushed and
-- have no columns here.

create table if not exists public.mirror_patients (
  doctor_id      uuid not null references public.doctors (id) on delete cascade,
  patient_id     bigint not null,
  last_name      text not null default '',
  first_name     text not null default '',
  father_name    text not null default '',
  display_name   text not null default '',
  phone          text not null default '',
  gender         text not null default '',
  age            integer,
  address        text not null default '',
  email          text not null default '',
  job            text not null default '',
  date_of_birth  text not null default '',
  insurance_type text not null default '',
  numero_dossier text not null default '',
  created_at     text not null default '',
  primary key (doctor_id, patient_id)
);

create table if not exists public.mirror_appointments (
  doctor_id            uuid not null references public.doctors (id) on delete cascade,
  appointment_id       bigint not null,
  patient_id           bigint,
  patient_name         text not null default '',
  appointment_datetime text not null default '',
  duration_minutes     integer not null default 30,
  status               text not null default 'a_venir',
  notes                text not null default '',
  primary key (doctor_id, appointment_id)
);

create index if not exists mirror_patients_search_idx
  on public.mirror_patients (doctor_id, last_name, first_name);
create index if not exists mirror_appointments_when_idx
  on public.mirror_appointments (doctor_id, appointment_datetime);

alter table public.doctors
  add column if not exists mirror_synced_at timestamptz;

-- ─── read access ─────────────────────────────────────────────────────────────
-- Staff of that practice only. Never anon: this is patient data.

alter table public.mirror_patients enable row level security;
alter table public.mirror_appointments enable row level security;

drop policy if exists "staff read own mirror patients" on public.mirror_patients;
create policy "staff read own mirror patients"
  on public.mirror_patients for select
  to authenticated
  using (public.can_access_request(doctor_id));

drop policy if exists "staff read own mirror appointments" on public.mirror_appointments;
create policy "staff read own mirror appointments"
  on public.mirror_appointments for select
  to authenticated
  using (public.can_access_request(doctor_id));

revoke all on public.mirror_patients from anon, authenticated;
revoke all on public.mirror_appointments from anon, authenticated;
grant select on public.mirror_patients to authenticated;
grant select on public.mirror_appointments to authenticated;

-- ─── the desktop app pushes a snapshot ───────────────────────────────────────

/**
 * Replaces this practice's mirror in one transaction.
 *
 * A full snapshot rather than a delta: doctor.db has no updated_at anywhere, so
 * there is no reliable way to ask what changed. Replacing is also
 * self-healing — a deleted patient disappears instead of lingering forever.
 *
 * Authenticated by the pairing key, the same secret the tunnel uses.
 */
create or replace function public.push_mirror(
  p_token        text,
  p_patients     jsonb,
  p_appointments jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor uuid;
begin
  select id into v_doctor
  from doctors
  where remote_token <> '' and remote_token = btrim(coalesce(p_token, ''));

  if v_doctor is null then
    raise exception 'UNKNOWN_KEY';
  end if;

  delete from mirror_patients where doctor_id = v_doctor;
  insert into mirror_patients (
    doctor_id, patient_id, last_name, first_name, father_name, display_name,
    phone, gender, age, address, email, job, date_of_birth, insurance_type,
    numero_dossier, created_at
  )
  select
    v_doctor,
    (r->>'id')::bigint,
    coalesce(r->>'last_name', ''), coalesce(r->>'first_name', ''),
    coalesce(r->>'father_name', ''), coalesce(r->>'display_name', ''),
    coalesce(r->>'phone', ''), coalesce(r->>'gender', ''),
    nullif(r->>'age', '')::integer,
    coalesce(r->>'address', ''), coalesce(r->>'email', ''),
    coalesce(r->>'job', ''), coalesce(r->>'date_of_birth', ''),
    coalesce(r->>'insurance_type', ''), coalesce(r->>'numero_dossier', ''),
    coalesce(r->>'created_at', '')
  from jsonb_array_elements(coalesce(p_patients, '[]'::jsonb)) as r;

  delete from mirror_appointments where doctor_id = v_doctor;
  insert into mirror_appointments (
    doctor_id, appointment_id, patient_id, patient_name,
    appointment_datetime, duration_minutes, status, notes
  )
  select
    v_doctor,
    (r->>'id')::bigint,
    nullif(r->>'patient_id', '')::bigint,
    coalesce(r->>'patient_name', ''),
    coalesce(r->>'appointment_datetime', ''),
    coalesce(nullif(r->>'duration_minutes', '')::integer, 30),
    coalesce(r->>'status', 'a_venir'),
    coalesce(r->>'notes', '')
  from jsonb_array_elements(coalesce(p_appointments, '[]'::jsonb)) as r;

  update doctors set mirror_synced_at = now() where id = v_doctor;
end;
$$;

revoke all on function public.push_mirror(text, jsonb, jsonb) from public;
grant execute on function public.push_mirror(text, jsonb, jsonb) to anon, authenticated;

-- Lets the website show "données du …" without exposing anything else.
create or replace function public.mirror_synced_at()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor uuid;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;
  v_doctor := public.staff_doctor_id();
  if v_doctor is null then
    select id into v_doctor from doctors order by created_at limit 1;
  end if;
  return (select d.mirror_synced_at from doctors d where d.id = v_doctor);
end;
$$;

-- Supabase grants EXECUTE on new functions to anon by default, so revoking
-- from PUBLIC is not enough — anon has to be named. The function refuses
-- non-staff callers anyway; this just stops it being reachable at all.
revoke all on function public.mirror_synced_at() from public, anon;
grant execute on function public.mirror_synced_at() to authenticated;
