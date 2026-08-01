-- Lets the secretary see THAT a key is set, without handing her the key.
--
-- remote_token is granted to no browser role on purpose. It opens the doctor's
-- API directly, and that API has no allowlist of its own — the restriction to
-- patients and appointments lives in the website's proxy. A secretary holding
-- the raw key could call /api/patients/1/consultations herself and read the
-- clinical record the proxy exists to keep from her.
--
-- So this returns a fingerprint: whether a key exists, its last four
-- characters, and when the practice was last seen. Enough to confirm the key
-- matches what her doctor read out; useless as a credential.

create or replace function public.doctor_key_hint()
returns table (has_key boolean, last4 text, seen_at timestamptz, api_linked boolean)
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

  return query
  select
    d.remote_token <> '',
    case when d.remote_token <> '' then right(d.remote_token, 4) else '' end,
    d.remote_seen_at,
    d.remote_api_url <> ''
  from doctors d
  where d.id = v_doctor;
end;
$$;

revoke all on function public.doctor_key_hint() from public;
grant execute on function public.doctor_key_hint() to authenticated;
