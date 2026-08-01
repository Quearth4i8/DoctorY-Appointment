-- Public request intake, without a service-role key.
--
-- The app previously inserted requests with SUPABASE_SERVICE_ROLE_KEY, purely
-- because rate limiting has to COUNT existing rows and `anon` cannot read this
-- table. That put a key which bypasses every RLS policy inside an
-- internet-facing app.
--
-- Instead: one SECURITY DEFINER function that validates, rate-limits and
-- inserts atomically. `anon` may execute it and nothing else — it still cannot
-- read the table, and it cannot set status, reviewed_by, scheduled_at or any
-- sync column, because the function simply does not accept them.

-- Columns the function writes (idempotent — 20260731030000 may already have
-- added them).
alter table public.appointment_requests
  add column if not exists preferred_period text not null default ''
    check (preferred_period in ('', 'matin', 'apres_midi')),
  add column if not exists submitted_ip_hash text;

create index if not exists appointment_requests_ip_recent_idx
  on public.appointment_requests (submitted_ip_hash, created_at desc);
create index if not exists appointment_requests_phone_recent_idx
  on public.appointment_requests (phone, created_at desc);

create or replace function public.submit_appointment_request(
  p_last_name        text,
  p_first_name       text default '',
  p_phone            text default '',
  p_gender           text default '',
  p_age              integer default null,
  p_reason           text default '',
  p_preferred_at     timestamptz default null,
  p_preferred_period text default '',
  p_doctor_slug      text default '',
  p_ip_hash          text default null
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

  v_since  timestamptz := now() - interval '24 hours';
  v_phone  text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_doctor uuid;
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

  -- status and every review/sync column keep their defaults, so a submission
  -- can never arrive pre-approved.
  insert into appointment_requests (
    last_name, first_name, phone, gender, age, reason,
    preferred_at, preferred_period, doctor_id, submitted_ip_hash
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
    p_ip_hash
  );
end;
$$;

revoke all on function public.submit_appointment_request(
  text, text, text, text, integer, text, timestamptz, text, text, text
) from public;

grant execute on function public.submit_appointment_request(
  text, text, text, text, integer, text, timestamptz, text, text, text
) to anon, authenticated;
