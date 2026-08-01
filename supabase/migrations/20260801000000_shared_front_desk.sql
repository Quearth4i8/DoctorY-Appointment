-- The front desk moves to Supabase, so the secretary never waits for a PC.
--
-- The rule that makes this safe is that every row has exactly ONE writer:
--
--   appointments        the secretary, always. The doctor's app only reads them.
--                       If he wants one, he asks her — which is how the cabinet
--                       already works.
--   patients (clinical) the doctor, always. Never leaves doctor.db.
--   patients (admin)    either side, but never the same field at the same time:
--                       she edits through `pending_edit`, which his app applies
--                       and clears on its next sync.
--   numero_dossier      the doctor's app, always. She may suggest one; his app
--                       keeps it if it is free and reassigns it if it is not,
--                       because only doctor.db knows every number ever issued.
--
-- With one writer per row there is nothing to merge and no conflict to resolve,
-- which is why this works while either side is offline for a week.
--
-- Replaces the read-only mirror from 20260731150000: same idea, but she can
-- now write, so the copy had to become the real thing.

drop function if exists public.mirror_synced_at();
drop function if exists public.push_mirror(text, jsonb, jsonb);
drop table if exists public.mirror_appointments;
drop table if exists public.mirror_patients;
alter table public.doctors drop column if exists mirror_synced_at;

-- Needed for the appointment spacing constraint below: lets a gist index mix
-- plain equality (doctor_id) with a range overlap test.
create extension if not exists btree_gist;

-- ─── patients ────────────────────────────────────────────────────────────────
-- The front-desk copy: identity, contact, administrative. There is deliberately
-- no column for a consultation, a diagnosis, a treatment or a document — the
-- clinical record stays in doctor.db, so there is nothing here to leak.

