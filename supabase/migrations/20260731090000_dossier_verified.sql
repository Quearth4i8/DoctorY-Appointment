-- Records that a returning patient's numéro de dossier was confirmed against
-- doctor.db (matched together with their phone number) before the request was
-- stored, so the secretary knows the identity was not merely self-declared.
--
-- The confirmation happens entirely server-side. The public form never receives
-- the patient's record: file numbers are sequential and guessable, so echoing a
-- name or phone back to the browser would let anyone enumerate the doctor's
-- whole patient list.

alter table public.appointment_requests
  add column if not exists dossier_verified boolean not null default false;

drop function if exists public.submit_appointment_request(
  text, text, text, text, integer, text, timestamptz, text, text, text, boolean, text
);

create or replace function public.submit_appointment_request(
  p_last_name           text,
  p_first_name          text default '',
  p_phone               text default '',
  p_gender              text default '',
  p_age                 integer default null,
  p_reason              text default '',
  p_preferred_at        timestamptz default null,
  p_preferred_period    text default '',
  p_doctor_slug         text default '',
  p_ip_hash             text default null,
  p_is_existing_patient boolean default false,
  p_numero_dossier      text default '',
  p_dossier_verified    boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Caps live here, not in the arguments: a caller must not be able to raise
  -- its own limit by passing a bigger number.
  c_max_per_ip    constant integer := 3;
  c_max_per_phone constant integer := 2;

  v_since   timestamptz := now() - interval '24 hours';
  v_phone   text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_dossier text := btrim(coalesce(p_numero_dossier, ''));
  v_doctor  uuid;
begin
  if length(btrim(coalesce(p_last_name, ''))) not between 1 and 80 then
    raise exception 'INVALID_NAME';
  end if;

  if length(v_phone) not between 6 and 20 then
    raise exception 'INVALID_PHONE';
  end if;

  if p_age is not null and p_age not between 0 and 130 then
    raise exception 'INVALID_AGE';
  end if;

  if p_is_existing_patient and length(v_dossier) not between 1 and 40 then
    raise exception 'INVALID_DOSSIER';
  end if;

  if p_ip_hash is not null and (
       select count(*) from appointment_requests
       where submitted_ip_hash = p_ip_hash and created_at >= v_since
     ) >= c_max_per_ip then
    raise exception 'RATE_LIMITED';
  end if;

  if (
       select count(*) from appointment_requests
       where phone = v_phone and created_at >= v_since
     ) >= c_max_per_phone then
    raise exception 'RATE_LIMITED';
  end if;

  if coalesce(p_doctor_slug, '') <> '' then
    select id into v_doctor
    from doctors
    where slug = p_doctor_slug and is_published = true;
  end if;

  insert into appointment_requests (
    last_name, first_name, phone, gender, age, reason,
    preferred_at, preferred_period, doctor_id, submitted_ip_hash,
    is_existing_patient, numero_dossier, dossier_verified
  ) values (
    btrim(p_last_name),
    left(btrim(coalesce(p_first_name, '')), 80),
    v_phone,
    case when p_gender in ('M', 'F') then p_gender else '' end,
    p_age,
    left(coalesce(p_reason, ''), 500),
    p_preferred_at,
    case when p_preferred_period in ('matin', 'apres_midi')
         then p_preferred_period else '' end,
    v_doctor,
    p_ip_hash,
    coalesce(p_is_existing_patient, false),
    case when coalesce(p_is_existing_patient, false) then left(v_dossier, 40) else '' end,
    coalesce(p_is_existing_patient, false) and coalesce(p_dossier_verified, false)
  );
end;
$$;

revoke all on function public.submit_appointment_request(
  text, text, text, text, integer, text, timestamptz, text, text, text, boolean, text, boolean
) from public;

grant execute on function public.submit_appointment_request(
  text, text, text, text, integer, text, timestamptz, text, text, text, boolean, text, boolean
) to anon, authenticated;
