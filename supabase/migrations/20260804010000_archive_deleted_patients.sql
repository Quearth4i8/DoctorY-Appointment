-- Deleting a patient on the doctor's machine clears their future agenda,
-- and leaves what already happened alone.
--
-- Until now his delete reached the website as a plain `delete from patients`,
-- and appointments cascade from that row — so removing a patient also erased
-- her record of every visit they had ever made. That is not what deleting a
-- patient means. He is saying "no longer a patient of this practice", not "this
-- person was never here".
--
-- So the row is archived instead:
--
--   * appointments from the moment of deletion onward are deleted, because
--     nobody is coming to them,
--   * appointments already past stay, still attached to the patient, so her
--     agenda and her history read the same tomorrow as they did yesterday,
--   * the patient becomes invisible to search and cannot be booked again,
--   * and if there is no history to keep, the row goes after all.
--
-- The cutoff comes from his machine rather than from now(). `starts_at` is a
-- naive timestamp holding clinic wall-clock time, and this database runs on
-- UTC — comparing the two directly would misjudge "future" by the timezone
-- offset and take an hour of just-finished appointments with it.

alter table public.patients
  add column if not exists archived_at timestamptz;

comment on column public.patients.archived_at is
  'Set when the doctor deleted this patient. Kept for the appointments already '
  'attached to it; never bookable or searchable again.';

-- Most queries want only the living ones, and every one of them is per doctor.
create index if not exists patients_active_idx
  on public.patients (doctor_id, archived_at);

-- Gains p_now, so the signature changes and the old one has to go.
drop function if exists public.desk_push_patients(text, jsonb);

create or replace function public.desk_push_patients(
  p_token    text,
  p_patients jsonb,
  -- His wall clock. Null falls back to this server's, which is only right when
  -- the two share a timezone.
  p_now      timestamp default null
)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_doctor uuid := public.desk_doctor(p_token);
  v_count  integer;
  v_now    timestamp := coalesce(p_now, now()::timestamp);
begin
  if v_doctor is null then raise exception 'UNKNOWN_KEY'; end if;

  -- Exempt this transaction from the "she edited it" trigger.
  perform set_config('doctory.syncing', 'on', true);

  create temp table _incoming on commit drop as
  select
    (r->>'local_id')::bigint as local_id,
    coalesce(r->>'numero_dossier', '') as numero_dossier,
    coalesce(r->>'last_name', '')      as last_name,
    coalesce(r->>'first_name', '')     as first_name,
    coalesce(r->>'father_name', '')    as father_name,
    coalesce(r->>'phone', '')          as phone,
    coalesce(r->>'gender', '')         as gender,
    nullif(r->>'age', '')::integer     as age,
    coalesce(r->>'address', '')        as address,
    coalesce(r->>'email', '')          as email,
    coalesce(r->>'job', '')            as job,
    coalesce(r->>'date_of_birth', '')  as date_of_birth,
    coalesce(r->>'insurance_type', '') as insurance_type
  from jsonb_array_elements(coalesce(p_patients, '[]'::jsonb)) as r
  where (r->>'local_id') is not null;

  insert into patients (
    doctor_id, local_id, numero_dossier, last_name, first_name, father_name,
    phone, gender, age, address, email, job, date_of_birth, insurance_type
  )
  select v_doctor, i.local_id, i.numero_dossier, i.last_name, i.first_name,
         i.father_name, i.phone, i.gender, i.age, i.address, i.email, i.job,
         i.date_of_birth, i.insurance_type
  from _incoming i
  on conflict (doctor_id, local_id) where local_id is not null
  do update set
    numero_dossier = excluded.numero_dossier,
    last_name      = excluded.last_name,
    first_name     = excluded.first_name,
    father_name    = excluded.father_name,
    phone          = excluded.phone,
    gender         = excluded.gender,
    age            = excluded.age,
    address        = excluded.address,
    email          = excluded.email,
    job            = excluded.job,
    date_of_birth  = excluded.date_of_birth,
    insurance_type = excluded.insurance_type,
    -- He sent it again, so it is a patient again. Covers an accidental delete
    -- put right by restoring a backup, and costs nothing otherwise.
    archived_at    = null
  where patients.pending_edit = false;

  get diagnostics v_count = row_count;

  -- ── patients he has deleted ────────────────────────────────────────────────
  -- Rows carrying a local_id he no longer has. Rows without one are hers, still
  -- waiting to be adopted, and are never touched by any of this.

  -- 1. Nobody is coming to these.
  delete from appointments a
  using patients p
  where a.patient_id = p.id
    and p.doctor_id = v_doctor
    and p.local_id is not null
    and a.starts_at >= v_now
    and not exists (select 1 from _incoming i where i.local_id = p.local_id);

  -- 2. Gone from her side of the practice, but still the name on old rows.
  update patients p
  set archived_at = coalesce(p.archived_at, now())
  where p.doctor_id = v_doctor
    and p.local_id is not null
    and p.archived_at is null
    and not exists (select 1 from _incoming i where i.local_id = p.local_id);

  -- 3. No history to hold the row up: let it go, as before.
  delete from patients p
  where p.doctor_id = v_doctor
    and p.local_id is not null
    and p.archived_at is not null
    and not exists (select 1 from _incoming i where i.local_id = p.local_id)
    and not exists (select 1 from appointments a where a.patient_id = p.id);

  return v_count;
end;
$$;

revoke all on function public.desk_push_patients(text, jsonb, timestamp) from public;
grant execute on function public.desk_push_patients(text, jsonb, timestamp)
  to anon, authenticated;

-- An archived patient must not come back through the public form either: their
-- dossier number would still verify and let them request an appointment.
-- Unchanged from 20260801000000 apart from the archived_at line: same 8-digit
-- phone match, same slash normalising, same guards.
create or replace function public.public_patient_by_dossier(
  p_doctor  uuid,
  p_dossier text,
  p_phone   text
)
returns table (last_name text, first_name text, gender text, age integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_phone text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 8);
begin
  if length(v_phone) < 8 or btrim(coalesce(p_dossier, '')) = '' then
    return;
  end if;
  if not exists (select 1 from doctors where id = p_doctor and is_published) then
    return;
  end if;

  return query
  select p.last_name, p.first_name, p.gender, p.age
  from patients p
  where p.doctor_id = p_doctor
    and p.archived_at is null
    and lower(regexp_replace(p.numero_dossier, '\s*/\s*', '/', 'g'))
        = lower(regexp_replace(btrim(p_dossier), '\s*/\s*', '/', 'g'))
    and right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 8) = v_phone
  limit 1;
end;
$$;

revoke all on function public.public_patient_by_dossier(uuid, text, text) from public;
grant execute on function public.public_patient_by_dossier(uuid, text, text)
  to anon, authenticated;