create table if not exists public.patients (
  id             uuid primary key default gen_random_uuid(),
  doctor_id      uuid not null references public.doctors (id) on delete cascade,

  -- patients.id in doctor.db. Null means the doctor's app has not adopted this
  -- patient yet: she created them while he was offline.
  local_id       bigint,

  -- Empty until his app assigns one. The website must show "en attente"
  -- rather than inventing a number that would collide with a real dossier.
  numero_dossier text not null default '',

  last_name      text not null default '',
  first_name     text not null default '',
  father_name    text not null default '',
  phone          text not null default '',
  gender         text not null default '',
  age            integer,
  address        text not null default '',
  email          text not null default '',
  job            text not null default '',
  date_of_birth  text not null default '',
  insurance_type text not null default '',

  display_name   text generated always as (
                   btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
                 ) stored,

  -- She changed something; his app has not applied it to doctor.db yet.
  pending_edit   boolean not null default false,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Partial, so the many not-yet-adopted rows (local_id null) do not collide.
create unique index if not exists patients_local_id_key
  on public.patients (doctor_id, local_id) where local_id is not null;
create index if not exists patients_name_idx
  on public.patients (doctor_id, last_name, first_name);
create index if not exists patients_dossier_idx
  on public.patients (doctor_id, numero_dossier);

-- ─── appointments ────────────────────────────────────────────────────────────

create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  doctor_id        uuid not null references public.doctors (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,

  -- appointments.id in doctor.db, once his app has copied it down. Only used to
  -- carry his pre-existing appointments up on the first sync.
  local_id         bigint,

  -- Naive local time, exactly the format doctor.db uses ("YYYY-MM-DD HH:MM:SS").
  -- Not timestamptz: nobody here works across time zones, and a stored offset
  -- would be one more thing to get wrong on the way down.
  starts_at        timestamp not null,
  duration_minutes integer not null default 30,
  status           text not null default 'a_venir'
                     check (status in ('a_venir', 'approuve', 'passe', 'annule')),
  notes            text not null default '',

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

/*
 * The 30-minute spacing rule, enforced by the database.
 *
 * [s, s+30) and [t, t+30) overlap exactly when |s - t| < 30 minutes, which is
 * the same test `AppointmentModel._ensure_constraints` does in SQLite — so the
 * two agree, and a booking accepted here can never be rejected there.
 *
 * Putting it in the schema rather than in the app is the point: it holds even
 * if the secretary has two tabs open, or two people book at once. That is what
 * makes it safe for her to work without the doctor's PC arbitrating.
 */
alter table public.appointments
  drop constraint if exists appointments_min_gap;
alter table public.appointments
  add constraint appointments_min_gap
  exclude using gist (
    doctor_id with =,
    tsrange(starts_at, starts_at + interval '30 minutes') with &&
  ) where (status <> 'annule');

create index if not exists appointments_when_idx
  on public.appointments (doctor_id, starts_at);

-- Makes the one-time lift idempotent. Without it, an appointment outside the
-- window the doctor's app pulls back would never receive a remote id, so it
-- would be uploaded again on every single cycle.
create unique index if not exists appointments_local_id_key
  on public.appointments (doctor_id, local_id) where local_id is not null;

-- ─── keeping updated_at honest ───────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists patients_touch on public.patients;
create trigger patients_touch before update on public.patients
  for each row execute function public.touch_updated_at();

drop trigger if exists appointments_touch on public.appointments;
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();

/*
 * Any edit by the secretary marks the row for the doctor's app to apply.
 *
 * A trigger rather than the website remembering to set the flag: forgetting it
 * would mean her correction silently never reaching doctor.db. His app clears
 * the flag through desk_ack(), which runs as the definer and is exempt.
 */
create or replace function public.flag_patient_edit()
returns trigger language plpgsql as $$
begin
  if current_setting('doctory.syncing', true) = 'on' then
    return new;
  end if;
  if (new.last_name, new.first_name, new.father_name, new.phone, new.gender,
      new.age, new.address, new.email, new.job, new.date_of_birth,
      new.insurance_type)
     is distinct from
     (old.last_name, old.first_name, old.father_name, old.phone, old.gender,
      old.age, old.address, old.email, old.job, old.date_of_birth,
      old.insurance_type)
  then
    new.pending_edit := true;
  end if;
  return new;
end;
$$;

drop trigger if exists patients_flag_edit on public.patients;
create trigger patients_flag_edit before update on public.patients
  for each row execute function public.flag_patient_edit();

-- ─── who may read and write ──────────────────────────────────────────────────

alter table public.patients enable row level security;
alter table public.appointments enable row level security;

drop policy if exists "staff read patients" on public.patients;
create policy "staff read patients" on public.patients
  for select to authenticated using (public.can_access_request(doctor_id));

drop policy if exists "staff add patients" on public.patients;
create policy "staff add patients" on public.patients
  for insert to authenticated with check (public.can_access_request(doctor_id));

drop policy if exists "staff edit patients" on public.patients;
create policy "staff edit patients" on public.patients
  for update to authenticated using (public.can_access_request(doctor_id));

-- Deliberately no delete policy: deleting a patient cascades through the whole
-- clinical record in doctor.db, so it stays the doctor's decision alone.

drop policy if exists "staff read appointments" on public.appointments;
create policy "staff read appointments" on public.appointments
  for select to authenticated using (public.can_access_request(doctor_id));

drop policy if exists "staff write appointments" on public.appointments;
create policy "staff write appointments" on public.appointments
  for insert to authenticated with check (public.can_access_request(doctor_id));

drop policy if exists "staff edit appointments" on public.appointments;
create policy "staff edit appointments" on public.appointments
  for update to authenticated using (public.can_access_request(doctor_id));

drop policy if exists "staff cancel appointments" on public.appointments;
create policy "staff cancel appointments" on public.appointments
  for delete to authenticated using (public.can_access_request(doctor_id));

revoke all on public.patients from anon, authenticated;
revoke all on public.appointments from anon, authenticated;

-- Column-level, so she cannot hand herself a file number or clear the flag that
-- makes her edit reach the doctor. Both belong to his app.
grant select on public.patients to authenticated;
grant insert (doctor_id, last_name, first_name, father_name, phone, gender, age,
              address, email, job, date_of_birth, insurance_type, numero_dossier)
  on public.patients to authenticated;
grant update (last_name, first_name, father_name, phone, gender, age,
              address, email, job, date_of_birth, insurance_type)
  on public.patients to authenticated;

grant select, insert, update, delete on public.appointments to authenticated;

-- ─── the doctor's app ────────────────────────────────────────────────────────
-- It has no Supabase account: it authenticates with the pairing key, so every
-- operation goes through a SECURITY DEFINER function that resolves the key to a
-- practice first. Same key the secretary pasted in to link the two.

create or replace function public.desk_doctor(p_token text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from doctors
  where remote_token <> '' and remote_token = btrim(coalesce(p_token, ''));
$$;
revoke all on function public.desk_doctor(text) from public, anon, authenticated;

/**
 * Publishes the doctor's patients so she can search them.
 *
 * Rows she has edited but he has not applied yet are skipped, or his push would
 * overwrite her correction with the value she was correcting.
 *
 * Patients he has deleted disappear here too: anything carrying a local_id that
 * is no longer in his database is removed. Rows without one are hers, still
 * waiting to be adopted, and are never touched.
 */
create or replace function public.desk_push_patients(p_token text, p_patients jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_doctor uuid := public.desk_doctor(p_token);
  v_count  integer;
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
    insurance_type = excluded.insurance_type
  where patients.pending_edit = false;

  get diagnostics v_count = row_count;

  delete from patients p
  where p.doctor_id = v_doctor
    and p.local_id is not null
    and not exists (select 1 from _incoming i where i.local_id = p.local_id);

  return v_count;
end;
$$;

/**
 * Everything the doctor's app has to bring down.
 *
 * `new_patients` are the ones she created while he was offline — they have no
 * file number yet, because only his database knows which are free.
 * `edited_patients` are corrections of his own records.
 * `appointments` are the whole window: she owns them, so his copy is replaced
 * rather than merged.
 */
create or replace function public.desk_pull(
  p_token text,
  p_from  timestamp,
  p_to    timestamp
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_doctor uuid := public.desk_doctor(p_token);
begin
  if v_doctor is null then raise exception 'UNKNOWN_KEY'; end if;

  return jsonb_build_object(
    'new_patients', coalesce((
      select jsonb_agg(to_jsonb(p) - 'doctor_id' - 'display_name')
      from patients p
      where p.doctor_id = v_doctor and p.local_id is null
    ), '[]'::jsonb),

    'edited_patients', coalesce((
      select jsonb_agg(to_jsonb(p) - 'doctor_id' - 'display_name')
      from patients p
      where p.doctor_id = v_doctor and p.local_id is not null and p.pending_edit
    ), '[]'::jsonb),

    'appointments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'patient_local_id', pt.local_id,
        'starts_at', to_char(a.starts_at, 'YYYY-MM-DD HH24:MI:SS'),
        'duration_minutes', a.duration_minutes,
        'status', a.status,
        'notes', a.notes
      ) order by a.starts_at)
      from appointments a
      join patients pt on pt.id = a.patient_id
      where a.doctor_id = v_doctor and a.starts_at >= p_from and a.starts_at < p_to
    ), '[]'::jsonb)
  );
end;
$$;

/**
 * The doctor's app reporting what it did.
 *
 * `p_adopted` carries the file number it assigned to each patient she created —
 * hers if it was free, a fresh one if it was already taken. `p_applied` are the
 * corrections it has now written to doctor.db, so the flag can be cleared.
 */
create or replace function public.desk_ack(
  p_token   text,
  p_adopted jsonb,
  p_applied jsonb
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_doctor uuid := public.desk_doctor(p_token);
begin
  if v_doctor is null then raise exception 'UNKNOWN_KEY'; end if;
  perform set_config('doctory.syncing', 'on', true);

  update patients p set
    local_id       = (r->>'local_id')::bigint,
    numero_dossier = coalesce(r->>'numero_dossier', p.numero_dossier),
    pending_edit   = false
  from jsonb_array_elements(coalesce(p_adopted, '[]'::jsonb)) as r
  where p.doctor_id = v_doctor and p.id = (r->>'id')::uuid;

  update patients p set pending_edit = false
  where p.doctor_id = v_doctor
    and p.id in (
      select (value #>> '{}')::uuid
      from jsonb_array_elements(coalesce(p_applied, '[]'::jsonb))
    );
end;
$$;

/**
 * One-time lift of the appointments the doctor already had before this changed.
 *
 * After this his app only reads; but the agenda he built up until now has to
 * arrive here first, or it would vanish from both sides. Rows that clash with
 * the 30-minute rule are skipped and reported rather than aborting the batch —
 * an old database can already contain bookings closer than that.
 */
create or replace function public.desk_seed_appointments(p_token text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_doctor  uuid := public.desk_doctor(p_token);
  r         jsonb;
  v_patient uuid;
  v_ok      integer := 0;
  v_skipped integer := 0;
begin
  if v_doctor is null then raise exception 'UNKNOWN_KEY'; end if;

  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    select id into v_patient from patients
    where doctor_id = v_doctor and local_id = (r->>'patient_local_id')::bigint;

    if v_patient is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    begin
      insert into appointments (
        doctor_id, patient_id, local_id, starts_at, duration_minutes, status, notes
      ) values (
        v_doctor, v_patient, (r->>'local_id')::bigint,
        (r->>'starts_at')::timestamp,
        coalesce(nullif(r->>'duration_minutes', '')::integer, 30),
        coalesce(nullif(r->>'status', ''), 'a_venir'),
        coalesce(r->>'notes', '')
      );
      v_ok := v_ok + 1;
    exception when others then
      -- Already there from a previous run, or too close to another booking.
      v_skipped := v_skipped + 1;
    end;
  end loop;

  return jsonb_build_object('inserted', v_ok, 'skipped', v_skipped);
end;
$$;

/** True once this practice has uploaded its existing agenda. */
create or replace function public.desk_has_appointments(p_token text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_doctor uuid := public.desk_doctor(p_token);
begin
  if v_doctor is null then raise exception 'UNKNOWN_KEY'; end if;
  return exists (select 1 from appointments where doctor_id = v_doctor);
end;
$$;

-- The desktop app presents the anon key plus the pairing key; the key is what
-- actually authorises it, and every function above checks it first.
revoke all on function public.desk_push_patients(text, jsonb) from public;
revoke all on function public.desk_pull(text, timestamp, timestamp) from public;
revoke all on function public.desk_ack(text, jsonb, jsonb) from public;
revoke all on function public.desk_seed_appointments(text, jsonb) from public;
revoke all on function public.desk_has_appointments(text) from public;

grant execute on function public.desk_push_patients(text, jsonb) to anon, authenticated;
grant execute on function public.desk_pull(text, timestamp, timestamp) to anon, authenticated;
grant execute on function public.desk_ack(text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.desk_seed_appointments(text, jsonb) to anon, authenticated;
grant execute on function public.desk_has_appointments(text) to anon, authenticated;

-- ─── what a visitor may see ──────────────────────────────────────────────────
-- Visitors have no account, so these run as the definer. Each one returns the
-- narrowest possible answer: the agenda is never exposed, only the shape of it.

/**
 * When the doctor is not free, as bare times.
 *
 * Two timestamps per appointment and nothing else — no id, no patient, no
 * status, no notes. Publishing the agenda itself would tell anyone who visits
 * the site who is seeing the doctor and when.
 */
create or replace function public.public_busy_ranges(
  p_doctor uuid,
  p_from   timestamp,
  p_to     timestamp
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (
    select 1 from doctors where id = p_doctor and is_published
  ) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'start', to_char(a.starts_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
      'end',   to_char(a.starts_at + make_interval(mins => a.duration_minutes),
                       'YYYY-MM-DD"T"HH24:MI:SS')
    ) order by a.starts_at)
    from appointments a
    where a.doctor_id = p_doctor
      and a.status <> 'annule'          -- a cancelled slot is free again
      and a.starts_at >= p_from
      and a.starts_at < p_to
  ), '[]'::jsonb);
end;
$$;

/**
 * Identifies a returning patient from a file number AND a phone number.
 *
 * Both must match the same record, and the answer is four fields — enough to
 * fill the form in for someone the doctor already knows, and nothing more. File
 * numbers run "83/2026", so they are guessable; requiring the phone means an
 * attacker has to already know the thing they would be trying to learn.
 *
 * Never widen the returned columns. The website exposes only a yes/no to the
 * browser and keeps these fields server-side, where they prefill a request the
 * secretary will review anyway.
 *
 * Phones are compared on their last 8 digits, because the same person is
 * written down as "22 764 488", "+21622764488" and "022764488" on different
 * days.
 */
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
    and lower(regexp_replace(p.numero_dossier, '\s*/\s*', '/', 'g'))
        = lower(regexp_replace(btrim(p_dossier), '\s*/\s*', '/', 'g'))
    and right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 8) = v_phone
  limit 1;
end;
$$;

revoke all on function public.public_busy_ranges(uuid, timestamp, timestamp) from public;
revoke all on function public.public_patient_by_dossier(uuid, text, text) from public;
grant execute on function public.public_busy_ranges(uuid, timestamp, timestamp) to anon, authenticated;
grant execute on function public.public_patient_by_dossier(uuid, text, text) to anon, authenticated;
